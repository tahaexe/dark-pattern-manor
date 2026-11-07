// Pure JSON-RPC 2.0 framing and a request router for the manor-qa MCP server.
//
// No I/O lives here: parseMessage turns a line into an object (or null on bad
// JSON), makeResult/makeError build replies, and createRouter returns an async
// handle(message) that answers initialize, notifications, tools/list and
// tools/call. The server module (manor-qa.mjs) owns stdin/stdout; this module
// is imported directly by the protocol tests.

export const JSONRPC = '2.0';

// The MCP protocol version this server defaults to when a client sends none.
export const DEFAULT_PROTOCOL = '2024-11-05';

// JSON-RPC error codes we use.
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INTERNAL_ERROR = -32603;

/**
 * Parse one line into a JSON-RPC message object. Returns null when the line is
 * not valid JSON (the malformed-line case the server must survive).
 * @param {string} line
 * @returns {object | null}
 */
export function parseMessage(line) {
  if (typeof line !== 'string') return null;
  const trimmed = line.trim();
  if (trimmed === '') return null;
  try {
    const value = JSON.parse(trimmed);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/**
 * Build a JSON-RPC result reply.
 * @param {string|number|null} id
 * @param {*} result
 */
export function makeResult(id, result) {
  return { jsonrpc: JSONRPC, id: id ?? null, result };
}

/**
 * Build a JSON-RPC error reply.
 * @param {string|number|null} id
 * @param {number} code
 * @param {string} message
 */
export function makeError(id, code, message) {
  return { jsonrpc: JSONRPC, id: id ?? null, error: { code, message } };
}

/** True when a message is a notification (no id field at all). */
export function isNotification(message) {
  return !Object.prototype.hasOwnProperty.call(message, 'id');
}

/**
 * Create the request router.
 *
 * @param {object} opts
 * @param {{ name: string, version: string }} opts.serverInfo
 * @param {Array<{ name: string, description: string, inputSchema: object,
 *   run: (args: object) => Promise<string> | string }>} opts.tools
 * @returns {{ handle: (message: object) => Promise<object | null>,
 *   descriptors: () => Array<{ name, description, inputSchema }> }}
 */
export function createRouter({ serverInfo, tools }) {
  const byName = new Map(tools.map((t) => [t.name, t]));

  const descriptors = () =>
    tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));

  /**
   * Handle one parsed message. Returns the reply object, or null when nothing
   * should be written (a notification).
   * @param {object} message
   * @returns {Promise<object | null>}
   */
  async function handle(message) {
    // Notifications carry no id and get no reply.
    if (isNotification(message)) {
      return null;
    }

    const { id, method, params } = message;

    switch (method) {
      case 'initialize': {
        const protocolVersion =
          (params && typeof params.protocolVersion === 'string'
            ? params.protocolVersion
            : null) ?? DEFAULT_PROTOCOL;
        return makeResult(id, {
          protocolVersion,
          serverInfo,
          capabilities: { tools: {} },
        });
      }

      case 'tools/list':
        return makeResult(id, { tools: descriptors() });

      case 'tools/call': {
        const name = params && params.name;
        const tool = typeof name === 'string' ? byName.get(name) : undefined;
        if (!tool) {
          return makeError(id, METHOD_NOT_FOUND, `unknown tool: ${name}`);
        }
        try {
          const text = await tool.run((params && params.arguments) || {});
          return makeResult(id, {
            content: [{ type: 'text', text: String(text) }],
          });
        } catch (err) {
          return makeError(
            id,
            INTERNAL_ERROR,
            `tool ${name} failed: ${err && err.message ? err.message : err}`,
          );
        }
      }

      default:
        return makeError(id, METHOD_NOT_FOUND, `unknown method: ${method}`);
    }
  }

  return { handle, descriptors };
}
