"use client";

import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { GameCover } from "@/components/game-cover";
import type { Game } from "@/lib/games";

const accentClass: Record<Game["color"], string> = {
  cyan: "btn",
  magenta: "btn magenta",
  yellow: "btn yellow",
  green: "btn",
};

export function GameCard({ game }: { game: Game }) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const href = `/juegos/${game.id}`;

  // Pointer-follow tilt, ported from the prototype: the card leans toward the cursor.
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  };

  const onLeave = () => {
    const el = tiltRef.current;
    if (el) el.style.transform = "";
  };

  return (
    <div
      ref={tiltRef}
      className="card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={() => router.push(href)}
    >
      <div className="cover">
        <GameCover cover={game.cover} />
        <div className="label">{game.cat}</div>
      </div>
      <div className="meta">
        <div className="title">{game.title}</div>
        <div className="desc">{game.short}</div>
        <div className="row">
          <div className="score-badge">
            <span>MEJOR PUNTUACIÓN</span>
            <b>{game.best.toLocaleString("es-ES")}</b>
          </div>
          <Link
            href={href}
            className={accentClass[game.color]}
            onClick={(e) => e.stopPropagation()}
          >
            JUGAR
          </Link>
        </div>
      </div>
    </div>
  );
}
