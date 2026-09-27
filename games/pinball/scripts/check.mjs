// `npm test` — bundles each scripts/*.check.ts with esbuild (already installed
// as Vite's own dependency) and runs it under plain node. No test framework,
// no extra deps. Exit code is non-zero if any check fails.
//
//   node scripts/check.mjs            # every check
//   node scripts/check.mjs stuck      # only checks whose name contains "stuck"

import { build } from 'esbuild';
import { readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'node_modules', '.cache', 'pinball-checks');
mkdirSync(out, { recursive: true });

const filter = process.argv[2] ?? '';
const checks = readdirSync(here).filter((f) => f.endsWith('.check.ts') && f.includes(filter)).sort();
if (!checks.length) { console.error(`no checks match "${filter}"`); process.exit(1); }

let failed = 0;
for (const f of checks) {
  const outfile = join(out, f.replace(/\.ts$/, '.mjs'));
  await build({
    entryPoints: [join(here, f)], outfile, bundle: true, platform: 'node', format: 'esm',
    logLevel: 'warning', target: 'node20',
  });
  console.log(`\n━━━ ${f} ━━━`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [pathToFileURL(outfile).pathname], { stdio: 'inherit' });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.status !== 0) { failed++; console.log(`✗ ${f} FAILED (${secs}s)`); }
  else console.log(`✓ ${f} passed (${secs}s)`);
}
if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nall checks passed');
