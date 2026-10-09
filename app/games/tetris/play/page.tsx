'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState, useCallback, useEffect } from 'react';
import { useUser } from '@/app/context/UserContext';
import { createClient } from '@/lib/supabase/client';
import type { TetrisSkinKey } from '@/components/games/TetrisGame';

const TetrisGame = dynamic(() => import('@/components/games/TetrisGame'), {
  ssr: false,
});

const SKIN_OPTIONS: { value: TetrisSkinKey; label: string }[] = [
  { value: 'retro', label: 'Retro' },
  { value: 'neon', label: 'Neon' },
  { value: 'pastel', label: 'Pastel' },
  { value: 'pixel', label: 'Pixel Art' },
];

export default function TetrisPlay() {
  const { user } = useUser();

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(user ?? 'INVITADO');
  const [saved, setSaved] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [skin, setSkin] = useState<TetrisSkinKey>('retro');
  const [startLevel, setStartLevel] = useState(1);

  const handleScoreChange = useCallback((s: number) => setScore(s), []);
  const handleLinesChange = useCallback((l: number) => setLines(l), []);
  const handleLevelChange = useCallback((l: number) => setLevel(l), []);
  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setOver(true);
  }, []);

  useEffect(() => {
    const savedSkin = localStorage.getItem('av_tetris_skin') as TetrisSkinKey | null;
    if (savedSkin && SKIN_OPTIONS.some((o) => o.value === savedSkin)) {
      setSkin(savedSkin);
    }
  }, []);

  useEffect(() => {
    if (over) {
      const savedName = localStorage.getItem('av_player_name');
      if (savedName) setName(savedName);
    }
  }, [over]);

  function changeSkin(next: TetrisSkinKey) {
    setSkin(next);
    localStorage.setItem('av_tetris_skin', next);
  }

  function restart() {
    setScore(0);
    setLines(0);
    setLevel(startLevel);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setName(user ?? 'INVITADO');
    setGameKey((k) => k + 1);
  }

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: 'var(--ink)' }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString('es-ES')}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Líneas</div>
            <div className="v">{lines}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, '0')}</div>
          </div>
        </div>
        <div className="hud-actions">
          <select
            className="skin-select"
            value={skin}
            onChange={(e) => changeSkin(e.target.value as TetrisSkinKey)}
            aria-label="Skin del tablero"
          >
            {SKIN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? 'REANUDAR' : 'PAUSA'}
          </button>
          <button className="btn magenta" onClick={() => setOver(true)}>
            FIN
          </button>
          <Link href="/games/tetris" className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <TetrisGame
            key={gameKey}
            paused={paused}
            onScoreChange={handleScoreChange}
            onLinesChange={handleLinesChange}
            onLevelChange={handleLevelChange}
            onGameOver={handleGameOver}
            skin={skin}
            startLevel={startLevel}
          />
          {paused && (
            <div
              className="crt-content"
              style={{ background: 'rgba(0,0,0,0.6)', zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-dim)',
                    marginTop: 10,
                    letterSpacing: '0.16em',
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
                <div className="level-select">
                  <button
                    type="button"
                    className="level-step"
                    onClick={() => setStartLevel((l) => Math.max(1, l - 1))}
                  >
                    −
                  </button>
                  <span className="level-value">{startLevel}</span>
                  <button
                    type="button"
                    className="level-step"
                    onClick={() => setStartLevel((l) => Math.min(15, l + 1))}
                  >
                    +
                  </button>
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 9,
                    color: 'var(--ink-faint)',
                    marginTop: 8,
                    letterSpacing: '0.14em',
                  }}
                >
                  NIVEL INICIAL (próxima partida)
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>TETRIS · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString('es-ES')}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={async () => {
                    setSaved(true);
                    localStorage.setItem('av_player_name', name);
                    const supabase = createClient();
                    await supabase.from('scores').insert({
                      game_id: 'tetris',
                      player_name: name,
                      score,
                      user_id: null,
                    });
                  }}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
