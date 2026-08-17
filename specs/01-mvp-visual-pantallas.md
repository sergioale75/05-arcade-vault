# SPEC 01 — MVP visual: todas las pantallas de Arcade Vault

> **Estado:** implementado
> **Depende de:** —
> **Fecha:** 2026-08-16
> **Objetivo:** Implementar en Next.js las cinco pantallas del prototipo de `references/templates/` (biblioteca, detalle, reproductor CRT, auth y salón de la fama) como maqueta visual navegable, sin ningún juego real ni backend.

---

## Por qué existe este spec

El repositorio es hoy un `create-next-app` vacío. Existe un prototipo completo en `references/templates/`, escrito como SPA de React 18 vía CDN con Babel en el navegador, CSS plano y enrutado por hash. Este spec traslada ese prototipo al stack real del proyecto (Next.js 16 App Router, React 19, TypeScript estricto, Tailwind v4) conservando la fidelidad visual.

Dos hechos del prototipo condicionan el trabajo y quedan registrados aquí:

1. **Los nombres de archivo en `references/templates/` no corresponden a su contenido.** El mapeo real es:

   | Archivo en disco    | Contenido real                               |
   | ------------------- | -------------------------------------------- |
   | `app.jsx`           | el `index.html` del prototipo                |
   | `Arcade Vault.html` | `biblioteca.jsx` (`GameCard`, `Library`)     |
   | `auth.jsx`          | `nav.jsx` (`Nav`)                            |
   | `biblioteca.jsx`    | `data.jsx` (`GAMES`, `CATS`, `seededScores`) |
   | `data.jsx`          | `styles.css` (el tema completo)              |
   | `detalle.jsx`       | `auth.jsx` (`Auth`)                          |
   | `nav.jsx`           | `app.jsx` (`App`, enrutado y sesión)         |
   | `salon.jsx`         | `reproductor.jsx` (`GamePlayer`)             |
   | `styles.css`        | `salon.jsx` (`HallOfFame`)                   |

   Al implementar hay que abrir el archivo por su **contenido**, no por su nombre.

2. **La pantalla de detalle no tiene código fuente en el prototipo.** Solo existen sus estilos (`.av-detail`, `.detail-cover`, `.detail-info`, `.detail-tags`, `.stat-strip`, `.detail-actions`, `.leaderboard`, `.lb-row`) y su contrato de ruta en `App` (`<GameDetail id={route.id} navigate={navigate} />`). Se reconstruye a partir de esas clases.

---

## Alcance

**Dentro:**

- Tema visual completo portado de `styles.css` a `app/globals.css`, con los colores expuestos como tokens `@theme` de Tailwind v4.
- Fondo global: rejilla en perspectiva animada, scanlines, ruido SVG y viñeta (`.av-bg`, `.av-noise`).
- Barra de navegación pegajosa con logo, enlaces activos, contador de créditos estático, botón de sesión y panel lateral móvil con backdrop.
- Pie de página fijo con el texto del prototipo.
- **Biblioteca** (`/`): hero con parpadeo, buscador por nombre, chips de categoría, rejilla de tarjetas con efecto tilt 3D y estado vacío.
- **Detalle de juego** (`/juegos/[id]`): portada grande, título, tags, descripción larga, franja de tres estadísticas, botones de acción y leaderboard lateral con top 1/2/3 coloreados.
- **Reproductor** (`/jugar/[id]`): HUD con jugador, puntuación, vidas y nivel; carcasa CRT con arena falsa animada; pausa; modal de fin de partida con guardado de puntuación y toast de máquina de escribir.
- **Auth** (`/auth`): tarjeta con pestañas iniciar sesión / crear cuenta, campos, botón de invitado, separador y botones sociales decorativos.
- **Salón de la Fama** (`/salon`): pestañas por juego, podio de tres puestos y tabla de 12 filas con animación escalonada; fila destacada del usuario cuando hay sesión.
- Las ocho portadas generadas por CSS puro (`cover-bricks`, `cover-tetro`, `cover-snake`, `cover-glot`, `cover-invaders`, `cover-rocas`, `cover-rana`, `cover-duelo`).
- Datos mock tipados en `lib/games.ts`.
- Sesión mock persistida en `localStorage` bajo las claves `av_user` y `av_scores`.
- Diseño responsive con los mismos puntos de corte del prototipo (840px y 900px/720px).

**Fuera de alcance (para futuros specs):**

- Juegos reales jugables. El reproductor es una maqueta: la puntuación sube sola por intervalo.
- Backend, base de datos y autenticación real. Los botones de Google y GitHub no hacen nada.
- Ranking global real. Los rankings se generan con `seededScores`.
- Sistema de créditos funcional. El contador `CRÉDITOS · 03` es texto fijo.
- Tests automatizados. No se instala runner en este spec.
- Perfil de usuario, ajustes, logros y multijugador.

---

## Modelo de datos

Todo vive en `lib/games.ts`, portado de `data.jsx` (contenido real de `references/templates/biblioteca.jsx`).

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Accent = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;        // "bloque-buster"
  title: string;     // "BLOQUE BUSTER"
  short: string;     // texto de la tarjeta
  long: string;      // texto de la pantalla de detalle
  cat: Category;
  cover: string;     // clase CSS: "cover-bricks"
  color: Accent;     // acento del botón JUGAR
  best: number;      // 28450
  plays: string;     // "12.4K"
};

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;      // "07/03/2026"
};
```

Exporta: `GAMES` (los 8 juegos, con los valores exactos del prototipo), `CATS` (`["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]`), `seededScores(seed: number, count = 12): ScoreRow[]` (mismo LCG `s = (s * 9301 + 49297) % 233280`) y `getGame(id: string): Game | undefined`.

Sesión mock, en `lib/session.ts`:

```ts
export type User = { name: string };            // máx. 10 caracteres, mayúsculas
export type SavedScore = { game: string; score: number; name: string; at: number };
```

Claves de `localStorage`: `av_user` (objeto `User` o ausente) y `av_scores` (array de `SavedScore`). Sin versionado: son datos desechables de maqueta y se pueden borrar sin consecuencias.

---

## Plan de implementación

1. **Portar el tema.** Copiar el CSS del prototipo (contenido real de `references/templates/data.jsx`) a `app/globals.css`, después de `@import "tailwindcss"`. Declarar los colores del prototipo como tokens en un bloque `@theme` y hacer que las variables `:root` existentes los referencien, de modo que los utilitarios de Tailwind y el CSS portado compartan paleta. Prueba manual: `npm run dev` y ver el fondo oscuro con rejilla animada.
2. **Fuentes y layout raíz.** En `app/layout.tsx`, cargar `Press_Start_2P` y `JetBrains_Mono` con `next/font/google`, exponerlas como variables CSS `--pixel` y `--mono`, y renderizar los `div.av-bg` y `div.av-noise` más el pie de página. Consultar antes `node_modules/next/dist/docs/01-app/` para la API de metadata y layout de esta versión. Prueba manual: los textos pixel se ven con Press Start 2P.
3. **Datos mock.** Crear `lib/games.ts` con los tipos, `GAMES`, `CATS`, `seededScores` y `getGame`.
4. **Sesión mock.** Crear `lib/session.ts` con las funciones de lectura/escritura de `av_user` y `av_scores`, y `components/session-provider.tsx`: un contexto cliente que hidrata desde `localStorage` en un efecto y expone `{ user, signIn, signOut, saveScore }`. Montarlo en el layout raíz. Leer en efecto, nunca durante el render, para no romper la hidratación.
5. **Navegación.** Crear `components/nav.tsx` (cliente) portando `Nav`: enlaces con `next/link`, estado activo derivado de `usePathname()` (`/juegos/*` marca «Biblioteca» como activo), contador de créditos, botón de sesión y panel móvil. Montarlo en el layout raíz. Prueba manual: navegar entre `/` y `/salon` y ver el subrayado de neón moverse.
6. **Portadas.** Crear `components/game-cover.tsx`, un componente que recibe la clase de portada y renderiza `<div className={"cover-bg " + cover} />`. Las ocho variantes ya vienen en el CSS del paso 1.
7. **Biblioteca.** Crear `app/page.tsx` con la rejilla y `components/game-card.tsx` (cliente, con el tilt 3D por `onMouseMove`). El buscador y los chips viven en un componente cliente con `useState` y `useMemo`. Cada tarjeta enlaza a `/juegos/[id]`. Incluir el estado «NO HAY RESULTADOS». Prueba manual: buscar «cai» deja una sola tarjeta.
8. **Detalle.** Crear `app/juegos/[id]/page.tsx`: portada grande, `h2` con el título, tags (categoría y partidas), `long`, `stat-strip` con **MEJOR PUNTUACIÓN** (`best`), **PARTIDAS** (`plays`) y **CATEGORÍA** (`cat`), botones «JUGAR AHORA» (a `/jugar/[id]`) y «VOLVER» (a `/`), y leaderboard con `seededScores(id.length * 23 + 7, 10)`. Devolver `notFound()` si el id no existe. Prueba manual: `/juegos/rocas` muestra ROCAS y `/juegos/xxx` da 404.
9. **Reproductor.** Crear `app/jugar/[id]/page.tsx` y `components/game-player.tsx` (cliente) portando `GamePlayer`: HUD, arena CRT falsa, intervalo de 220 ms que suma entre 10 y 99 puntos, subida de nivel cada 2500 puntos, pausa, botón FIN y modal de fin de partida con input de nombre, guardado en `av_scores` y toast de máquina de escribir. Prueba manual: la puntuación sube, PAUSA la congela, FIN abre el modal.
10. **Auth.** Crear `app/auth/page.tsx` y `components/auth-card.tsx` (cliente) portando `Auth`: pestañas, campos (el correo aparece solo en «CREAR CUENTA» con `slide-in`), envío que llama a `signIn({ name })` con el valor en mayúsculas recortado a 10 caracteres y redirige a `/`, botón «JUGAR COMO INVITADO» que limpia la sesión y redirige, separador y botones sociales inertes. Prueba manual: entrar como `px_kai` y ver `PX_KAI ▾` en la barra.
11. **Salón de la Fama.** Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (cliente) portando `HallOfFame`: pestañas por juego, podio 2-1-3 y tabla de 12 filas con `animationDelay` escalonado. Si hay sesión, añadir la etiqueta «▸ TU MEJOR MARCA EN …» y la fila `.you`. Prueba manual: cambiar de pestaña recalcula el ranking.
12. **Repaso responsive.** Verificar los tres anchos del prototipo (>900px, 840px y <720px): la barra colapsa en hamburguesa, el detalle pasa a una columna y el podio se apila.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de lint.
- [ ] `/` muestra las 8 tarjetas de juego con sus portadas CSS distintas entre sí.
- [ ] Escribir «serp» en el buscador de `/` deja exactamente una tarjeta visible.
- [ ] Pulsar el chip `PUZZLE` deja exactamente una tarjeta visible.
- [ ] Una búsqueda sin coincidencias muestra el bloque «NO HAY RESULTADOS».
- [ ] Pulsar una tarjeta navega a `/juegos/<id>` y la URL es compartible (recargar mantiene la pantalla).
- [ ] `/juegos/caida` muestra el título CAÍDA, su descripción larga, la franja con `184.220`, `31.8K` y `PUZZLE`, y 10 filas de leaderboard con los puestos 1, 2 y 3 en oro, plata y bronce.
- [ ] `/juegos/no-existe` devuelve la página 404 de Next.
- [ ] En `/jugar/<id>` la puntuación aumenta sola; pulsar PAUSA la detiene y muestra el cartel «EN PAUSA»; pulsar REANUDAR la reactiva.
- [ ] Pulsar FIN en `/jugar/<id>` abre el modal con la puntuación final; guardar muestra el toast «▸ PUNTUACIÓN GUARDADA_» y añade una entrada a `av_scores` en localStorage.
- [ ] «JUGAR DE NUEVO» reinicia puntuación a 0, vidas a 3 y nivel a 01.
- [ ] Enviar el formulario de `/auth` con el usuario `px_kai` guarda `{"name":"PX_KAI"}` en `av_user`, redirige a `/` y la barra muestra `PX_KAI ▾`.
- [ ] Recargar la página con sesión iniciada mantiene el nombre en la barra sin error de hidratación en consola.
- [ ] Pulsar el botón de usuario en la barra cierra sesión y borra `av_user`.
- [ ] `/salon` muestra el podio con los puestos 02, 01 y 03 y una tabla de 12 filas; cambiar de pestaña de juego cambia los nombres y puntuaciones.
- [ ] Con sesión iniciada, `/salon` añade la etiqueta «▸ TU MEJOR MARCA EN …» y una fila amarilla con el nombre del usuario.
- [ ] A 800px de ancho, los enlaces de la barra se ocultan y el botón hamburguesa abre el panel lateral.
- [ ] A 800px de ancho, `/juegos/<id>` se apila en una sola columna.
- [ ] La consola del navegador no muestra errores ni advertencias de React en ninguna de las cinco pantallas.

---

## Decisiones

- **Sí:** portar `styles.css` casi tal cual a `app/globals.css` con tokens `@theme`. Los efectos de neón, la carcasa CRT, las scanlines y las ocho portadas generativas son CSS muy específico; reescribirlos como utilidades multiplicaría el trabajo y la probabilidad de perder fidelidad.
- **No:** traducir todo el prototipo a utilidades Tailwind. Descartado por coste y riesgo visual.
- **Sí:** rutas reales del App Router (`/`, `/juegos/[id]`, `/jugar/[id]`, `/auth`, `/salon`). URLs compartibles y recargables, y es lo que el stack espera.
- **No:** replicar el enrutado por hash con un objeto serializado en `location.hash`. Era una limitación del prototipo sin build, no un requisito.
- **Sí:** incluir el reproductor CRT como maqueta con puntuación simulada. Es una de las pantallas del prototipo y no implica programar ningún juego.
- **Sí:** sesión mock persistida en `localStorage` con las mismas claves del prototipo (`av_user`, `av_scores`). Permite ver los estados «con sesión» de la barra y del salón sin backend.
- **No:** versionar el esquema de `localStorage`. Son datos de maqueta; si el formato cambia, se borran.
- **Sí:** `next/font/google` en lugar de `<link>` a Google Fonts. Autoalojado, sin petición externa en runtime y sin salto de layout.
- **Sí:** datos mock en un módulo TypeScript tipado (`lib/games.ts`), no en Route Handlers ni JSON estático. Tipado real e importable desde Server Components sin fetch.
- **Sí:** tercera estadística del detalle = categoría. Usa un campo que ya existe en el modelo; no hay que inventar dificultad ni datos nuevos.
- **Sí:** hidratar la sesión en un efecto, no durante el render. Leer `localStorage` en el primer render rompe la hidratación en React 19.
- **No:** convertir cada pantalla en Server Component puro. Biblioteca, reproductor, auth y salón necesitan estado; solo el layout de detalle se resuelve en servidor.

---

## Riesgos

| Riesgo                                                                 | Mitigación                                                                                                       |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Los nombres de archivo del prototipo no coinciden con su contenido      | Tabla de mapeo en la sección «Por qué existe este spec». Abrir por contenido, no por nombre.                       |
| La pantalla de detalle no tiene código de referencia                    | Se reconstruye desde las clases CSS existentes y el contrato de ruta; los tres stats quedan fijados en el paso 8.  |
| Desajuste de hidratación al leer `localStorage`                        | El proveedor de sesión arranca en `null` y rellena en `useEffect`; la barra renderiza el estado invitado primero.  |
| Next 16 tiene cambios de API respecto al conocimiento previo            | Los pasos 2 y 8 obligan a leer `node_modules/next/dist/docs/01-app/` antes de escribir rutas o metadata.           |
| Colisión de nombres entre el CSS portado y los utilitarios de Tailwind  | Todas las clases del prototipo llevan prefijo propio (`av-`, `cover-`, `hud-`, `lb-`) o son nombres no genéricos.  |
| Las animaciones de fondo consumen CPU en equipos modestos               | Son transformaciones CSS sin JavaScript; si molestan, se acota en otro spec con `prefers-reduced-motion`.          |

---

## Lo que **no** entra en este spec

- Ningún juego real ni motor de juego.
- Backend, base de datos, autenticación real u OAuth.
- Ranking global persistente entre usuarios.
- Sistema de créditos funcional.
- Perfil de usuario, ajustes, logros y multijugador.
- Tests automatizados.

Cada uno de ellos, si llega, va en su propio spec.
