'use client';

import { useEffect, useRef } from 'react';
import type { BaseGameProps } from './types';

export type TetrisSkinKey = 'retro' | 'neon' | 'pastel' | 'pixel';

interface TetrisGameProps extends BaseGameProps {
  onLinesChange: (lines: number) => void;
  onLevelChange: (level: number) => void;
  skin: TetrisSkinKey;
  startLevel: number;
}

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const PIECES: (number[][] | null)[] = [
  null,
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[2, 2], [2, 2]], // O
  [[0, 3, 0], [3, 3, 3], [0, 0, 0]], // T
  [[0, 4, 4], [4, 4, 0], [0, 0, 0]], // S
  [[5, 5, 0], [0, 5, 5], [0, 0, 0]], // Z
  [[6, 0, 0], [6, 6, 6], [0, 0, 0]], // J
  [[0, 0, 7], [7, 7, 7], [0, 0, 0]], // L
  [[8, 8, 8], [8, 0, 8], [8, 8, 8]], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

interface SkinDef {
  colors: (string | null)[];
  boardBg: string | null;
  drawBlock(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    colorIndex: number,
    size: number,
    alpha?: number,
  ): void;
}

const SKINS: Record<TetrisSkinKey, SkinDef> = {
  retro: {
    colors: [
      null,
      '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784',
      '#e57373', '#90caf9', '#ffb74d', '#9e9e9e',
    ],
    boardBg: null,
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex]!;
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      context.globalAlpha = 1;
    },
  },

  neon: {
    colors: [
      null,
      '#00ffff', '#ffff00', '#ff00ff', '#00ff00',
      '#ff0040', '#00aaff', '#ff8000', '#8000ff',
    ],
    boardBg: '#000000',
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex]!;
      const a = alpha ?? 1;
      context.globalAlpha = a;
      context.shadowBlur = a < 0.5 ? 8 : 15;
      context.shadowColor = color;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      context.fillStyle = `rgba(${r},${g},${b},0.55)`;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.strokeStyle = color;
      context.lineWidth = 1.5;
      context.strokeRect(x * size + 1.75, y * size + 1.75, size - 3.5, size - 3.5);
      context.shadowBlur = 0;
      context.globalAlpha = 1;
    },
  },

  pastel: {
    colors: [
      null,
      '#bae1ff', '#ffffba', '#e8baff', '#baffc9',
      '#ffb3ba', '#ffdfba', '#ffd9ba', '#d9d9d9',
    ],
    boardBg: '#f8f0ff',
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex]!;
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = 'rgba(255,255,255,0.65)';
      context.fillRect(x * size + 2, y * size + 2, size - 4, 5);
      context.fillRect(x * size + 2, y * size + 2, 5, size - 4);
      context.fillStyle = 'rgba(0,0,0,0.08)';
      context.fillRect(x * size + 2, y * size + size - 5, size - 4, 4);
      context.fillRect(x * size + size - 5, y * size + 2, 4, size - 4);
      context.globalAlpha = 1;
    },
  },

  pixel: {
    colors: [
      null,
      '#3ab8c8', '#d4b840', '#9a50a8', '#60a060',
      '#c05060', '#7090d8', '#d08030', '#808080',
    ],
    boardBg: '#1a1a2e',
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex]!;
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const dark = `rgba(${Math.max(0, r - 60)},${Math.max(0, g - 60)},${Math.max(0, b - 60)},0.7)`;
      context.strokeStyle = dark;
      context.lineWidth = 0.5;
      const bx = x * size + 1;
      const by = y * size + 1;
      const bw = size - 2;
      for (let i = 4; i < bw; i += 4) {
        context.beginPath();
        context.moveTo(bx + i, by);
        context.lineTo(bx + i, by + bw);
        context.stroke();
        context.beginPath();
        context.moveTo(bx, by + i);
        context.lineTo(bx + bw, by + i);
        context.stroke();
      }
      context.globalAlpha = 1;
    },
  },
};

export default function TetrisGame({
  paused,
  onScoreChange,
  onLinesChange,
  onLevelChange,
  onGameOver,
  skin,
  startLevel,
}: TetrisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs so the game loop always reads the latest prop values without re-running the effect
  const pausedRef = useRef(paused);
  const cbScore = useRef(onScoreChange);
  const cbLines = useRef(onLinesChange);
  const cbLevel = useRef(onLevelChange);
  const cbOver = useRef(onGameOver);
  const skinRef = useRef<TetrisSkinKey>(skin);
  // startLevel is intentionally captured once via useRef's initializer, not kept in
  // sync — it only applies at mount/remount, never mid-game (see spec 07).
  const startLevelRef = useRef(startLevel);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    cbScore.current = onScoreChange;
  }, [onScoreChange]);
  useEffect(() => {
    cbLines.current = onLinesChange;
  }, [onLinesChange]);
  useEffect(() => {
    cbLevel.current = onLevelChange;
  }, [onLevelChange]);
  useEffect(() => {
    cbOver.current = onGameOver;
  }, [onGameOver]);
  useEffect(() => {
    skinRef.current = skin;
  }, [skin]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    interface Piece {
      shape: number[][];
      x: number;
      y: number;
    }

    // ── Game state ───────────────────────────────────────────────────────────
    let board: number[][];
    let current: Piece, next: Piece;
    let score: number, lines: number, level: number;
    let gameOver: boolean;
    let dropAccum: number, dropInterval: number;
    let gameOverFired = false;

    // Previous values to avoid spamming callbacks
    let prevScore = -1,
      prevLines = -1,
      prevLevel = -1;

    function createBoard(): number[][] {
      return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    }

    function randomPiece(): Piece {
      const type = Math.floor(Math.random() * 8) + 1;
      const shape = PIECES[type]!.map((row) => [...row]);
      return {
        shape,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0,
      };
    }

    function collide(shape: number[][], ox: number, oy: number): boolean {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const nx = ox + c;
          const ny = oy + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && board[ny][nx]) return true;
        }
      }
      return false;
    }

    function rotateCW(shape: number[][]): number[][] {
      const rows = shape.length,
        cols = shape[0].length;
      const result: number[][] = Array.from({ length: cols }, () =>
        new Array(rows).fill(0),
      );
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
      return result;
    }

    function tryRotate() {
      const rotated = rotateCW(current.shape);
      const kicks = [0, -1, 1, -2, 2];
      for (const kick of kicks) {
        if (!collide(rotated, current.x + kick, current.y)) {
          current.shape = rotated;
          current.x += kick;
          return;
        }
      }
    }

    function merge() {
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c])
            board[current.y + r][current.x + c] = current.shape[r][c];
    }

    function clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every((v) => v !== 0)) {
          board.splice(r, 1);
          board.unshift(new Array(COLS).fill(0));
          cleared++;
          r++;
        }
      }
      if (cleared) {
        lines += cleared;
        score += (LINE_SCORES[cleared] || 0) * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 90);
      }
    }

    function ghostY(): number {
      let gy = current.y;
      while (!collide(current.shape, current.x, gy + 1)) gy++;
      return gy;
    }

    function hardDrop() {
      const gy = ghostY();
      score += (gy - current.y) * 2;
      current.y = gy;
      lockPiece();
    }

    function softDrop() {
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        score += 1;
      } else {
        lockPiece();
      }
    }

    function lockPiece() {
      merge();
      clearLines();
      spawn();
    }

    function spawn() {
      current = next;
      next = randomPiece();
      if (collide(current.shape, current.x, current.y)) {
        gameOver = true;
      }
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    function drawBlock(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      colorIndex: number,
      size: number,
      alpha?: number,
    ) {
      SKINS[skinRef.current].drawBlock(context, x, y, colorIndex, size, alpha);
    }

    function drawGrid() {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      for (let c = 1; c < COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK, 0);
        ctx.lineTo(c * BLOCK, ROWS * BLOCK);
        ctx.stroke();
      }
      for (let r = 1; r < ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK);
        ctx.lineTo(COLS * BLOCK, r * BLOCK);
        ctx.stroke();
      }
    }

    function draw() {
      const activeSkin = SKINS[skinRef.current];
      if (activeSkin.boardBg) {
        ctx.fillStyle = activeSkin.boardBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      drawGrid();

      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

      const gy = ghostY();
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c])
            drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
    }

    function initGame() {
      board = createBoard();
      score = 0;
      lines = 0;
      level = startLevelRef.current;
      gameOver = false;
      dropInterval = Math.max(100, 1000 - (startLevelRef.current - 1) * 90);
      dropAccum = 0;
      gameOverFired = false;
      prevScore = -1;
      prevLines = -1;
      prevLevel = -1;
      next = randomPiece();
      spawn();
    }

    // ── Input ────────────────────────────────────────────────────────────────
    function onKeyDown(e: KeyboardEvent) {
      if (pausedRef.current || gameOver) return;
      switch (e.code) {
        case 'ArrowLeft':
          if (!collide(current.shape, current.x - 1, current.y)) current.x--;
          break;
        case 'ArrowRight':
          if (!collide(current.shape, current.x + 1, current.y)) current.x++;
          break;
        case 'ArrowDown':
          softDrop();
          break;
        case 'ArrowUp':
        case 'KeyX':
          tryRotate();
          break;
        case 'Space':
          e.preventDefault();
          hardDrop();
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);

    // ── Update ───────────────────────────────────────────────────────────────
    function update(dt: number) {
      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
        } else {
          lockPiece();
        }
      }
    }

    // ── Loop ─────────────────────────────────────────────────────────────────
    let rafId: number;
    let lastTime: number | null = null;

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : ts - lastTime;
      lastTime = ts;

      if (!pausedRef.current && !gameOver) update(dt);
      if (!gameOver) draw();

      // Notify React of state changes
      if (score !== prevScore) {
        cbScore.current(score);
        prevScore = score;
      }
      if (lines !== prevLines) {
        cbLines.current(lines);
        prevLines = lines;
      }
      if (level !== prevLevel) {
        cbLevel.current(level);
        prevLevel = level;
      }
      if (gameOver && !gameOverFired) {
        gameOverFired = true;
        cbOver.current(score);
      }

      rafId = requestAnimationFrame(loop);
    }

    initGame();
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={COLS * BLOCK}
      height={ROWS * BLOCK}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
      }}
    />
  );
}
