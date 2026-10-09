---
name: add-game
description: Drafts a spec for onboarding a new playable game — from references/started-games or any other vanilla-JS canvas source — into Arcade Vault, wired end-to-end to the Supabase games/scores leaderboard. Reads the source game, asks clarifying questions, and writes a pre-filled specs/NN-<slug>-game.md that merges the pattern of specs 05 (game integration) and 06 (leaderboard) into a single spec. Never writes application code — hand the resulting spec to /spec-impl once it is approved. Use it whenever a new game needs to be added to the platform.
disable-model-invocation: true
argument-hint: '<references/started-games folder, e.g. 03-tetris> or a path/description of an external game'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /add-game — Spec generator for onboarding a new game with leaderboard

## Session context

Today's date (use this for the spec header, never guess it):
!`date +%F`

Specs that already exist:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist yet"`

Reference games available to port:
!`ls references/started-games/ 2>/dev/null || echo "references/started-games/ does not exist"`

Existing Supabase migrations (to number the next one):
!`ls supabase/migrations/ 2>/dev/null || echo "supabase/migrations/ does not exist"`

Current row/leaderboard types (do not redesign these — reuse them):
!`cat lib/supabase/types.ts 2>/dev/null || echo "lib/supabase/types.ts not found"`

---

This skill **does not write application code**. Its only output is a single pre-filled
spec file at `specs/NN-<slug>-game.md`. The user reviews it, flips its state to
`Approved`, and then runs `/spec-impl NN-<slug>-game` to actually implement it — exactly
like any other spec in this repo.

## Philosophy

Arcade Vault already proved the "onboard a canvas game" recipe once, split across two
specs:

- `specs/05-asteroids-game.md` — porting a vanilla canvas game
  (`references/started-games/02-asteroids/game.js`) into
  `components/games/AsteroidsGame.tsx` + a dedicated play page.
- `specs/06-games-table-leaderboard-supabase.md` — wiring that game to the Supabase
  `games`/`scores` tables and the platform-wide leaderboards.

That recipe is now a known, mechanical pattern — not something that needs full
Phase-2-style open-ended discovery every time. This skill's job is to **read the actual
source game**, ask only the handful of decisions the pattern doesn't resolve on its own
(id, texts, category, color, cover art, HUD stats, asset location), and produce one
merged spec per new game. It never re-derives the pattern from scratch and it never
writes code — that discipline is what keeps `/spec-impl` as the single place where code
actually changes.

## Command flow

Follow the phases in order. Replies and the generated spec must be in the same language
the existing specs are written in (`specs/05-*` and `specs/06-*` are in Spanish — match
that unless the repo's convention has since changed).

### Phase 1 — Identify and read the source game

`$ARGUMENTS` names the game to onboard. It can be:

- A folder under `references/started-games/` (e.g. `03-tetris`, `tetris`, `04-arkanoid`).
- A path, description, or pasted code for a game that does **not** live in that folder
  — the user has explicitly said games may or may not come from there.

If `$ARGUMENTS` is empty, show the `references/started-games/` listing from the session
context above and ask which one to use (or whether it's an external source).

Once you know the source:

1. Read the game's source **fully** — `game.js` and, if present, `index.html`,
   `levels.js`, any CSS, and any `CLAUDE.md`/`README.md` sitting next to it. For an
   external source, ask for the file(s)/path/code and read those instead.
2. Extract, concretely:
   - Canvas dimensions (and whether there's a secondary canvas, e.g. a "next piece"
     preview).
   - The game-loop pattern (`requestAnimationFrame`, how `dt` is computed, whether pause
     is "skip `update()`" or "cancel the RAF").
   - Every state variable that maps to something the platform should show or store:
     score (always), and whatever else exists — lives, level, lines, combo, etc.
   - The game-over pattern: is it a string state machine (`state`/`gameState`) or a
     boolean flag? Does the game **own its own restart** (keypress inside the loop, or a
     DOM restart button) and its own "GAME OVER" overlay/DOM element that needs to be
     stripped in favor of the platform's React modal?
   - Input handling (`keydown`/`keyup` on `window` vs `document`, any `mousemove`/
     `click` handling).
   - Any use of the DOM outside the canvas (`getElementById` for HUD text, overlays,
     buttons) or of `localStorage` — these need to be reconciled with (or removed in
     favor of) the platform's own HUD/modal/`localStorage` pattern.
   - Any external assets referenced (images, spritesheets, audio files, fonts).
3. Compare what you found against the already-validated target shape,
   `components/games/AsteroidsGame.tsx` (read it now if you haven't in this session) —
   this is the component the new game's component must resemble:
   - `'use client'`, single `<canvas>`, all game logic inside one mount-only
     `useEffect(() => {...}, [])`.
   - Props: `paused: boolean` plus one `on<Stat>Change` callback per tracked stat and
     `onGameOver: (finalScore: number) => void`.
   - Latest prop/callback values are read through refs (not effect dependencies) so the
     effect never re-runs.
   - The loop calls `update(dt)` only when not paused, always calls `draw()`, diffs each
     stat against its previous value before firing its callback, and fires `onGameOver`
     exactly once via a guard flag.
   - The canvas's own internal HUD (`drawHUD()` or equivalent) is **kept** — the
     platform mirrors the same values in a separate React HUD, it doesn't replace the
     canvas one.
   - The canvas's own "GAME OVER" overlay and any restart-on-keypress/DOM-restart logic
     are **removed** — the React modal in the play page owns game-over and restart.
   - Cleanup on unmount: cancel the RAF, remove every listener that was added.
4. If the source doesn't fit this shape at all (no game loop, no score concept, not
   canvas-based), stop and tell the user this game needs a different integration
   approach before a spec can be written.

### Phase 2 — Clarify integration decisions

Use `AskUserQuestion` (in blocks, not one question at a time) to pin down what the code
alone doesn't answer. Never assume any of these:

- **Identity:** `id` (slug — becomes the `games.id` primary key and the `/games/<id>`
  route segment), `title`, `short` (one line), `long` (one paragraph), `cat`
  (`ARCADE` | `PUZZLE` | `SHOOTER`).
- **Theme color:** one of `cyan` / `magenta` / `yellow` / `green`
  (`app/globals.css` theme vars).
- **Cover art:** Grep `app/globals.css` for `\.cover-` to list every defined cover class,
  then check which ones are already referenced by a row in `games`
  (`references/started-games` conventions plus any existing `supabase/migrations/*.sql`
  that seed `games` — currently only `cover-rocas`, taken by Asteroids). Offer the free
  ones (as of this writing: `cover-bricks`, `cover-tetro`, `cover-snake`, `cover-glot`,
  `cover-invaders`, `cover-rana`, `cover-duelo`) as reuse candidates, or offer to design
  a brand-new `.cover-<slug>` block following the same pattern (background gradient +
  `::before`/`::after` pseudo-elements built from the theme vars).
- **HUD stat mapping:** `Puntuación` (score) is mandatory — it's what gets written to
  `scores.score`. Ask which other 1–2 stats extracted in Phase 1 (lives, level, lines,
  combo, …) should appear in the platform's `.hud-stat` row, and what Spanish label each
  one gets.
- **Game-over confirmation:** confirm your Phase-1 read of how the source signals game
  over and what exactly needs to be stripped (overlay text, restart keypress/button).
- **External assets:** if Phase 1 found images/audio/fonts, confirm they'll live under
  `public/games/<id>/...` and get referenced with root-relative paths.

Do not ask about anything Phase 1 already answered directly from the code (canvas size,
loop pattern, etc.).

### Phase 3 — Write the spec

1. Determine the next sequential number from the `specs/` listing in the session
   context (highest existing number + 1, zero-padded to two digits).
2. Build the filename `NN-<slug>-game.md`, where `<slug>` is the kebab-case game id from
   Phase 2 — matching the existing naming convention (`05-asteroids-game.md`).
3. Read `.claude/skills/spec/template.md` (same directory tree, sibling skill) for the
   structural skeleton: header block, `## Scope`, `## Data model`,
   `## Implementation plan`, `## Acceptance criteria`, `## Decisions`, closing
   reinforcement section.
4. Also read `.claude/skills/spec/SKILL.md` itself to pick up the **live** writing
   conventions — valid state labels, the numbering rule, and (Phase 4 there) how
   `specs/.spec-config.yml` is seeded/left alone. Step 5 and step 7 below summarize
   those conventions as of when this skill was written; if `spec/SKILL.md` has since
   changed (different state labels, a different config default, etc.), follow what it
   actually says today over the summary below.
5. Fill it in by merging the specs-05+06 pattern for this specific game:
   - **Header:** `Status: Draft` (or the repo's equivalent word — never write
     `Approved`), `Depends on: SPEC 06`, today's date from the session context,
     one-sentence objective ("Integrate `<title>` as a playable game at `/games/<id>`
     with a Supabase-backed leaderboard.").
   - **Scope — In:**
     - A new migration `supabase/migrations/000X_add_<id>_game.sql` (X = next number
       after the last one in the session context listing) that inserts one row into
       `games` with the Phase-2 values, applied via the `mcp__supabase__apply_migration`
       MCP tool — not "by hand in the SQL editor".
     - `components/games/<PascalCaseId>Game.tsx` following the exact
       `AsteroidsGame.tsx` contract described in Phase 1 step 3.
     - If `components/games/types.ts` does not exist yet and this is the second canvas
       game being onboarded, extract a shared base props type there (score mandatory,
       other stats as named optional callbacks) instead of duplicating an ad hoc
       interface — this is the exact trigger spec 05 flagged for that extraction
       ("se extrae cuando llegue el segundo juego canvas"). If a shared type already
       exists, reuse/extend it instead of redefining it.
     - `app/games/<id>/play/page.tsx` (a new **static** route — do not touch the
       generic `app/games/[id]/play/page.tsx`, which stays a decorative placeholder;
       Next.js gives static routes priority over dynamic ones). Structure it like
       `app/games/asteroids/play/page.tsx`: `dynamic(() => import(...), {ssr:false})`
       for the canvas component, `.player-hud` bar with the Phase-2 stats, `.crt` frame
       with a pause overlay, game-over modal that prefills the name input from
       `localStorage.getItem('av_player_name')`, on save persists it back and inserts
       `{ game_id: '<id>', player_name, score, user_id: null }` into `scores` via the
       browser Supabase client, a `saved` flag to block double-submits, and `restart()`
       via remounting the canvas component with a bumped `key`.
     - A new `.cover-<slug>` block in `app/globals.css`, only if Phase 2 didn't reuse an
       existing one.
   - **Scope — Out of scope:** state explicitly that `app/games/page.tsx`,
     `app/games/[id]/page.tsx`, and `app/hall-of-fame/*` need **no changes** (they
     already fetch generically from `games`/`scores`) — unless Phase 1/2 turned up
     something hardcoded to Asteroids in those files, in which case flag it as a finding
     instead of silently assuming. Also state out of scope: RLS changes, realtime,
     an admin panel, and anything touching the legacy `app/juegos`, `app/jugar`,
     `lib/games.ts`, `lib/database.types.ts`, `lib/scores.ts` tree (ignore that tree
     entirely — it is not part of the live pattern).
   - **Data model:** the concrete `games` row values from Phase 2; note that
     `GameRow`/`ScoreRow` in `lib/supabase/types.ts` need no changes; the new
     component's props interface (or its extension of the shared `types.ts`).
   - **Implementation plan** (numbered, each step independently functional): (1) write
     and apply the migration, seed the row; (2) verify the row in Supabase; (3) port the
     component (and `components/games/types.ts` if applicable); (4) create the play page
     and wire score-saving; (5) add the cover CSS class if it's new; (6) manual smoke
     test across `/games`, `/games/<id>`, `/games/<id>/play`, `/hall-of-fame`;
     (7) `npm run build` with zero TypeScript errors.
   - **Acceptance criteria:** boolean checklist adapted from specs 05/06's criteria to
     this game's id/route/component names.
   - **Decisions:** carry forward the still-relevant "Yes/No" decisions from specs 05/06
     (double HUD, callbacks as the canvas↔React interface, `dynamic(..., {ssr:false})`,
     a static per-game play route instead of conditionals in the generic one, `best`
     computed at query time via `MAX(score)`, nullable `user_id` with no FK, name
     prefill via the separate `av_player_name` localStorage key, no RLS/no realtime for
     now) plus whatever Phase 2 decided (cover class choice, shared-types extraction,
     asset location).
6. Write the file with `Write`. Do not ask for permission to write it or whether the
   filename is fine — announce the path in the final confirmation.
7. If `specs/.spec-config.yml` does not exist, seed it with the same default
   `spec/SKILL.md` (just re-read in step 4) says to write — as of this writing,
   `AutoCreateBranch: true` — but only if it's missing; never overwrite an existing one.

### Phase 4 — Handoff

Confirm to the user:

- The path of the spec you just wrote, and that its state is `Draft`.
- That the next step is to review it, flip the state to `Approved` by hand, then run
  `/spec-impl NN-<slug>-game`.
- **Stop here.** Do not start implementing, do not create the migration, do not touch
  `app/` or `components/`.

## Hard rules

- **Never write application code, run a migration, or touch Supabase in this skill.**
  The only file this skill creates or edits is the spec `.md` (and, only if missing,
  `specs/.spec-config.yml`).
- **Never mark the spec as `Approved`.** That's the human's decision.
- **Never invent game mechanics.** Every claim about score/lives/level/game-over
  behavior in the spec must come from actually reading the source file(s) in Phase 1,
  not from assuming it works like Asteroids.
- **Never assume `app/games/page.tsx` / `app/games/[id]/page.tsx` / `app/hall-of-fame/*`
  are still untouched/generic** — check them if there's any doubt, and record a finding
  in the spec if something game-specific has crept in since spec 06.
- **Ignore the legacy tree** (`app/juegos`, `app/jugar`, `lib/games.ts`,
  `lib/database.types.ts`, `lib/scores.ts`) — never reference it as something to reuse
  or extend.

## Tone when asking questions

Same as `/spec`: be direct and concrete, offer 2–4 options with a recommendation marked,
ask in blocks, wait for the answer. Don't ask about anything Phase 1 already resolved by
reading the code.

## Arguments

`$ARGUMENTS` is the game to onboard: a folder name under `references/started-games/`
(full name or bare slug — e.g. `03-tetris` or `tetris`) or a path/description pointing
at an external vanilla-JS canvas game. If empty, list `references/started-games/` and
ask.
