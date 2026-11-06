import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isRoomFile, findWrittenPath, formatSkip } from './room-checks.mjs';

describe('isRoomFile — room paths', () => {
  it('relative room file', () => {
    assert.equal(isRoomFile('src/rooms/gloamline/room.ts'), true);
  });
  it('relative room component', () => {
    assert.equal(isRoomFile('src/rooms/shroudery/Haunted.tsx'), true);
  });
  it('room css', () => {
    assert.equal(isRoomFile('src/rooms/hollowpost/room.css'), true);
  });
  it('absolute POSIX path', () => {
    assert.equal(isRoomFile('/home/me/dark-pattern-manor/src/rooms/grimsupper/Honest.tsx'), true);
  });
  it('absolute Windows path with backslashes', () => {
    assert.equal(isRoomFile('C:\\Users\\dev\\dark-pattern-manor\\src\\rooms\\inkbone-books\\room.ts'), true);
  });
  it('mixed slashes', () => {
    assert.equal(isRoomFile('repo\\src/rooms\\gloamline/room.ts'), true);
  });
});

describe('isRoomFile — non-room paths', () => {
  it('engine file', () => {
    assert.equal(isRoomFile('src/engine/validate.ts'), false);
  });
  it('ui file', () => {
    assert.equal(isRoomFile('src/ui/SpellCards.tsx'), false);
  });
  it('the rooms directory itself with no file after it', () => {
    assert.equal(isRoomFile('src/rooms/'), false);
  });
  it('a path that merely mentions rooms elsewhere', () => {
    assert.equal(isRoomFile('src/engine/rooms-registry.ts'), false);
  });
  it('empty string', () => {
    assert.equal(isRoomFile(''), false);
  });
  it('whitespace only', () => {
    assert.equal(isRoomFile('   '), false);
  });
  it('null', () => {
    assert.equal(isRoomFile(null), false);
  });
  it('non-string', () => {
    assert.equal(isRoomFile(42), false);
  });
});

describe('findWrittenPath', () => {
  it('finds a top-level path field', () => {
    assert.equal(findWrittenPath({ path: 'src/rooms/x/room.ts' }), 'src/rooms/x/room.ts');
  });
  it('finds file_path', () => {
    assert.equal(findWrittenPath({ file_path: 'src/a.ts' }), 'src/a.ts');
  });
  it('finds filePath', () => {
    assert.equal(findWrittenPath({ filePath: 'src/a.ts' }), 'src/a.ts');
  });
  it('finds targetFile', () => {
    assert.equal(findWrittenPath({ targetFile: 'src/a.ts' }), 'src/a.ts');
  });
  it('finds a nested tool_input path', () => {
    const input = { tool_name: 'fs_write', tool_input: { path: 'src/rooms/x/room.ts', text: '...' } };
    assert.equal(findWrittenPath(input), 'src/rooms/x/room.ts');
  });
  it('finds a path inside an array', () => {
    assert.equal(findWrittenPath([{ other: 1 }, { path: 'src/a.ts' }]), 'src/a.ts');
  });
  it('returns null when no path field is present', () => {
    assert.equal(findWrittenPath({ tool_name: 'fs_write', tool_input: { text: 'hi' } }), null);
  });
  it('ignores empty path strings', () => {
    assert.equal(findWrittenPath({ path: '   ', file_path: 'src/a.ts' }), 'src/a.ts');
  });
  it('returns null for non-objects', () => {
    assert.equal(findWrittenPath(null), null);
    assert.equal(findWrittenPath('src/a.ts'), null);
  });
});

describe('formatSkip', () => {
  it('names the skipped path', () => {
    assert.equal(
      formatSkip('src/engine/validate.ts'),
      'room-checks: src/engine/validate.ts is not under src/rooms/ — skipped',
    );
  });
  it('handles a missing path', () => {
    assert.equal(formatSkip(null), 'room-checks: no written path found — skipped');
  });
});
