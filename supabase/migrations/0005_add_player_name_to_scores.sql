-- Bugfix descubierto durante spec 07 (integracion de Tetris): el codigo de la
-- app (ScoreRow en lib/supabase/types.ts, y los inserts/lecturas de
-- app/games/*/play, app/games/[id]/page.tsx y app/hall-of-fame) asume una
-- columna scores.player_name que la migracion 0001 nunca creo. Como el
-- insert de la app nunca chequea el error de Supabase, el guardado de
-- puntuaciones venia fallando en silencio para todos los juegos (incluido
-- Asteroids) desde que se implemento spec 06.
alter table public.scores
  add column player_name text not null default 'JUGADOR';
