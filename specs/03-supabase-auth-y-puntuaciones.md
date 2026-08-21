# SPEC 03 — Supabase: autenticación real y puntuaciones persistidas

> **Estado:** aprobado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-08-21
> **Objetivo:** Sustituir la sesión simulada en `localStorage` y los rankings falsos de `seededScores()` por Supabase, con autenticación de correo y contraseña y una puntuación guardada por cada partida terminada.

---

## Por qué existe este spec

SPEC 01 y 02 entregaron las cinco pantallas con datos de maqueta. Tres cosas siguen siendo mentira:

1. **La sesión no existe.** `signIn(name)` de `lib/session.ts` no comprueba credenciales: escribe `{ name }` en la clave `av_user` de `localStorage` y cualquier texto entra al vault.
2. **Las puntuaciones se guardan y nadie las lee.** `appendScore()` escribe en `av_scores` y ninguna pantalla consulta esa clave. Los rankings de `/salon` y `/juegos/[id]` salen de `seededScores(seed, n)`, un generador determinista de nombres y números inventados.
3. **El proyecto de Supabase existe y está vacío.** El proyecto `bqywmtihsxtmjyrlnufo` no tiene ninguna tabla en el esquema `public`; solo los esquemas internos `auth`, `storage` y `realtime` que provisiona la plataforma.

Cuatro hechos técnicos condicionan cómo se implementa:

1. **Next 16 renombró `middleware.ts` a `proxy.ts`.** Toda la documentación pública de `@supabase/ssr` indica crear `middleware.ts` con `export function middleware`. En esta versión ese nombre está **deprecado**: el archivo es `proxy.ts` en la raíz y la función se exporta como `proxy` (o por defecto). Verificado en `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md` (*"has been deprecated in Next.js 16 and renamed to `proxy.js`"*) y en `.../03-file-conventions/proxy.md`. La firma y el objeto `config.matcher` no cambian.
2. **`cookies()` es asíncrona.** `const cookieStore = await cookies()`. Verificado en `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`. Los ejemplos de Supabase que llaman a `cookies()` sin `await` no compilan aquí.
3. **El MCP de Supabase es de solo lectura.** `.mcp.json` incluye `read_only=true` en la URL, así que ningún agente puede aplicar migraciones desde el editor. El esquema se aplica con la CLI de Supabase y queda versionado en el repo.
4. **El proyecto ya tiene una publishable key moderna** (`sb_publishable_...`) además de la `anon` legacy. Se usa la moderna.

---

## Alcance

**Dentro:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno en `.env.local`, con `.env.example` versionado como plantilla.
- Clientes de Supabase: `lib/supabase/client.ts` (navegador), `lib/supabase/server.ts` (Server Components y Server Actions) y `lib/supabase/proxy.ts` (refresco de sesión).
- `proxy.ts` en la raíz del repo, que refresca el token en cada navegación.
- Esquema versionado en `supabase/migrations/`: tablas `profiles` y `scores`, vista `game_rankings`, índices, políticas RLS y trigger de alta de perfil.
- Tipos de la base generados en `lib/database.types.ts`.
- `/auth` conectado a Supabase Auth: crear cuenta y entrar con correo y contraseña, con mensajes de error visibles.
- `SessionProvider` reescrito sobre `onAuthStateChange`, manteniendo la forma `{ name }` que ya consumen `nav.tsx`, `auth-card.tsx`, `game-player.tsx` y `hall-of-fame.tsx`.
- Modal de fin de partida: inserta la puntuación si hay sesión; si no, ofrece crear cuenta.
- `/salon` y el ranking de `/juegos/[id]` leyendo `game_rankings`, con estado vacío propio.
- «TU MEJOR MARCA» del salón calculada de verdad, en vez del `rows[5].score - 2400` actual.
- Limpieza de lo que queda muerto: `seededScores()`, las claves `av_user` y `av_scores`.
- Paso documentado con los ajustes exactos a tocar en el panel de Supabase.

**Fuera de alcance (para futuros specs):**

- OAuth con Google y GitHub. Los botones `◆ GOOGLE` y `▣ GITHUB` siguen inertes, como hoy.
- Magic link, recuperación de contraseña y cambio de contraseña.
- Confirmación de correo. Se desactiva en el panel; volver a activarla implica ruta de callback y pantalla intermedia, y eso va en su propio spec.
- Anonymous sign-in. «JUGAR COMO INVITADO» sigue siendo local y sin sesión de servidor.
- Migrar a Supabase las puntuaciones que algún navegador tenga hoy en `av_scores`. Se descartan.
- Editar el perfil o cambiar el nombre arcade después del registro.
- Tabla `games`. El catálogo sigue en `lib/games.ts` y `scores.game_id` es texto con `CHECK`.
- Datos reales en la home: el ticker «Actividad en vivo», el top de 5 jugadores y la franja de estadísticas siguen saliendo de `lib/home.ts`, y `best` y `plays` de cada tarjeta siguen fijos en `lib/games.ts`.
- Validación anti-trampa de puntuaciones.
- Juegos jugables de verdad. El reproductor sigue siendo una maqueta que produce un número.
- Realtime, avatares y almacenamiento de archivos.

---

## Modelo de datos

### Esquema en Postgres

```sql
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
```

Los ocho `game_id` del `CHECK` son exactamente los `id` de `GAMES` en `lib/games.ts`.

### Vista de rankings

Una fila por jugador y juego, con su mejor marca y la fecha en que la consiguió:

```sql
create view public.game_rankings with (security_invoker = on) as
select distinct on (s.game_id, s.user_id)
       s.game_id, s.user_id, p.display_name, s.score, s.created_at
from public.scores s
join public.profiles p on p.id = s.user_id
order by s.game_id, s.user_id, s.score desc, s.created_at asc;
```

`security_invoker = on` hace que la vista respete las políticas RLS de las tablas base en lugar de saltárselas.

### Políticas RLS

| Tabla      | Operación | Política                                              |
| ---------- | --------- | ----------------------------------------------------- |
| `profiles` | SELECT    | pública (`anon` y `authenticated`)                    |
| `profiles` | INSERT    | `auth.uid() = id`                                     |
| `profiles` | UPDATE    | `auth.uid() = id`                                     |
| `profiles` | DELETE    | ninguna política — nadie borra perfiles desde la API  |
| `scores`   | SELECT    | pública (`anon` y `authenticated`)                    |
| `scores`   | INSERT    | `auth.uid() = user_id`                                |
| `scores`   | UPDATE    | ninguna política — el historial es inmutable          |
| `scores`   | DELETE    | ninguna política                                      |

`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` en las dos tablas.

### Trigger de alta de perfil

```sql
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
```

El `upper` + `left(..., 10)` replica en la base la regla de `normalizeName()`: mayúsculas y diez caracteres como máximo.

### Tipos en TypeScript

`lib/database.types.ts` se genera con la CLI y no se edita a mano. Los tipos que consume la UI viven en `lib/scores.ts`:

```ts
export type RankingRow = {
  rank: number;          // posición calculada en el cliente, 1-based
  name: string;          // profiles.display_name
  score: number;
  date: string;          // created_at formateado como en SPEC 01
  isYou: boolean;        // para resaltar la fila del jugador
};
```

`lib/scores.ts` exporta `fetchRanking(client, gameId, limit)` y `submitScore(client, gameId, score)`.

### Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=https://bqywmtihsxtmjyrlnufo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`.gitignore` ignora `.env*`, así que hay que añadir la excepción `!.env.example` para poder versionar la plantilla.

---

## Plan de implementación

1. **Dependencias y entorno.** `npm i @supabase/supabase-js @supabase/ssr`. Crear `.env.local` con las dos variables y `.env.example` con las mismas claves y valores vacíos. Añadir `!.env.example` a `.gitignore`. Prueba manual: `npm run dev` arranca y `git status` no ofrece `.env.local`.
2. **Clientes de Supabase.** Crear `lib/supabase/client.ts` con `createBrowserClient` y `lib/supabase/server.ts` con `createServerClient` sobre `await cookies()`, envolviendo el `setAll` en `try/catch` porque los Server Components no pueden escribir cookies. Nada los usa todavía. Prueba manual: `npx tsc --noEmit` pasa.
3. **Refresco de sesión.** Crear `lib/supabase/proxy.ts` con la función que refresca el token, y `proxy.ts` en la raíz que la exporta con su `config.matcher` excluyendo `_next/static`, `_next/image` e imágenes. **Leer antes** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`: el archivo NO se llama `middleware.ts` en esta versión. Prueba manual: navegar entre `/`, `/juegos` y `/salon` sigue funcionando sin errores en consola.
4. **Migración del esquema.** `npx supabase init` y `npx supabase link --project-ref bqywmtihsxtmjyrlnufo`. Escribir `supabase/migrations/0001_profiles_scores.sql` con las dos tablas, el índice, RLS con sus políticas, el trigger y la vista. Aplicar con `npx supabase db push`. Prueba manual: el panel muestra `profiles`, `scores` y `game_rankings`.
5. **Tipos generados.** Volcar los tipos de la base a `lib/database.types.ts` y tipar los tres clientes con `Database`. Prueba manual: `npx tsc --noEmit` pasa y el autocompletado de `.from("scores")` conoce las columnas.
6. **Configuración del panel.** En *Authentication → Sign In / Providers → Email*: desactivar **Confirm email**. En *Authentication → URL Configuration*: `Site URL` a `http://localhost:3000`. Este paso lo ejecuta una persona: el MCP es de solo lectura y no debe dejar de serlo.
7. **SessionProvider sobre Supabase.** Reescribir `components/session-provider.tsx`: estado inicial con `getUser()`, suscripción con `onAuthStateChange`, y el `display_name` leído de `profiles`. El contexto sigue exponiendo `user: { name } | null`, más `loading`, y `signIn`/`signUp`/`signOut`/`saveScore` ahora asíncronos. Borrar `lib/session.ts`. Prueba manual: la barra muestra «INVITADO» y la consola no tiene errores.
8. **Pantalla de auth.** En `components/auth-card.tsx`, cambiar el campo `Usuario` de la pestaña de inicio de sesión por `Correo electrónico`, y en la de crear cuenta mandar el nombre arcade como `options.data.display_name`. Mostrar los errores de Supabase bajo el formulario y deshabilitar el botón mientras la petición está en vuelo. «JUGAR COMO INVITADO» llama a `signOut()` y navega a `/juegos`, igual que hoy. Prueba manual: crear una cuenta lleva a `/juegos`; una contraseña incorrecta muestra el error y no navega.
9. **Barra de navegación.** `components/nav.tsx` no cambia de forma, pero `signOut` es ahora asíncrono y debe llamarse con `await` antes de refrescar. Prueba manual: cerrar sesión devuelve la barra al estado de invitado.
10. **Guardar la puntuación.** En `components/game-player.tsx`, sustituir el input «TUS INICIALES» por el `display_name` del perfil en texto y llamar a `submitScore()`. Sin sesión, el modal muestra la puntuación y un botón «CREAR CUENTA PARA GUARDAR» que lleva a `/auth`. Prueba manual: terminar una partida con sesión inserta una fila en `scores`.
11. **Salón de la Fama.** En `components/hall-of-fame.tsx`, cambiar `seededScores()` por `fetchRanking()` en un efecto que se dispara con la pestaña activa. Con menos de tres marcas se oculta el podio; con cero se muestra el estado vacío «AÚN NO HAY MARCAS · SÉ EL PRIMERO». `youRank` y `youScore` salen de la fila del jugador en el ranking, o quedan a `null`. Prueba manual: `/salon` sin datos muestra el estado vacío y no rompe.
12. **Ranking del detalle.** En `app/juegos/[id]/page.tsx`, sustituir `seededScores(id.length * 23 + 7, 10)` por una consulta a `game_rankings` con el cliente de servidor, límite 10, y el mismo estado vacío. Prueba manual: `/juegos/caida` muestra las marcas reales o el estado vacío.
13. **Limpieza.** Borrar `seededScores()` y `ScoreRow` de `lib/games.ts` si ya no los usa nadie, y comprobar que las cadenas `av_user` y `av_scores` no aparecen en ningún archivo. Prueba manual: `grep -rn "seededScores\|av_scores\|av_user" app components lib` no devuelve nada.

---

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `git status` no ofrece `.env.local`, y `.env.example` sí está versionado.
- [ ] Existe `proxy.ts` en la raíz del repo. No existe ningún `middleware.ts`.
- [ ] `supabase/migrations/` contiene el `.sql` del esquema y está en git.
- [ ] Las tablas `profiles` y `scores` y la vista `game_rankings` existen en el proyecto.
- [ ] `profiles` y `scores` tienen RLS habilitado.
- [ ] Crear una cuenta en `/auth` con correo, contraseña y nombre inserta una fila en `auth.users` **y** una en `profiles`, sin pasar por el correo.
- [ ] El `display_name` guardado está en mayúsculas y tiene 10 caracteres o menos, aunque se escriba en minúsculas y más largo.
- [ ] Tras crear la cuenta, el navegador va a `/juegos` y la barra muestra el nombre del jugador.
- [ ] Cerrar sesión desde la barra devuelve el estado de invitado, y recargar la página lo mantiene.
- [ ] Iniciar sesión con una contraseña incorrecta muestra un mensaje de error en la tarjeta y no navega.
- [ ] Recargar `/juegos` con sesión iniciada mantiene la sesión.
- [ ] «JUGAR COMO INVITADO» sigue llevando a `/juegos` sin crear ninguna sesión.
- [ ] Con sesión, terminar una partida y pulsar «GUARDAR PUNTUACIÓN» inserta una fila en `scores` con el `user_id` del jugador.
- [ ] Sin sesión, el modal de fin de partida no muestra el input de iniciales y sí un botón que lleva a `/auth`.
- [ ] Esa puntuación aparece en `/salon` en la pestaña del juego correspondiente, con el nombre del jugador.
- [ ] Con la tabla `scores` vacía, `/salon` muestra «AÚN NO HAY MARCAS · SÉ EL PRIMERO» y no lanza ningún error de consola.
- [ ] Con una sola marca guardada, `/salon` no rompe: el podio de tres huecos no se renderiza.
- [ ] Si un jugador guarda dos puntuaciones en el mismo juego, aparece **una sola vez** en el ranking, con la más alta.
- [ ] `/juegos/caida` muestra el ranking real de ese juego, o su estado vacío.
- [ ] Un visitante sin sesión puede ver `/salon` y el ranking de `/juegos/[id]`.
- [ ] Un usuario autenticado no puede insertar una fila en `scores` con el `user_id` de otro: la petición falla por RLS.
- [ ] `grep -rn "seededScores\|av_scores\|av_user" app components lib` no devuelve resultados.
- [ ] La home sigue mostrando `12+`, `MILES` y `GLOBAL` en la franja de estadísticas, y el ticker con 7 filas.
- [ ] `/juegos/caida` sigue mostrando `184.220` y `31.8K` en sus estadísticas de cabecera.
- [ ] `/juegos` sigue mostrando las 8 tarjetas y el buscador funciona igual que antes.

---

## Decisiones

- **Sí:** un spec único con auth, puntuaciones y rankings, aunque toca cuatro dominios. Decidido a sabiendas de que sale largo: partirlo dejaría un spec intermedio con usuarios reales y rankings falsos, que es un estado peor que el actual.
- **Sí:** correo y contraseña. Es lo que el formulario del prototipo ya dibuja y no depende de configurar proveedores externos.
- **No:** OAuth de Google y GitHub por ahora. Los botones ya existen en la UI, pero exigen dar de alta credenciales en dos servicios externos: trabajo fuera del código y fuera de este spec.
- **No:** magic link. Quitaría el campo de contraseña y rompería la estética «ACCESO AL SISTEMA» del prototipo.
- **No:** confirmación de correo. «CREAR Y JUGAR» promete entrar de una; una pantalla de «revisa tu correo» la contradice. Cuando haga falta, se activa junto con su ruta de callback en otro spec.
- **Sí:** «JUGAR COMO INVITADO» se queda tal cual, sin sesión de Supabase. El invitado ve rankings y juega, pero no guarda.
- **No:** anonymous sign-in. Crearía usuarios reales en `auth.users` por cada visitante curioso y habría que decidir cómo se limpian.
- **Sí:** una fila por partida. Conserva el historial y deja la puerta abierta al ticker de actividad real, sin trigger que mantener.
- **No:** `UNIQUE(user_id, game_id)` con upsert de la mejor marca. Tabla más pequeña, pero se pierde el historial para siempre.
- **Sí:** vista `game_rankings` con `distinct on`. Un jugador con veinte partidas debe aparecer una vez en el ranking, y PostgREST no sabe agrupar así desde el cliente.
- **Sí:** `security_invoker = on` en la vista. Sin él, la vista se saltaría las políticas RLS de `scores` y `profiles`.
- **Sí:** el catálogo se queda en `lib/games.ts` y `scores.game_id` es texto con `CHECK`. Las portadas y colores están atados al CSS de SPEC 01, y mover el catálogo obligaría a reescribir `/juegos`, `/juegos/[id]` y la home, que son pantallas ya validadas.
- **No:** tabla `games` solo como catálogo de claves foráneas. La integridad que gana no compensa tener la lista de juegos duplicada en dos sitios.
- **Sí:** tabla `profiles` con trigger. `auth.users` no es consultable desde el cliente, y el ranking necesita mostrar el nombre de **otros** jugadores.
- **No:** guardar el nombre solo en `user_metadata`. Cero tablas nuevas, pero haría falta una vista o función igualmente para leer nombres ajenos.
- **No:** denormalizar `player_name` en cada fila de `scores`. Ranking sin joins, pero el historial se quedaría con nombres viejos si el jugador se renombra.
- **Sí:** rankings reales con estado vacío, sin sembrar datos de ejemplo. `/salon` se ve desnudo el primer día; meter puntuaciones ficticias en la base real crea el problema de decidir cuándo se borran.
- **No:** caer a `seededScores()` cuando la tabla está vacía. Mezclar marcas falsas y reales sin avisar al jugador es peor que una pantalla honesta y vacía.
- **Sí:** lectura pública de `scores` y `profiles`. Son apodos y números, y la home enlaza «VER SALÓN →» desde una página pública.
- **Sí:** insert desde el cliente con RLS. Un jugador puede inventar **su** puntuación, pero el reproductor todavía es una maqueta que produce números arbitrarios: no hay nada que proteger aún. Queda anotado como riesgo.
- **No:** Server Action o función RPC para el insert. Hoy no validarían nada que RLS no valide ya, y añaden superficie.
- **Sí:** `@supabase/ssr` con cookies y `proxy.ts`. `/juegos/[id]` es Server Component y así lee sesión y datos en el servidor, sin parpadeo tras hidratar.
- **Sí:** el contexto de sesión sigue exponiendo `user: { name } | null`. Mantener esa forma deja `components/nav.tsx` prácticamente intacto.
- **Sí:** el panel de Supabase lo configura una persona y el spec lo documenta paso a paso. El MCP sigue en `read_only=true`: ningún agente escribe en la base de producción.
- **No:** versionar los ajustes de auth en `supabase/config.toml`. Es más reproducible, pero un `config push` mal medido pisa ajustes hechos a mano en el panel.
- **Sí:** publishable key `sb_publishable_...` en vez de la `anon` legacy. Ambas están activas en el proyecto; la moderna se rota de forma independiente.
- **Sí:** borrar `seededScores()`, `av_user` y `av_scores`. Una sola fuente de verdad.
- **Sí:** la home se queda con datos de maqueta. SPEC 02 los declaró maqueta a propósito, y con la base vacía la landing —que es la página que se comparte— quedaría desierta.

---

## Riesgos

| Riesgo                                                                                          | Mitigación                                                                                                                                     |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Copiar de la documentación de Supabase un `middleware.ts`, que Next 16 ignora en silencio          | El paso 3 fija el nombre `proxy.ts` y obliga a leer antes `proxy.md`. Un criterio de aceptación comprueba que no existe ningún `middleware.ts`. |
| Los ejemplos de Supabase llaman a `cookies()` sin `await` y aquí no compilan                       | El paso 2 lo fija explícitamente. `npx tsc --noEmit` lo detecta antes de llegar al navegador.                                                    |
| El podio del salón indexa `rows[0..2]` y revienta con menos de tres marcas                         | El paso 11 oculta el podio por debajo de tres filas. Dos criterios de aceptación cubren el caso de cero y el de una.                              |
| Un jugador puede insertar la puntuación que quiera en su propio nombre                             | RLS impide escribir en nombre de otro, que es lo único defendible mientras el reproductor sea una maqueta. Se revisa cuando existan juegos reales. |
| La vista `game_rankings` se salta RLS si se crea sin `security_invoker`                            | Está en la definición del modelo de datos y es parte de la migración del paso 4.                                                                 |
| El trigger falla en el registro y deja un usuario en `auth.users` sin fila en `profiles`           | `security definer` con `search_path` vacío, y un criterio de aceptación comprueba que el alta crea las dos filas.                                |
| `.gitignore` ignora `.env*` y se traga también `.env.example`                                      | El paso 1 añade la excepción `!.env.example` y un criterio de aceptación comprueba que la plantilla está versionada.                             |
| Aplicar el esquema a mano deja el repo y la base desincronizados                                   | Todo el SQL vive en `supabase/migrations/` y se aplica con `supabase db push`. Nada de SQL suelto en el editor del panel.                         |
| Olvidar desactivar **Confirm email** deja el registro colgado sin ningún error visible              | Es el paso 6, con la ruta exacta del panel, y el criterio de aceptación del alta lo detecta de inmediato.                                         |

---

## Lo que **no** entra en este spec

- OAuth con Google y GitHub.
- Magic link, recuperar contraseña y cambiar contraseña.
- Confirmación de correo y su ruta de callback.
- Anonymous sign-in para el modo invitado.
- Migrar a Supabase las puntuaciones guardadas hoy en `localStorage`.
- Editar el perfil o cambiar el nombre arcade.
- Tabla `games` en la base.
- Ticker, top de jugadores, estadísticas de la home, `best` y `plays` con datos reales.
- Validación anti-trampa de puntuaciones.
- Juegos jugables de verdad.
- Realtime, avatares y almacenamiento de archivos.

Cada uno de ellos, si llega, va en su propio spec.
