# SPEC 02 — Home: landing de Arcade Vault

> **Estado:** Approved
> **Depende de:** SPEC 01
> **Fecha:** 2026-08-17
> **Objetivo:** Implementar la landing del prototipo `references/templates/home-about/` como ruta raíz del sitio, moviendo la biblioteca a `/juegos`.

---

## Por qué existe este spec

SPEC 01 dejó la biblioteca en `/`. El prototipo actualizado introduce una landing y relega la biblioteca a una ruta propia: en su `app.jsx` la ruta por defecto pasa a ser `home`, y la barra de navegación gana los enlaces «Inicio» y «Acerca de».

Tres hechos del material de referencia condicionan el trabajo:

1. **Los archivos de `references/templates/home-about/` vuelven a tener los nombres intercambiados**, y uno de ellos (`nav (1).jsx`, 1.5 MB) es en realidad un HTML autoextraíble que empaqueta el prototipo completo en base64 comprimido. Descomprimirlo da los fuentes con sus nombres correctos. El mapeo de la carpeta tal cual está en disco es:

   | Archivo en disco               | Contenido real                                  |
   | ------------------------------ | ----------------------------------------------- |
   | `about.jsx`                    | la hoja de estilos completa (1744 líneas)       |
   | `arcade-vault-standalone.html` | una imagen WEBP                                 |
   | `download (1) (1)`             | `about.jsx` (`About`)                           |
   | `home.jsx`                     | `nav.jsx` (`Nav` con cuatro enlaces)            |
   | `nav (1).jsx`                  | bundle autoextraíble con todo el prototipo      |
   | `styles (1).css`               | un `.DS_Store` de macOS                         |

2. **La hoja de estilos nueva es aditiva.** Diffeada contra la de SPEC 01, las secciones existentes son idénticas carácter a carácter; solo se añaden bloques nuevos al final. Portar el CSS de la home no altera ninguna pantalla ya entregada.

3. **Las demás pantallas no cambian.** `biblioteca.jsx`, `salon.jsx`, `reproductor.jsx`, `auth.jsx` y `data.jsx` del bundle son byte a byte idénticos a los de SPEC 01. El único componente existente que cambia es `nav.jsx`.

---

## Alcance

**Dentro:**

- **Home** en `/`, con las seis secciones del prototipo:
  - Hero con eyebrow parpadeante, título a tres líneas, subtítulo, dos CTAs e indicador de scroll.
  - Ocho siluetas SVG pixeladas flotando en el hero (`.home-silos`, animación `float` con retardos escalonados).
  - «¿Por qué Arcade Vault?»: cuatro tarjetas con icono SVG pixelado y acento de color propio.
  - «Juegos disponibles ahora»: carrusel de los 6 primeros juegos de `GAMES` con enlace al detalle.
  - Franja de tres estadísticas.
  - «Actividad en vivo»: ticker de últimas puntuaciones y top de 5 jugadores con barra de progreso.
  - «Precios»: tarjeta de plan gratuito con sello y tres preguntas frecuentes.
  - CTA final.
- Animación de aparición al hacer scroll (`.reveal` → `.reveal.in`) con `IntersectionObserver`, portada del prototipo.
- **Biblioteca movida a `/juegos`**, conservando su hero, buscador, chips y rejilla tal cual.
- Actualización de los enlaces internos que hoy apuntan a `/` y deben ir a `/juegos`: «VOLVER» del detalle, «VOLVER AL VAULT» del reproductor, «VOLVER A LA BIBLIOTECA» del salón y los dos destinos post-login de la pantalla de auth.
- Barra de navegación con el enlace «Inicio», el logo apuntando a `/` y los estados activos recalculados.
- Datos de maqueta de la home tipados en `lib/home.ts`.
- `metadata` propia para `/` y `/juegos`.
- Tres bloques de CSS portados a `app/globals.css`: `HOME PAGE` (líneas 930–1070 del original, incluye `.reveal`), `ACTIVITY` (1621–1671) y `PRICING` (1672–1744).

**Fuera de alcance (para futuros specs):**

- Pantalla «Acerca de» y su formulario de contacto. El enlace no se añade a la barra de navegación hasta que exista la página.
- Mando virtual (`GAMEPAD`) y sus variantes de color (`Theme variants`) del CSS nuevo: son un rediseño del reproductor.
- Alinear la pantalla de detalle con el `detalle.jsx` que ahora aparece en el bundle. Difiere del que reconstruimos en SPEC 01 (cuatro tags, stats *Partidas / Mejor global / Dificultad ★★★☆☆*, semilla `id.length * 17 + 3`) y cambiarlo rompería criterios ya validados.
- Actividad real. El ticker y el top de jugadores son texto fijo.
- Juegos jugables, backend y autenticación real, ya excluidos en SPEC 01.

---

## Modelo de datos

Los datos de juego siguen viniendo de `lib/games.ts`, sin cambios. Este spec añade `lib/home.ts` con el contenido de maqueta que en el prototipo estaba escrito a mano dentro del JSX:

```ts
import type { Accent } from "@/lib/games";

export type Feature = {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  title: string;
  desc: string;
  color: Accent;              // clase de acento de la tarjeta
};

export type StatBlock = { n: string; u: string; s: string };   // "12+", "JUEGOS", "Y CONTANDO"

export type TickerRow = {
  player: string;
  game: string;
  score: number;
  ago: string;                // "hace 2 min"
  color: Accent;              // clase neon-* del nombre
};

export type TopRow = { rank: number; player: string; score: number };

export type FaqItem = { q: string; a: string };
```

Exporta `FEATURES` (4), `STATS` (3), `TICKER` (7), `TOP_TODAY` (5), `PRICING_PERKS` (6 strings) y `FAQ` (3), con los textos exactos del prototipo.

`HOME_PREVIEW_COUNT = 6` fija cuántos juegos entran en el carrusel; los juegos salen de `GAMES.slice(0, HOME_PREVIEW_COUNT)`.

---

## Plan de implementación

1. **Portar el CSS de la home.** Añadir a `app/globals.css` los bloques `HOME PAGE`, `ACTIVITY` y `PRICING` de la hoja nueva, sin tocar lo existente. Excluir `ABOUT PAGE`, `GAMEPAD` y `Theme variants`. Prueba manual: `.reveal` y `.home-hero` aparecen en el CSS servido.
2. **Datos de la home.** Crear `lib/home.ts` con los tipos y las seis constantes.
3. **Biblioteca en `/juegos`.** Crear `app/juegos/page.tsx` renderizando `<Library />`. En este paso `/` y `/juegos` muestran ambas la biblioteca, así que nada se rompe. Prueba manual: `/juegos` lista los 8 juegos.
4. **Enlaces internos.** Apuntar a `/juegos` el botón «VOLVER» de `app/juegos/[id]/page.tsx`, «VOLVER AL VAULT» de `components/game-player.tsx`, «VOLVER A LA BIBLIOTECA» de `components/hall-of-fame.tsx` y los dos destinos de `components/auth-card.tsx` (entrar y jugar como invitado). Prueba manual: desde el salón se vuelve a `/juegos`.
5. **Piezas visuales de la home.** Crear `components/home/reveal.tsx` (cliente, envuelve a sus hijos y les añade `.in` con `IntersectionObserver`), `components/home/floating-silhouettes.tsx` (los 8 SVG), `components/home/feature-icon.tsx` (los 4 iconos) y `components/home/mini-card.tsx` (tarjeta del carrusel, enlaza al detalle).
6. **Componer la home.** Crear `components/home/home.tsx` con las seis secciones y el CTA final, y sustituir el contenido de `app/page.tsx` por ella. Prueba manual: `/` muestra la landing y `/juegos` sigue mostrando la biblioteca.
7. **Barra de navegación.** Añadir el enlace «Inicio» en la barra y en el panel móvil, apuntar el logo a `/`, y recalcular los activos: «Inicio» solo en `/`, «Biblioteca» en `/juegos` y sus subrutas más `/jugar/*`. Prueba manual: navegar entre las tres rutas y ver el subrayado moverse.
8. **Metadata.** Añadir `export const metadata` en `app/page.tsx` y `app/juegos/page.tsx`. Consultar antes `node_modules/next/dist/docs/01-app/` para la API de esta versión.
9. **Repaso responsive.** Verificar los cortes propios de la home: el carrusel pasa a 3 columnas a 1100px, la franja de estadísticas y las tarjetas de característica se apilan a 720px, y la rejilla de actividad pasa a una columna a 900px.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/` muestra la landing con el título a tres líneas «EL ARCADE / CLÁSICO ESTÁ / DE VUELTA».
- [ ] El hero de `/` contiene 8 siluetas SVG (`.home-silos .silo`).
- [ ] «EXPLORAR JUEGOS» navega a `/juegos`; «CREAR CUENTA» navega a `/auth`.
- [ ] La sección «¿Por qué Arcade Vault?» muestra exactamente 4 tarjetas, cada una con su icono SVG.
- [ ] El carrusel muestra exactamente 6 tarjetas y la primera enlaza a `/juegos/bloque-buster`.
- [ ] «VER TODOS LOS JUEGOS →» navega a `/juegos`.
- [ ] La franja de estadísticas muestra `12+`, `MILES` y `GLOBAL`.
- [ ] El ticker muestra 7 filas y el top de jugadores 5, con las tres primeras marcadas `top1`, `top2` y `top3`.
- [ ] «VER SALÓN →» navega a `/salon`.
- [ ] La sección de precios muestra `$0`, seis ítems en la lista y tres preguntas frecuentes.
- [ ] Al cargar `/`, las secciones fuera de pantalla tienen `opacity: 0`; tras hacer scroll hasta ellas ganan la clase `in` y quedan visibles.
- [ ] `/juegos` muestra las 8 tarjetas, el buscador y los chips, igual que antes hacía `/`.
- [ ] Buscar «serp» en `/juegos` deja exactamente una tarjeta.
- [ ] `/juegos/caida` sigue mostrando `184.220`, `31.8K` y `PUZZLE`.
- [ ] El botón «VOLVER» del detalle lleva a `/juegos`.
- [ ] «VOLVER AL VAULT» del modal de fin de partida lleva a `/juegos`.
- [ ] «VOLVER A LA BIBLIOTECA» del salón lleva a `/juegos`.
- [ ] Entrar desde `/auth` lleva a `/juegos`, y «JUGAR COMO INVITADO» también.
- [ ] La barra muestra tres enlaces: Inicio, Biblioteca y Salón de la Fama. No hay enlace «Acerca de».
- [ ] En `/` el enlace activo es «Inicio»; en `/juegos`, `/juegos/caida` y `/jugar/caida` es «Biblioteca».
- [ ] El logo de la barra navega a `/`.
- [ ] La pestaña del navegador muestra títulos distintos en `/` y en `/juegos`.
- [ ] A 1100px de ancho el carrusel se reorganiza en 3 columnas.
- [ ] A 720px la franja de estadísticas se apila en una columna.
- [ ] A 900px la rejilla de actividad se apila en una columna.
- [ ] La consola del navegador no muestra errores ni advertencias en `/` ni en `/juegos`.

---

## Decisiones

- **Sí:** la home vive en `/` y la biblioteca pasa a `/juegos`. Es la jerarquía que Next espera, con `/juegos` como índice de la ruta `/juegos/[id]` que ya existe.
- **No:** `/biblioteca`. Coincidiría con la etiqueta de la barra, pero dejaría `/juegos/[id]` sin página padre.
- **No:** dejar la biblioteca en `/` y poner la landing en `/inicio`. Contradice el prototipo, donde la landing es la puerta de entrada.
- **Sí:** implementar sobre `main` una vez mergeado el PR #3. Este spec mueve `app/page.tsx`, que es justo el archivo que aquel PR crea; encadenar ramas garantizaría conflictos.
- **Sí:** solo la home en este spec. «Acerca de» va en el suyo, con su formulario de contacto.
- **No:** añadir ya el enlace «Acerca de» a la barra. Un enlace a un 404 es peor que un enlace ausente.
- **Sí:** datos de maqueta en `lib/home.ts` tipados, siguiendo el criterio de `lib/games.ts` en SPEC 01.
- **No:** generar el ticker y el top de jugadores con `seededScores`. Sería más coherente, pero los textos del prototipo («hace 2 min», nombres concretos por juego) se perderían.
- **Sí:** `metadata` propia en `/` y `/juegos`. La landing es la página que se comparte.
- **No:** tocar la pantalla de detalle pese a que el bundle trae ahora su fuente original. Cambiarla rompe criterios ya validados de SPEC 01 y no tiene relación con la home.
- **Sí:** `.reveal` como componente cliente que envuelve secciones. El resto de la home es estático y se queda en Server Components.
- **No:** convertir toda la home en un componente cliente. Solo la animación de scroll necesita el navegador.

---

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Los nombres de archivo de `home-about/` no corresponden a su contenido      | Tabla de mapeo arriba. Los fuentes buenos se obtienen descomprimiendo el bundle de `nav (1).jsx`.                  |
| Mover la biblioteca deja enlaces internos apuntando a `/`                   | El paso 4 los enumera uno a uno y los criterios de aceptación comprueban los cinco destinos.                       |
| El CSS nuevo pisa reglas de las pantallas ya entregadas                     | Verificado por diff: la parte compartida es idéntica y solo se añaden bloques. Se portan tres secciones acotadas.  |
| `IntersectionObserver` deja secciones invisibles si el efecto no se ejecuta | El observador se monta en el primer render del cliente; si fallara, las secciones quedan en `opacity: 0`. Un criterio de aceptación comprueba que ganan la clase `in`. |
| Arrastrar sin querer el CSS del mando virtual                              | Los rangos de líneas a portar están fijados en el paso 1 y `GAMEPAD` queda excluido explícitamente.               |

---

## Lo que **no** entra en este spec

- La pantalla «Acerca de» y su formulario de contacto.
- El mando virtual y sus variantes de color.
- Rehacer la pantalla de detalle con el fuente original del bundle.
- Actividad, ranking y estadísticas reales.
- Juegos jugables, backend y autenticación real.

Cada uno de ellos, si llega, va en su propio spec.
