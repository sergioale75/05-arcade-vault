# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en este repositorio.

@AGENTS.md

## Proyecto

**Arcade Vault** — plataforma de juegos arcade retro donde los usuarios juegan y compiten por puntos. La UI está íntegramente en español; la estética es retro-arcade CRT (neón, scanlines, fuente pixel).

Se desarrolla con **Spec Driven Design**: cada funcionalidad nace como un spec en `specs/NN-slug.md`, se aprueba, y solo entonces se implementa en la rama `spec-NN-slug`. Nunca implementes una feature que no tenga su spec aprobado.

## Stack

- **Next.js 16.2.6** con App Router (`app/`) — lee la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir código de Next.js; las APIs difieren de tus datos de entrenamiento
- **React 19.2.4** · **TypeScript 5**
- **Supabase** — `@supabase/supabase-js` ^2.105.4 + `@supabase/ssr` ^0.10.3 (datos de juegos y puntuaciones)
- **Resend** ^6.12.3 (formulario de contacto)
- **Tailwind CSS v4** (`@tailwindcss/postcss`) — está instalado, pero **apenas se usa**: el estilo real vive en `app/globals.css` (ver "Sistema de diseño")
- **Prettier 3.8.3** + **ESLint 9**

**No hay test runner configurado.** No inventes comandos de test.

### Comandos

```bash
npm run dev            # servidor de desarrollo (puerto 3000)
npm run build          # build de producción
npm run start          # servir el build
npm run lint           # eslint
npm run format         # prettier --write
npm run format:check   # prettier --check
```

### Variables de entorno (`.env.template` → `.env.local`)

| Variable                               | Uso                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto Supabase                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública. ⚠️ Nomenclatura nueva de Supabase — **no** es `ANON_KEY` |
| `RESEND_API_KEY`                       | Envío de correo desde `/api/contact`                                    |
| `SUPABASE_DB_PASSWORD`                 | Contraseña de la base de datos                                          |

⚠️ `npm run build` **falla** si `RESEND_API_KEY` no está definida en `.env.local`: `app/api/contact/route.ts:3` instancia `new Resend(...)` a nivel de módulo y el build revienta al recolectar los datos de esa página (`Failed to collect page data for /api/contact`). No es un error de tu código — define la variable, o mueve la instanciación dentro del handler.

### MCP

`.mcp.json` configura el servidor MCP de Supabase (proyecto `bqywmtihsxtmjyrlnufo`). Las migraciones se aplican con `mcp__supabase__apply_migration` **y además** se guarda el `.sql` en `supabase/migrations/` para que el repo quede como fuente de verdad.

## Skills y flujo de trabajo

| Skill                  | Qué hace                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/spec <descripción>`  | Diseña un spec por fases (contexto → preguntas → redacción → guardado). Lo guarda como `Draft`. **Nunca escribe código** ni lo marca como aprobado por su cuenta                                                   |
| `/spec-impl <NN-slug>` | Valida que el estado del spec signifique _Aprobado_, crea/cambia a la rama `spec-NN-slug` e implementa paso a paso, pausando tras cada paso                                                                        |
| `/add-game <carpeta>`  | Skill **propia del proyecto**. Lee el `game.js` de una carpeta de `references/started-games/` y genera un spec pre-rellenado que fusiona el patrón del spec 05 (integración canvas) y el 06 (leaderboard Supabase) |
| `/frontend-design`     | Usa siempre esta skill para diseñar la interfaz de usuario                                                                                                                                                         |

- `specs/.spec-config.yml` tiene `AutoCreateBranch: true`: `/spec-impl` crea la rama sin preguntar.
- Las skills están duplicadas en `.claude/skills/` (las que carga Claude Code, más completas) y `.agents/skills/` (copia para otros agentes). Si editas una, edita la otra.
- ⚠️ `specs/` contiene **dos numeraciones paralelas** (una serie antigua con slugs en español y la serie activa con slugs en inglés). `/spec-impl 01` o `/spec-impl 03` es ambiguo: pasa siempre el slug completo.

### Hook de formato automático

`.claude/settings.json` registra un hook `PostToolUse` sobre `Write|Edit|MultiEdit` que ejecuta `.claude/hooks/format-and-lint.sh` (`prettier --write` + `eslint --fix`). **No formatees a mano después de editar** — el hook ya lo hace.

Convenciones de `.prettierrc`: comillas simples, `semi: true`, 2 espacios, `printWidth: 80`, `trailingComma: "all"`.

## Arquitectura

App Router exclusivamente — no hay directorio `pages/`. Los Server Components son el valor por defecto; marca `"use client"` solo cuando haga falta.

### Rutas activas

| Ruta                    | Archivo                                              | Tipo                                                                    |
| ----------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `/`                     | `app/page.tsx`                                       | Server — landing; lee `games` de Supabase (limit 6)                     |
| `/games`                | `app/games/page.tsx` + `app/games/GamesGrid.tsx`     | Server + grid cliente con búsqueda y filtro por categoría               |
| `/games/[id]`           | `app/games/[id]/page.tsx`                            | Server — detalle + top-10. `params` es una `Promise` (Next 16)          |
| `/games/[id]/play`      | `app/games/[id]/play/page.tsx`                       | Reproductor **simulado** — fallback para juegos sin implementación real |
| `/games/asteroids/play` | `app/games/asteroids/play/page.tsx`                  | Juego real                                                              |
| `/games/tetris/play`    | `app/games/tetris/play/page.tsx`                     | Juego real (+ selector de skin y de nivel inicial)                      |
| `/hall-of-fame`         | `app/hall-of-fame/page.tsx` + `HallOfFameClient.tsx` | Podio + tabla, con pestañas por juego                                   |
| `/about`                | `app/about/page.tsx`                                 | Client — misión + formulario de contacto                                |
| `/auth`                 | `app/auth/page.tsx`                                  | Login/registro **simulado** (localStorage, sin Supabase Auth)           |
| `POST /api/contact`     | `app/api/contact/route.ts`                           | Único endpoint. Envía correo vía Resend                                 |

Piezas transversales:

- `app/layout.tsx` — monta `UserProvider`, `<Nav />`, las capas decorativas `.av-bg` / `.av-noise` y el footer. Las fuentes **no** usan `next/font`: entran por `@import` de Google Fonts en `globals.css`
- `app/context/UserContext.tsx` — "sesión" local en `localStorage['av_user']`, hook `useUser()` → `{ user, login, signOut }`
- `app/RevealObserver.tsx` — IntersectionObserver que añade `.in` a los elementos `.reveal` al entrar en viewport
- `components/Nav.tsx` — navegación global (incluye menú móvil)

## Supabase

- `lib/supabase/client.ts` → `createClient()` para Client Components
- `lib/supabase/server.ts` → `createClient()` es **async**: siempre `await createClient()` (hace el puente de cookies con `await cookies()`)
- `lib/supabase/types.ts` → `GameRow` y `ScoreRow`, escritos a mano y aplicados con casts (`data as GameRow[]`)

### Esquema (migraciones 0001–0005)

- **`games`** — `id` (text, PK) · `title` · `short` · `long` · `cover` · `cat` (`ARCADE|PUZZLE|SHOOTER`) · `color` (`cyan|magenta|yellow|green`)
- **`scores`** — `game_id` (FK → `games`) · `player_name` (text, NOT NULL) · `score` · `user_id` (nullable: se puede jugar sin cuenta) · `created_at`
- **`profiles`** — `id` (FK → `auth.users`) · `display_name` (1–10 caracteres). Se rellena con el trigger `on_auth_user_created`
- Vista **`game_rankings`** — mejor marca por jugador y juego (hace INNER JOIN con `profiles`, así que excluye los scores anónimos)
- RLS activo en las tres tablas: lectura pública; el insert de scores está abierto (se endurecerá en un spec futuro)

### Reglas al tocar datos

- **Comprueba siempre el `error` que devuelve Supabase al insertar en `scores`.** El bug del spec 07 (la columna `player_name` no existía) pasó desapercibido durante dos specs porque los inserts hacían `setSaved(true)` sin mirar el error.
- Añadir un juego nuevo implica una migración que inserta su fila en `games` — sigue el patrón de `supabase/migrations/0004_add_tetris_game.sql`.
- Catálogo de juegos ya implementados (id, categoría, color, portada, ruta): `references/templates/implemented-games.md`. Es una foto de la tabla `games`; actualízalo al añadir un juego nuevo.

## Sistema de diseño

`app/globals.css` (~1.300 líneas) es la **única** fuente de estilo. Contiene:

- Variables: `--bg`, `--bg-2`, `--bg-3`, `--ink`, `--ink-dim`, `--cyan`, `--magenta`, `--yellow`, `--green`, `--gold` / `--silver` / `--bronze`
- Fuentes: `--pixel` (Press Start 2P) y `--mono` (JetBrains Mono)
- Clases listas para usar: `.btn` (con variantes), `.card`, `.crt` / `.crt-screen`, `.player-hud`, `.leaderboard` / `.lb-row`, `.modal`, `.chip`, `.reveal`, `.neon-*`
- **Portadas generadas 100 % en CSS**, sin imágenes: `.cover-rocas`, `.cover-tetro`, `.cover-bricks`, `.cover-snake`, etc.

Reglas: reutiliza estas clases, **no** escribas utilidades Tailwind nuevas ni crees archivos CSS por componente. Cada juego nuevo necesita su propia clase `.cover-*`.

## Convención para juegos en canvas

Patrón validado en `components/games/AsteroidsGame.tsx` y `components/games/TetrisGame.tsx`:

1. El componente vive en `components/games/<Nombre>Game.tsx`, lleva `"use client"` y extiende `BaseGameProps` de `components/games/types.ts` (`paused`, `onScoreChange`, `onGameOver`); añade callbacks propios si hace falta (`onLivesChange`, `onLevelChange`, `onLinesChange`…).
2. **Toda la lógica del juego vive dentro de un único `useEffect`**, y los props se leen a través de refs para que el game loop nunca se reinicie al re-renderizar.
3. La página lo carga con `next/dynamic` + `ssr: false` y renderiza el HUD en React.
4. El nombre del jugador se persiste en `localStorage['av_player_name']`.

## ⚠️ Zonas legacy — NO TOCAR

El repositorio arrastra una generación anterior del proyecto. **No leas, no edites ni "arregles" estos archivos**, y no los uses como referencia:

- Rutas en español `app/juegos/`, `app/jugar/`, `app/salon/` — **revientan en runtime** porque `components/session-provider.tsx` nunca se monta en el layout
- Componentes en kebab-case de `components/`: `session-provider.tsx`, `auth-card.tsx`, `library.tsx`, `game-card.tsx`, `game-cover.tsx`, `game-player.tsx`, `hall-of-fame.tsx`, y todo `components/home/`
- `app/data/*.ts` — archivos vacíos (0 bytes)
- `lib/games.ts`, `lib/home.ts`, `lib/scores.ts` — mocks de la versión anterior
- `lib/database.types.ts` — tipado generado obsoleto (no incluye `player_name` ni la tabla `games`). El tipado vigente es `lib/supabase/types.ts`
- `demos/*` — scratch de clase
- `references/` — prototipos y juegos fuente. Es material de **lectura** para `/add-game`, nunca destino de cambios
