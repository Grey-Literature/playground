// Spirit Board storage (src/engine/scores.ts), headless with an in-memory
// localStorage: ordering, truncation, qualification, isolation, sanitizing,
// legacy migration, and surviving storage that throws.

const mem = new Map<string, string>();
let storageThrows = false;
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => { if (storageThrows) throw new Error('blocked'); return mem.get(k) ?? null; },
  setItem: (k: string, v: string) => { if (storageThrows) throw new Error('blocked'); mem.set(k, v); },
};

const { LocalScoreStore, cleanInitials, padInitials, sanitizeBoard, BOARD_SIZE } = await import('../src/engine/scores');

let bad = 0;
const expect = (label: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) bad++;
};
const E = (initials: string, score: number) => ({ initials: padInitials(initials), score, day: '2026-09-27' });

console.log('Spirit Board storage:');
const s = new LocalScoreStore();
expect('empty board qualifies any positive score, not 0', s.qualifies('t', 'medium', 1) && !s.qualifies('t', 'medium', 0));
expect('first entry ranks #1', s.submit('t', 'medium', E('AAA', 500)) === 1);
expect('higher score ranks above', s.submit('t', 'medium', E('BBB', 900)) === 1);
expect('tie ranks BELOW the earlier equal score', s.submit('t', 'medium', E('CCC', 500)) === 3);
expect('order is descending, ties earlier-first', s.list('t', 'medium').map((e) => e.initials.trim()).join(',') === 'BBB,AAA,CCC');
for (let i = 0; i < 20; i++) s.submit('t', 'medium', E('Z', 1000 + i));
const full = s.list('t', 'medium');
expect(`board truncates to ${BOARD_SIZE}`, full.length === BOARD_SIZE && full[0].score === 1019 && full[9].score === 1010);
expect('full board: lower score does not qualify', !s.qualifies('t', 'medium', 1010) && s.submit('t', 'medium', E('LOW', 5)) === null);
expect('full board: higher score qualifies', s.qualifies('t', 'medium', 1011));
expect('boards isolated per tier and theme', s.list('t', 'hard').length === 0 && s.list('other', 'medium').length === 0);

expect("cleanInitials('ab!') = 'AB'", cleanInitials('ab!') === 'AB');
expect("cleanInitials('x-y-z-w') = 'XYZ'", cleanInitials('x-y-z-w') === 'XYZ');
expect("cleanInitials('💀') = ''", cleanInitials('💀') === '');

mem.set('flipper-seance:t:board:easy', '{not json');
expect('corrupted JSON loads as an empty board (no throw)', s.list('t', 'easy').length === 0);
const cleaned = sanitizeBoard([
  { initials: 'OK ', score: 10, day: '2026-01-01' },
  { initials: '<script>', score: 99 }, { initials: 'NAN', score: NaN }, { initials: 'NEG', score: -5 },
  null, 'x', { initials: 'FLT', score: 12.7, day: 'nope' },
]);
expect('bad entries dropped, floats floored, bad days blanked', cleaned.length === 2 && cleaned[0].score === 12 && cleaned[0].day === '' && cleaned[1].initials === 'OK ');

mem.set('flipper-seance:legacy:best:medium', '4321');
const migrated = s.list('legacy', 'medium');
expect("legacy best migrates as a '---' entry", migrated.length === 1 && migrated[0].initials === '---' && migrated[0].score === 4321);
expect('legacy key kept', mem.get('flipper-seance:legacy:best:medium') === '4321');
s.clear('legacy', 'medium');
expect('cleared board stays cleared (legacy best does not resurrect)', s.list('legacy', 'medium').length === 0);

storageThrows = true;
const blocked = new LocalScoreStore();
let threw = false;
try {
  blocked.submit('priv', 'medium', E('PRV', 77));
  expect('throwing storage falls back to memory for the session', blocked.list('priv', 'medium')[0]?.score === 77);
} catch { threw = true; }
expect('throwing storage never throws out of the store', !threw);
storageThrows = false;

process.exit(bad ? 1 : 0);
