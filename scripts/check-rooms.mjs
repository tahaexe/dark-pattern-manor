// Room-data validation gate for Dark Pattern Manor.
//
// Loads every registered room through Vite's SSR module loader (so TSX, CSS
// and JSX resolve), then validates each room against the structural, card,
// relatives, hint, guide and fiction rules. The possessed element is resolved
// by rendering the room's Haunted component into a jsdom document and looking
// it up by id. It prints one short line per room ("room N ok" or the rules
// that failed) and exits non-zero on any failure.
//
// Usage: node scripts/check-rooms.mjs
//        node scripts/check-rooms.mjs --self-test   (runs broken-fixture checks)

import { createServer } from 'vite';
import { JSDOM } from 'jsdom';

const ROOM_PATTERNS = [
  'Visual interference',
  'Trick wording',
  'Confirmshaming',
  'Hidden subscription',
  'Fake urgency',
  'Fake scarcity',
  'Fake social proof',
  'Sneaking',
  'Hidden costs',
  'Nagging',
  'Preselection',
  'Hard to cancel',
];

/** Set up a jsdom global environment so Preact can render. */
function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const define = (name, value) => {
    try {
      Object.defineProperty(globalThis, name, {
        value,
        configurable: true,
        writable: true,
      });
    } catch {
      /* some globals (navigator) may be non-configurable; ignore */
    }
  };
  define('window', dom.window);
  define('document', dom.window.document);
  if (!globalThis.navigator) define('navigator', dom.window.navigator);
  if (!globalThis.CSS) define('CSS', dom.window.CSS ?? { escape: (s) => s });
  return dom;
}

async function main() {
  const selfTest = process.argv.includes('--self-test');
  installDom();

  const server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  });

  let failed = false;
  // Collect failures keyed by room id; room-set checks use the key 'set'.
  const roomFailures = new Map();
  const fail = (roomName, rule, roomId = 'set') => {
    failed = true;
    if (!roomFailures.has(roomId)) roomFailures.set(roomId, []);
    roomFailures.get(roomId).push(rule);
  };

  const cssEscape = (s) =>
    globalThis.CSS && typeof globalThis.CSS.escape === 'function'
      ? globalThis.CSS.escape(s)
      : s.replace(/[^a-zA-Z0-9_-]/g, '\\$&');

  try {
    const { loadAllRooms } = await server.ssrLoadModule('/src/engine/registry.ts');
    const { validateRoom, isAllowlistedUrl, wordCount, APPROVED_BRANDS } =
      await server.ssrLoadModule('/src/engine/validate.ts');
    const preact = await server.ssrLoadModule('/node_modules/preact/dist/preact.module.js');
    const { render, h } = preact;

    const rooms = await loadAllRooms();

    // Room-set checks across all rooms.
    const ids = rooms.map((r) => r.id);
    if (new Set(ids).size !== ids.length) {
      fail('room set', 'room ids must be unique');
    }
    const patternsUsed = rooms.map((r) => r.pattern);
    if (new Set(patternsUsed).size !== patternsUsed.length) {
      fail('room set', 'each room pattern must be used by exactly one room');
    }
    for (const r of rooms) {
      if (!ROOM_PATTERNS.includes(r.pattern)) {
        fail(r.name, `pattern "${r.pattern}" is not one of the 12 room patterns`, r.id);
      }
    }

    // Correct-card position not constant across rooms: with one room this is
    // vacuously true; with more than one, assert not all identical.
    if (rooms.length > 1) {
      const positions = rooms.map((r) => r.cards.findIndex((c) => c.role === 'correct'));
      if (new Set(positions).size === 1) {
        fail('room set', 'the correct card must not be in the same position in every room');
      }
    }

    // Per-room validation.
    for (const r of rooms) {
      const errors = validateRoom(r);
      for (const e of errors) fail(r.name, e, r.id);

      // No quoted text over 25 words in the guide.
      const quoteSources = [r.guide.definition, r.guide.whereYouMeetIt, r.guide.tip];
      for (const text of quoteSources) {
        const quotes = text.match(/"([^"]+)"/g) || [];
        for (const q of quotes) {
          if (wordCount(q.replace(/"/g, '')) > 25) {
            fail(r.name, 'a quoted passage in the guide exceeds 25 words', r.id);
          }
        }
      }

      // Exactly one protection tip.
      if (!r.guide.tip || typeof r.guide.tip !== 'string' || r.guide.tip.trim() === '') {
        fail(r.name, 'there must be exactly one protection tip', r.id);
      }

      // Guide URLs https + on the allowlist.
      if (!isAllowlistedUrl(r.guide.us.url)) fail(r.name, 'US guide URL not https/allowlisted', r.id);
      if (!isAllowlistedUrl(r.guide.eu.url)) fail(r.name, 'EU guide URL not https/allowlisted', r.id);

      // Brand approved.
      if (!APPROVED_BRANDS.includes(r.brand)) {
        fail(r.name, `brand "${r.brand}" is not an approved fictional brand`, r.id);
      }

      // Possessed element found by id in the rendered Haunted DOM.
      const mount = document.createElement('div');
      document.body.appendChild(mount);
      try {
        render(
          h(r.Haunted, {
            onSelectPossessed: () => {},
            onSelectOther: () => {},
            signsActive: true,
            reducedMotion: false,
          }),
          mount,
        );
        const el = mount.querySelector(`#${cssEscape(r.possessedId)}`);
        if (!el) fail(r.name, `possessed element #${r.possessedId} not found in the haunted DOM`, r.id);
      } finally {
        render(null, mount);
        mount.remove();
      }
    }

    // One short line per room, ordered by id.
    const sorted = [...rooms].sort((a, b) => a.id - b.id);
    for (const r of sorted) {
      const errs = roomFailures.get(r.id);
      if (errs && errs.length > 0) {
        console.error(`room ${r.id} FAILED: ${errs.join('; ')}`);
      } else {
        console.log(`room ${r.id} ok`);
      }
    }
    // Report any room-set failures that are not tied to a single room.
    const setErrs = roomFailures.get('set');
    if (setErrs && setErrs.length > 0) {
      console.error(`room set FAILED: ${setErrs.join('; ')}`);
    }

    if (selfTest) {
      runSelfTest(validateRoom, rooms[0]);
    }
  } finally {
    await server.close();
  }

  if (failed) {
    process.exit(1);
  }
  console.log('check:rooms OK — validated room data.');
}

/**
 * Deliberately-broken fixtures: each mutation of a valid room must be rejected
 * by validateRoom. Prints which fixture passed when it should have failed.
 */
function runSelfTest(validateRoom, base) {
  if (!base) {
    console.error('self-test: no base room to mutate');
    process.exit(1);
  }
  const clone = () => JSON.parse(JSON.stringify({ ...base, Haunted: undefined, Honest: undefined }));

  const cases = [
    ['wrong relative card', (r) => (r.cards.find((c) => c.role === 'relative').pattern = 'Hard to cancel')],
    [
      'over-long hint',
      (r) =>
        (r.cards.find((c) => c.role === 'relative').hint =
          'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone'),
    ],
    ['card pattern outside the 18', (r) => (r.cards.find((c) => c.role === 'different').pattern = 'Not a pattern')],
    ['non-.manor domain', (r) => (r.domain = 'gravemoor-gazette.com')],
    ['non-allowlisted guide URL', (r) => (r.guide.us.url = 'https://example.com/report')],
    ['non-https guide URL', (r) => (r.guide.eu.url = 'http://www.edpb.europa.eu/report')],
    [
      'hint names the correct pattern',
      (r) => (r.cards.find((c) => c.role === 'relative').hint = 'This is Visual interference, plainly.'),
    ],
    ['unapproved brand', (r) => (r.brand = 'Totally Real Brand')],
    ['duplicate-looking non-correct card pattern', (r) => (r.cards.find((c) => c.role === 'relative').pattern = r.pattern)],
  ];

  let ok = true;
  for (const [name, mutate] of cases) {
    const r = clone();
    mutate(r);
    const errors = validateRoom(r);
    if (errors.length === 0) {
      console.error(`self-test FAILED — broken fixture "${name}" was accepted`);
      ok = false;
    }
  }
  if (!ok) process.exit(1);
  console.log('check:rooms self-test OK — every broken fixture was rejected.');
}

main().catch((err) => {
  console.error('check:rooms crashed:', err);
  process.exit(1);
});
