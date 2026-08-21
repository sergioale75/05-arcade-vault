-- Perfil publico del jugador. El nombre arcade es el que se ve en los rankings.
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 10),
  created_at   timestamptz not null default now()
);

-- Una fila por partida terminada. Nunca se actualiza ni se borra.
create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  game_id    text not null check (game_id in (
               'bloque-buster','caida','serpentina','gloton',
               'invasores','rocas','ranaria','duelo-pixel')),
  score      integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index scores_ranking_idx on public.scores (game_id, score desc);

-- Una fila por jugador y juego, con su mejor marca y la fecha en que la consiguio.
create view public.game_rankings with (security_invoker = on) as
select distinct on (s.game_id, s.user_id)
       s.game_id, s.user_id, p.display_name, s.score, s.created_at
from public.scores s
join public.profiles p on p.id = s.user_id
order by s.game_id, s.user_id, s.score desc, s.created_at asc;

alter table public.profiles enable row level security;
alter table public.scores enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "users insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "scores are publicly readable"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "users insert their own scores"
  on public.scores for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Crea el perfil automaticamente al registrarse. El nombre arcade viene en
-- raw_user_meta_data.display_name (ver signUp en components/auth-card.tsx),
-- normalizado igual que normalizeName() en el cliente: mayusculas, 10 chars.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, upper(left(coalesce(
    new.raw_user_meta_data ->> 'display_name', 'PLAYER1'), 10)));
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
