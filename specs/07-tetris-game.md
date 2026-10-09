# SPEC 07 — Integración del juego Tetris con leaderboard

> **Estado:** Implementado
> **Depende de:** 05-asteroids-game, 06-games-table-leaderboard-supabase
> **Fecha:** 2026-08-23
> **Objetivo:** Integrar Tetris (`references/started-games/03-tetris`) como juego jugable
> en `/games/tetris`, con leaderboard conectado a Supabase, siguiendo el mismo patrón
> validado con Asteroids.

---

## Scope

**In:**

- Migración `supabase/migrations/0004_add_tetris_game.sql` que inserta la fila `tetris`
  en `games`, aplicada con la tool MCP `mcp__supabase__apply_migration` (no a mano en
  el SQL Editor).
- Crear `components/games/types.ts` con un tipo base de props compartido
  (`BaseGameProps`). Es el segundo juego canvas de la plataforma — el disparador que
  spec 05 dejó anotado explícitamente para hacer esta extracción
  ("se extrae cuando llegue el segundo juego canvas").
- Refactor mínimo de `components/games/AsteroidsGame.tsx`: su interfaz
  `AsteroidsGameProps` pasa a extender `BaseGameProps` en vez de declarar `paused`,
  `onScoreChange` y `onGameOver` por su cuenta. Sin cambios de comportamiento.
- Crear `components/games/TetrisGame.tsx` — port de `game.js`, siguiendo el mismo
  contrato que `AsteroidsGame.tsx` (`'use client'`, un solo `<canvas>` de 300×600, toda
  la lógica dentro de un único `useEffect` de montaje, refs para leer siempre el último
  valor de props/callbacks sin reiniciar el efecto, cleanup de `requestAnimationFrame` y
  listeners al desmontar). Cambios respecto al original:
  - Se elimina el módulo de leaderboard local completo: `RECORDS_KEY`, `MAX_RECORDS`,
    `loadRecords`, `saveRecord`, `isTopScore`, `clearRecords`, `renderLeaderboard`, y
    toda su UI (`leaderboard-start`, `leaderboard-overlay`, `name-input-section`,
    `save-record-btn`, `clear-records-btn`) — el leaderboard real vive en Supabase.
  - Se elimina el manejo de HUD vía DOM (`scoreEl`/`linesEl`/`levelEl` con
    `.textContent`) — el original no dibuja HUD en el canvas (a diferencia de
    Asteroids), así que no hay overlay que conservar; los valores se exponen
    exclusivamente vía callbacks y el HUD vive enteramente en React.
  - Se elimina el listener de teclado para `KeyP`/`Escape` (pausa interna) y todo el
    overlay HTML de pausa/game-over (`pause-overlay`, `gameover-overlay`,
    `restart-btn`, `pause-restart-btn`, `resume-btn`) — la plataforma controla pausa y
    reinicio igual que en Asteroids (spec 05: "la plataforma controla la pausa vía
    prop").
  - Se conserva el **ghost piece** (`ghostY()` + dibujo con `globalAlpha: 0.2`) tal
    cual — es lógica de canvas pura, sin DOM ni dependencias externas.
  - Se conserva el **selector de skins** (Retro/Neon/Pastel/Pixel, objeto `SKINS`), pero
    pasa de un `<select>` propio del canvas a una prop controlada `skin` que la
    plataforma le pasa desde fuera.
  - Se conserva el **nivel inicial ajustable** (1–15), como prop `startLevel` que se lee
    solo al montar/remontar el componente (no altera una partida en curso).
  - Se descarta el toggle de tema claro/oscuro propio del juego (ver Decisions).
  - Callbacks expuestos: `onScoreChange`, `onLinesChange`, `onLevelChange`,
    `onGameOver` (heredado de `BaseGameProps`).
- Crear `app/games/tetris/play/page.tsx` — ruta **estática** nueva (no se toca la
  genérica `app/games/[id]/play/page.tsx`), con la misma estructura que
  `app/games/asteroids/play/page.tsx`:
  - `dynamic(() => import('@/components/games/TetrisGame'), { ssr: false })`.
  - `.player-hud` con Jugador / Puntuación / Líneas (reusando el slot `.hud-stat.lives`
    ya existente, solo cambia la etiqueta a "Líneas") / Nivel (slot `.hud-stat.level`
    sin cambios).
  - Un `<select>` de skin dentro de `.hud-actions`, junto a los botones
    PAUSA/FIN/SALIR ya existentes.
  - El overlay de pausa (`.crt-content`, hoy solo texto "EN PAUSA") se extiende con
    controles +/- para el nivel inicial (1–15), visibles únicamente mientras
    `paused` es `true` — mismo lugar que en el original (menú de pausa).
  - Modal de game over idéntico al patrón: prefill del nombre desde
    `localStorage.getItem('av_player_name')`, al guardar persiste el nombre e inserta
    `{ game_id: 'tetris', player_name, score, user_id: null }` en `scores` vía el
    cliente Supabase de browser, flag `saved` para evitar doble envío.
  - `restart()` vía remount del componente con `key` bumpeada, igual que Asteroids.
- La preferencia de skin se persiste en `localStorage` bajo la clave `av_tetris_skin`
  (namespaced con el prefijo `av_` que ya usan `av_player_name`/`av_user`, en vez de
  reusar la clave `tetris-skin` del original).

**Fuera de alcance (para specs futuros):**

- Canvas de "próxima pieza" (`next-canvas`, 120×120) — el layout de play-page (HUD +
  `.crt` + modal) no tiene un slot natural para un segundo canvas; se descarta para
  esta integración.
- Toggle de tema claro/oscuro propio del juego — la plataforma ya tiene su propio
  sistema de tema.
- RLS adicional, Realtime en los leaderboards, panel de administración de juegos —
  mismo alcance que spec 06, sin cambios.
- Cambios en `app/games/page.tsx`, `app/games/[id]/page.tsx` o `app/hall-of-fame/*` —
  ya son genéricos/data-driven, solo necesitan que exista la fila `tetris` en `games`.
- Cualquier cambio al árbol legado (`app/juegos`, `app/jugar`, `lib/games.ts`,
  `lib/database.types.ts`, `lib/scores.ts`) — no forma parte del patrón vivo.

---

## Data model

Fila nueva en `games` (vía la migración 0004):

```sql
insert into public.games (id, title, short, long, cat, cover, color)
values (
  'tetris', 'TETRIS', 'Encaja piezas y despeja líneas antes de que se acumulen.',
  'Bloques de siete formas caen desde el cielo de la pantalla. Rótalos, desplázalos y
   encástralos para completar líneas horizontales sin dejar huecos. La velocidad
   aumenta con cada nivel superado — sobrevive el mayor tiempo posible y hacé explotar
   tu puntuación.',
  'PUZZLE', 'cover-tetro', 'cyan'
);
```

`components/games/types.ts` (nuevo):

```ts
export interface BaseGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

`components/games/AsteroidsGame.tsx` — `AsteroidsGameProps` pasa a:

```ts
interface AsteroidsGameProps extends BaseGameProps {
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
}
```

`components/games/TetrisGame.tsx` — props nuevas:

```ts
interface TetrisGameProps extends BaseGameProps {
  onLinesChange: (lines: number) => void;
  onLevelChange: (level: number) => void;
  skin: 'retro' | 'neon' | 'pastel' | 'pixel';
  startLevel: number; // 1–15, se aplica solo al montar/remontar
}
```

No hay cambios en `GameRow`/`ScoreRow` (`lib/supabase/types.ts`) — la fila de Tetris
encaja en el modelo existente sin modificarlo.

---

## Implementation plan

1. Escribir y aplicar la migración `supabase/migrations/0004_add_tetris_game.sql` con
   `mcp__supabase__apply_migration`.
   Verificación: la fila `tetris` aparece en la tabla `games` de Supabase.
2. Crear `components/games/types.ts` con `BaseGameProps`; actualizar
   `AsteroidsGameProps` para extenderlo, sin tocar la lógica interna del componente.
   Verificación: `AsteroidsGame.tsx` sigue compilando y `/games/asteroids/play`
   funciona exactamente igual que antes.
3. Crear `components/games/TetrisGame.tsx` portando `game.js`: tablero, piezas,
   colisión, rotación con wall-kicks, clear de líneas, ghost piece, sistema de skins
   como prop controlada, nivel inicial como prop. Eliminar el módulo de records en
   localStorage, los atajos de teclado P/Escape, y todo el manejo DOM del HUD/overlays.
   Verificación: el juego es jugable montado en aislado, con teclado (flechas, X/↑
   rotar, espacio caída dura).
4. Crear `app/games/tetris/play/page.tsx`: HUD con Puntuación/Líneas/Nivel, selector de
   skin en `.hud-actions`, overlay de pausa extendido con el selector de nivel inicial,
   modal de game over con guardado a Supabase (`game_id: 'tetris'`).
   Verificación: el HUD React refleja los valores en tiempo real; PAUSA congela el
   loop; cambiar de skin cambia el render del tablero; el nivel inicial elegido se
   respeta al reiniciar la partida.
5. Smoke test manual en `/games`, `/games/tetris`, `/games/tetris/play`,
   `/hall-of-fame`.
   Verificación: la card de Tetris aparece junto a la de Asteroids; el detalle muestra
   el leaderboard (vacío al principio); una partida guarda el score y aparece en
   `/games/tetris` y `/hall-of-fame` al recargar.
6. `npm run build`.
   Verificación: cero errores de TypeScript, ninguna ruta existente rota.

---

## Acceptance criteria

- [ ] La fila `tetris` existe en la tabla `games` de Supabase con los valores
      acordados (título, textos, categoría `PUZZLE`, cover `cover-tetro`, color `cyan`).
- [ ] `components/games/types.ts` exporta `BaseGameProps` y es usado tanto por
      `AsteroidsGame.tsx` como por `TetrisGame.tsx`.
- [ ] `/games` muestra la card de Tetris junto a la de Asteroids.
- [ ] `/games/tetris` muestra los datos reales del juego y el leaderboard top 10
      (estado vacío la primera vez).
- [ ] `/games/tetris/play` carga sin errores de SSR ni de TypeScript y el juego es
      jugable con teclado.
- [ ] El ghost piece se dibuja correctamente durante la partida.
- [ ] El selector de skin cambia el render del tablero en tiempo real y persiste entre
      recargas vía `localStorage('av_tetris_skin')`.
- [ ] El HUD React de la plataforma refleja puntuación, líneas y nivel en tiempo real.
- [ ] El botón PAUSA/REANUDAR de la plataforma congela y reanuda el loop del juego.
- [ ] Mientras está en pausa, se puede ajustar el nivel inicial (1–15) para la próxima
      partida.
- [ ] Al perder (la pieza nueva colisiona al aparecer), aparece el modal React de game
      over con la puntuación final.
- [ ] El overlay HTML de game over y el leaderboard en `localStorage` del original ya
      no existen en el componente portado.
- [ ] El botón "JUGAR DE NUEVO" del modal reinicia la partida respetando el nivel
      inicial elegido.
- [ ] Al confirmar el nombre en el modal, el score se inserta en Supabase
      (`game_id: 'tetris'`) y aparece en `/games/tetris` y `/hall-of-fame` al recargar.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Extraer `components/games/types.ts` en este spec** — es el segundo juego
  canvas de la plataforma, exactamente el disparador que spec 05 dejó anotado para
  hacer esta extracción en vez de generalizar sin caso de uso confirmado.

- **Sí: Eliminar por completo el leaderboard local (`tetris_records` en
  `localStorage`)** — duplicaría al leaderboard real de Supabase y generaría dos
  fuentes de verdad inconsistentes entre sí.

- **Sí: Eliminar los atajos de teclado P/Escape para pausa interna** — consistente con
  la decisión ya tomada en spec 05 de que la plataforma controla la pausa vía prop, no
  el canvas.

- **Sí: Conservar el ghost piece** — es lógica de canvas pura (sin DOM, sin
  dependencias externas), parte central del feel de Tetris, no agrega superficie de
  riesgo ni complejidad de integración.

- **Sí: Conservar el selector de skins, como prop controlada** — pedido explícito del
  usuario; se adapta a prop en vez de `<select>` propio del canvas para mantener el
  patrón "el canvas no sabe nada de la plataforma" (spec 05).

- **Sí: Conservar el nivel inicial ajustable, expuesto en el overlay de pausa de la
  plataforma** — pedido explícito del usuario; se ubica en el mismo lugar (menú de
  pausa) que en el original en vez de inventar una ubicación nueva.

- **No: Canvas de "próxima pieza"** — el layout de play-page (HUD + `.crt` + modal) no
  tiene un slot natural para un segundo canvas; se descarta para esta integración y
  queda como candidato a un spec futuro si se pide explícitamente.

- **No: Toggle de tema claro/oscuro propio del juego** — la plataforma ya tiene su
  propio sistema de tema; un toggle independiente por juego generaría inconsistencia
  visual con el resto de Arcade Vault.

- **No: RLS adicional, Realtime, o panel de administración** — mismo alcance que spec
  06; sin cambios.

- **Sí: Migración adicional `0005_add_player_name_to_scores.sql` (fuera del plan
  original)** — durante el smoke test del Paso 5 se descubrió que la tabla `scores`
  nunca tuvo columna `player_name` (la migración 0001 no la creó), pese a que
  `lib/supabase/types.ts` (`ScoreRow`) y el código de guardado/lectura de leaderboard
  (Asteroids incluido) ya la daban por existente. Como el insert de la app nunca
  chequea el `error` de Supabase, el guardado de puntuaciones venía fallando en
  silencio para **todos** los juegos desde que se implementó spec 06 — el modal
  siempre mostraba "PUNTUACIÓN GUARDADA" aunque el insert real fallara. Se presentó
  el hallazgo al usuario, que aprobó arreglarlo en esta misma rama en vez de dejarlo
  roto: `alter table public.scores add column player_name text not null default
  'JUGADOR';`, aplicada vía `mcp__supabase__apply_migration`. Verificado
  end-to-end después del fix: el insert de Tetris se guarda y aparece en
  `/games/tetris` y `/hall-of-fame`.

---

## Lo que **no** está en este spec

- Vista previa de la próxima pieza.
- Tema claro/oscuro propio del juego.
- Cualquier cambio a `app/games/page.tsx`, `app/games/[id]/page.tsx`,
  `app/hall-of-fame/*`, o al árbol legado (`app/juegos`, `app/jugar`, `lib/games.ts`,
  `lib/database.types.ts`, `lib/scores.ts`).

Cada uno de estos, si se pide, va en su propio spec.
