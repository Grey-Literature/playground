# CLAUDE.md — Catbot (games/catbot)

> Project brief while Catbot is mid-build. Overrides `games/CLAUDE.md` only
> where it says so. Retire it once the game ships (fold anything worth
> keeping into the wiki first).

## What this is

A game for the **Jamference: AI Game Jam Hack 1** (itch.io,
`jamference-ai-game-jam-hack-1`). Theme "cat and robot", read literally:
a heavy brass-and-copper clockwork cat. Build week 2026-10-02 → hard
deadline **2026-10-09 07:00**. Judged equally on Fun, AI Use, Polish.

Gameplay design is being planned in a separate chat with Sonnet 5.5;
this folder is where the character is settled first.

## Constraints

- **Jam rule (mandatory): every input maps only to player movement.**
  No action/jump/interact buttons; context comes from where you move.
- Web build preferred (plain HTML/JS, no build step) — matches the repo
  baseline in `games/CLAUDE.md` §4.
- Jam requires disclosing AI tools and what they did on the submission.
- No fail-state rule: **open** — the jam game may want one (the Defeat
  pose exists for it). Decide with the mechanics and record it here.

## Files

| File | What |
| --- | --- |
| `catbot-storyboard.webp` | Concept storyboard (idle, ear scan, stretch, pivot, pounce, land) |
| `catbot-sprite` | Sprite-sheet concept (PNG, no extension) |
| `catbot-rig.html` | Procedural rig proposal: walk + 7 mechanic poses, physics-driven |

## Rig spec (settled by `catbot-rig.html`)

- Side view, body side-on, head 3/4 to camera. Light from upper-left;
  projected silhouette shadow + per-paw contact shadows.
- `Catbot` class = physics; scenes only write a `ctrl` intent object.
  Reuse that split in the game: game state → ctrl → rig.
- Weight comes from springs, not keyframes: body 3.2 Hz / ζ 0.48,
  gravity 2600 px/s², accel cap 260 px/s², footfall impulses.
- One `energy` value (0–1) drives speed, posture, tail stiffness, spring
  frequency, core glow and key spin — a natural "wind" resource.

## Open questions

- Mechanics, win/lose conditions, level structure — not decided.
- Folder name is lowercase `catbot` (category convention is PascalCase);
  rename before it's linked from `games-index.html`, if it ever is.
