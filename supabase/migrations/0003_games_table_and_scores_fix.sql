-- Catalogo de juegos (spec 06). Solo lectura desde la app; el alta de
-- juegos nuevos se hace a mano via SQL Editor de Supabase.
create table public.games (
  id         text primary key,
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER')),
  cover      text not null,
  color      text not null check (color in ('cyan','magenta','yellow','green')),
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "games are publicly readable"
  on public.games for select
  to anon, authenticated
  using (true);

insert into public.games (id, title, short, long, cat, cover, color)
values (
  'asteroids', 'ASTEROIDS', 'Pulveriza rocas en gravedad cero.',
  'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Supera niveles y acumula puntos antes de que los asteroides te alcancen.',
  'SHOOTER', 'cover-rocas', 'yellow'
);

-- La migracion 0001 restringia scores.game_id a los 8 placeholders previos
-- a Asteroids y exigia un user_id de un perfil autenticado. Spec 06 permite
-- jugar sin cuenta (user_id siempre null desde app/games/asteroids/play)
-- y valida game_id contra la tabla games real en lugar de una lista fija.
alter table public.scores drop constraint if exists scores_game_id_check;
alter table public.scores drop constraint if exists scores_user_id_fkey;

-- not valid: ya existe una fila de prueba con game_id = 'caida' (un
-- placeholder que spec 06 no migra a la tabla games), asi que no puede
-- validarse retroactivamente. Se exige igual para cualquier insert nuevo.
alter table public.scores
  add constraint scores_game_id_fkey foreign key (game_id)
    references public.games (id) not valid;

alter table public.scores alter column user_id drop not null;

drop policy if exists "users insert their own scores" on public.scores;

-- Spec 06 deja scores con INSERT publico (sin auth); se endurece en un
-- spec de seguridad futuro.
create policy "scores insert is public"
  on public.scores for insert
  to anon, authenticated
  with check (true);
