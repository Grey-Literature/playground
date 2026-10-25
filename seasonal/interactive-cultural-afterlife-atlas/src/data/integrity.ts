import type { Record, Work } from "./types.ts";

/**
 * Structural checks over the records and the bibliography.
 *
 * These exist because the verification pass is the most valuable and the most
 * fragile thing in this project.  Sixty-odd records carry hand-checked
 * `sources` and `verified` blocks, and almost nothing about them is
 * expressible in the type system: a `supports` line can be emptied, a
 * `verified` block deleted, a citation key mistyped, and `tsc` stays perfectly
 * happy.  That work is expensive to produce and cheap to destroy, and this
 * repo is worked on by more than one agent.
 *
 * The function returns problems rather than throwing, so each caller decides:
 * the dev server throws on module load, the build fails at `buildStart`.
 * Deliberately nothing runs in the shipped page — a data slip must never break
 * the atlas for a reader, which would be a fail state, and this repo doesn't
 * do those.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The number of records whose hard claims have been checked.  Verification
 * only ever goes up, so a drop means data was lost rather than that work was
 * undone.  **Raise this at the end of each batch** — the same moment the batch
 * gets its entry in `_wiki/log.md`.
 */
export const COVERAGE_FLOOR = 92;

export function checkAtlasIntegrity(
  records: readonly Record[],
  works: Readonly<globalThis.Record<string, Work>>,
): string[] {
  const problems: string[] = [];
  const seenIds = new Set<string>();
  const citedWorks = new Set<string>();

  for (const r of records) {
    if (seenIds.has(r.id)) problems.push(`duplicate record id: "${r.id}"`);
    seenIds.add(r.id);

    const sources = r.sources ?? [];

    for (const c of sources) {
      citedWorks.add(c.work);
      // `Citation.work` is a plain string — the record files would otherwise
      // have to import bibliography.ts purely to get the key union — so a typo
      // is caught here rather than rendering as a blank citation.
      if (!(c.work in works)) problems.push(`${r.id} cites unknown work "${c.work}"`);
      if (!c.supports.trim()) problems.push(`${r.id} → "${c.work}" has an empty supports line`);
    }

    if (sources.length && !r.verified) {
      problems.push(`${r.id} carries sources but no verified block`);
    }

    if (r.verified) {
      const v = r.verified;
      if (!ISO_DATE.test(v.checked)) {
        problems.push(`${r.id} verified.checked is not an ISO date: "${v.checked}"`);
      }
      if (!Number.isInteger(v.claims) || v.claims < 1) {
        problems.push(`${r.id} verified.claims should be a positive integer, got ${v.claims}`);
      }
      if (v.status !== "unchecked" && sources.length === 0) {
        problems.push(`${r.id} is marked "${v.status}" but cites nothing`);
      }
    }
  }

  for (const [key, w] of Object.entries(works)) {
    if (!w.title.trim()) problems.push(`work "${key}" has no title`);
    // The built page is a single file that has to work opened from disk, so
    // every link must be absolute https — a protocol-relative or http URL
    // silently breaks under file://.
    if (w.url && !w.url.startsWith("https://")) {
      problems.push(`work "${key}" has a non-https url: ${w.url}`);
    }
  }

  const checked = records.filter((r) => r.verified && r.verified.status !== "unchecked").length;
  if (checked < COVERAGE_FLOOR) {
    problems.push(
      `verified coverage is ${checked}, below the floor of ${COVERAGE_FLOOR}. ` +
        `Either verification data was lost, or COVERAGE_FLOOR in integrity.ts needs raising.`,
    );
  }

  return problems;
}

/**
 * Works in the bibliography that nothing cites.  Not an error — a work may be
 * added just ahead of the records that will use it — but a sudden orphan is
 * often the fingerprint of a deleted `sources` block, so it is worth saying
 * out loud rather than swallowing.
 */
export function orphanWorks(
  records: readonly Record[],
  works: Readonly<globalThis.Record<string, Work>>,
): string[] {
  const cited = new Set(records.flatMap((r) => (r.sources ?? []).map((c) => c.work)));
  return Object.keys(works).filter((k) => !cited.has(k));
}
