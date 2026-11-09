// Protocol tests for the manor-qa MCP server. The child-process tests spawn
// the real server and talk to it over stdio; the unit tests exercise the pure
// router directly (e.g. the notification "no reply" case).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRouter, parseMessage, makeResult, makeError, METHOD_NOT_FOUND } from './protocol.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = resolve(HERE, 'manor-qa.mjs');

/** A thin stdio client over the spawned server: send a request, await its reply by id. */
class Client {
  constructor() {
    this.child = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'pipe'] });
    this.pending = new Map();
    this.lines = [];
    this.rl = createInterface({ input: this.child.stdout, crlfDelay: Infinity });
    this.rl.on('line', (line) => {
      this.lines.push(line);
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        return; // the server must never emit a non-JSON line, but be safe
      }
      if (msg && msg.id !== undefined && this.pending.has(msg.id)) {
        this.pending.get(msg.id)(msg);
        this.pending.delete(msg.id);
      }
    });
  }

  writeRaw(text) {
    this.child.stdin.write(text);
  }

  request(id, method, params) {
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for id ${id}`)), 8000);
      this.pending.set(id, (msg) => {
        clearTimeout(timer);
        resolvePromise(msg);
      });
      this.writeRaw(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  notify(method, params) {
    this.writeRaw(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  }

  close() {
    try {
      this.child.stdin.end();
    } catch {
      /* ignore */
    }
    try {
      this.child.kill();
    } catch {
      /* ignore */
    }
  }
}

let client;
before(() => {
  client = new Client();
});
after(() => {
  client.close();
});

test('initialize returns server info and the tools capability', async () => {
  const reply = await client.request(1, 'initialize', { protocolVersion: '2024-11-05' });
  assert.equal(reply.jsonrpc, '2.0');
  assert.equal(reply.id, 1);
  assert.equal(reply.result.serverInfo.name, 'manor-qa');
  assert.ok(typeof reply.result.serverInfo.version === 'string');
  assert.ok(reply.result.capabilities && reply.result.capabilities.tools);
  assert.equal(reply.result.protocolVersion, '2024-11-05');
});

test('initialize without a protocolVersion answers with the default', async () => {
  const reply = await client.request(2, 'initialize', {});
  assert.ok(typeof reply.result.protocolVersion === 'string');
  assert.ok(reply.result.protocolVersion.length > 0);
});

test('tools/list lists exactly the four tools, each with an object JSON Schema', async () => {
  const reply = await client.request(3, 'tools/list', {});
  const names = reply.result.tools.map((t) => t.name).sort();
  assert.deepEqual(names, ['check_rooms', 'contrast_scan', 'walk_lantern', 'walk_rooms']);
  for (const tool of reply.result.tools) {
    assert.ok(typeof tool.description === 'string' && tool.description.length > 0);
    assert.equal(tool.inputSchema.type, 'object');
    assert.ok(tool.inputSchema.properties && typeof tool.inputSchema.properties === 'object');
  }
});

test('an unknown method returns a -32601 error carrying the id', async () => {
  const reply = await client.request(4, 'does/not/exist', {});
  assert.equal(reply.id, 4);
  assert.ok(reply.error);
  assert.equal(reply.error.code, METHOD_NOT_FOUND);
});

test('an unknown tool returns an error carrying the id', async () => {
  const reply = await client.request(5, 'tools/call', { name: 'no_such_tool', arguments: {} });
  assert.equal(reply.id, 5);
  assert.ok(reply.error);
  assert.equal(reply.error.code, METHOD_NOT_FOUND);
});

test('a malformed line does not crash the server', async () => {
  // Send garbage, then a notification (no reply), then a valid request.
  client.writeRaw('this is not json\n');
  client.notify('notifications/initialized', {});
  const reply = await client.request(6, 'initialize', { protocolVersion: 'x' });
  assert.equal(reply.id, 6);
  assert.equal(reply.result.serverInfo.name, 'manor-qa');
});

// --- pure router unit tests (no child process) ---

test('parseMessage returns null for bad JSON and arrays', () => {
  assert.equal(parseMessage('nope'), null);
  assert.equal(parseMessage(''), null);
  assert.equal(parseMessage('[1,2,3]'), null);
  assert.deepEqual(parseMessage('{"a":1}'), { a: 1 });
});

test('the router returns null for a notification (no reply)', async () => {
  const { handle } = createRouter({
    serverInfo: { name: 'manor-qa', version: '1.0.0' },
    tools: [],
  });
  const reply = await handle({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(reply, null);
});

test('the router runs a known tool and wraps its text', async () => {
  const { handle } = createRouter({
    serverInfo: { name: 'manor-qa', version: '1.0.0' },
    tools: [{ name: 'echo', description: 'd', inputSchema: { type: 'object', properties: {} }, run: () => 'hi' }],
  });
  const reply = await handle({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'echo' } });
  assert.deepEqual(reply.result.content, [{ type: 'text', text: 'hi' }]);
});

test('makeResult and makeError echo the id and use jsonrpc 2.0', () => {
  assert.deepEqual(makeResult(7, { ok: true }), { jsonrpc: '2.0', id: 7, result: { ok: true } });
  assert.deepEqual(makeError(8, METHOD_NOT_FOUND, 'nope'), {
    jsonrpc: '2.0',
    id: 8,
    error: { code: METHOD_NOT_FOUND, message: 'nope' },
  });
});
