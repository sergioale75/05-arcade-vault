-- Alta del juego Tetris (spec 07). Mismo patron que la migracion 0003 para
-- Asteroids: insercion manual de una fila en games via migracion versionada.
insert into public.games (id, title, short, long, cat, cover, color)
values (
  'tetris', 'TETRIS', 'Encaja piezas y despeja líneas antes de que se acumulen.',
  'Bloques de siete formas caen desde el cielo de la pantalla. Rótalos, desplázalos y encástralos para completar líneas horizontales sin dejar huecos. La velocidad aumenta con cada nivel superado — sobrevive el mayor tiempo posible y hacé explotar tu puntuación.',
  'PUZZLE', 'cover-tetro', 'cyan'
);
