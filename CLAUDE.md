# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — plataforma para jugar online y competir por la mayor cantidad de puntos. Currently a bare `create-next-app` scaffold: `app/` holds only the generated root layout and home page, and there is no game, data, or auth code yet. Expect to be building features from scratch rather than extending existing ones.

## Commands

```bash
npm run dev     # dev server (also regenerates AGENTS.md — see below)
npm run build
npm run start   # serve a production build
npm run lint    # eslint (flat config, eslint-config-next core-web-vitals + typescript)
npx tsc --noEmit  # typecheck; there is no `typecheck` script
```

No test runner is configured — if tests are needed, pick and set one up rather than assuming one exists.

## Stack notes

- **Next.js 16.3.1 with React 19** — the App Router lives in `app/`. Per `AGENTS.md`, this Next version has breaking changes vs. training data: read the relevant guide under `node_modules/next/dist/docs/01-app/` before writing routing, data-fetching, or metadata code.
- Route-typed helpers are global (e.g. `LayoutProps<"/">` in `app/layout.tsx`) — generated into `.next/dev/types`, not imported. They only resolve after `next dev`/`next build` has run.
- **Tailwind CSS v4** — configured entirely through the `@tailwindcss/postcss` plugin and `app/globals.css`. There is no `tailwind.config.*`; theme customization goes in CSS via `@theme`.
- `@/*` maps to the repo root in `tsconfig.json`; `strict` is on.

## Workflow

The README specifies Spec Driven Design using the `/spec` and `/spec-impl` skills from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (installed via `npx skills@latest add Klerith/fernando-skills`). Prefer writing/updating a spec before implementing features.

`next dev` rewrites the instruction block in `AGENTS.md`. If a diff shows changes there, commit them alongside your work instead of reverting — reverting just re-creates the dirty tree.
