# CLAUDE.md — Games category (webApps/portfolio/games)

> Read automatically by Claude Code at the start of any session rooted here
> or in a subfolder. This is the **category-level** brief — conventions for
> the games section as a whole, not its current state (see
> `_wiki/portfolio/games.md` for what's shipped and what's in progress). A
> game subfolder can carry its own `CLAUDE.md` with project-specific specs
> while it's being built — none currently do, since the convention (§5) is
> to retire a subfolder's CLAUDE.md once its game ships. Claude Code reads
> these hierarchically: both apply together, and a subfolder's own file wins
> for anything inside that subfolder.

## 1. What this is

The "games" category of the portfolio: one landing/index page
(`games-index.html`) linked from the main portfolio (`../index.html`), which
in turn links out to individual game/toy subfolders. Same containment-shelf
voice as the rest of the portfolio — small, self-contained, slightly
deranged interactive pieces, not "real" games with menus or win states.

## 2. This folder is live, not a scratch copy

`C:\2-Obsidian-Claude-Vault\webApps\portfolio\games` is the actual
GitHub-synced production folder. Anything written here is a real change to
the live site, not a draft. Bake-offs, finalists, and multi-model
experiments belong in a scratch location (e.g. `C:\temp\...`) until a
decision is made — only the winner (or a mashup of winners) moves in here.

## 3. Folder conventions (the roster itself lives in the wiki)

For what's shipped, what's in progress, and the current folder/file map, see
`_wiki/portfolio/games.md` — kept current by the vault's INGEST/TIDY loop.
This file doesn't try to duplicate that roster: an earlier version of it
named the wrong folder for one game and omitted two others entirely, which
is exactly the failure mode of tracking the same state in two places.

A few conventions that hold regardless of the current roster:

- `game-index.html` (singular) is a thin redirect stub for the
  singular/plural typo. Recreate only if the typo-catch is wanted again —
  check the wiki page for whether it currently exists.
- `itOps/` is a Vite/React build, not a self-contained static HTML file like
  the other cabinets: `index.html` is the dev entry, `dist/index.html` is
  the build output, `itops.html` is the deploy artifact actually linked from
  the games index. Don't assume static HTML there.
- `pinball/` (Flipper Séance) is also a Vite/React build, but single-file:
  `index.html` is the dev entry, `npm run build` regenerates the committed
  deploy artifact `pinball.html`. Its own `pinball/CLAUDE.md` (while it's
  mid-build) overrides the no-build and no-fail-state defaults for itself.
- A game subfolder's own CLAUDE.md is expected to be retired once its game
  ships (see §5) — don't be surprised when one's missing for a completed
  game, and don't treat that as a broken link.

## 4. Non-negotiable constraints (category-wide default)

The baseline every new subfolder inherits, so nothing has to be re-derived
per project. A subfolder's own CLAUDE.md can override any of these for
itself, but this is the assumed default:

- **No API keys of any kind in client-side code.** This repo is public and
  forkable. Hard no, regardless of framing (AI-provider keys most of all).
- **No paid/proprietary external resources** (fonts, CDN libraries, APIs) —
  free-to-use CDN resources (Google Fonts, cdnjs, etc.) are fine. Soft rule —
  flag back to the user first if something would require payment to use or
  host.
- **No build step.** Files should open directly in a browser or deploy as-is
  to GitHub Pages with zero setup. No `npm install`, no bundler.
- **No fail states** in toys/games unless a specific project's own CLAUDE.md
  says otherwise.

## 5. Adding a new game

1. Create `games/<GameName>/` (match the InterpretiveNetworking capitalization
   style — PascalCase folder, kebab-case or matching-name entry HTML file
   inside it).
2. Write that subfolder's own `CLAUDE.md` before writing any code, in this
   shape: what-this-is → constraints → design spec → visual style → build
   phases with STOP checkpoints → definition of done → explicit non-goals.
   Once the game ships, that CLAUDE.md can be retired like
   InterpretiveNetworking's and itOps's were — just fold anything worth
   keeping (ledgers, attribution, open follow-ups) into this file or the
   vault wiki first, so it isn't lost with the deletion.
3. Wire it into `games-index.html` as a new card once it's actually playable
   — don't add a card for a game that doesn't exist yet (the "???" ghost
   slot exists precisely so there's always an honest placeholder instead of
   a card linking to nothing).

## 6. Explicit non-goals

- Don't invent a second landing page or rename `games-index.html` — the
  redirect stub already handles the naming ambiguity.
- Don't merge or reconcile this category with unrelated one-off experiments
  elsewhere in `webApps/`, if any exist — they're deliberately kept separate.
- Don't retrofit multi-model credits into the footer sigil easter egg
  (5 clicks → Anthropic/Claude ASCII overlay) — the joke is specifically
  that it doesn't acknowledge other models that contributed to
  `games-index.html`; "fixing" that kills the joke. Full history of who
  built what is in `_wiki/portfolio/games.md`, not here.
