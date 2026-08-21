import Link from "next/link";
import { GameCover } from "@/components/game-cover";
import type { Game } from "@/lib/games";

// Compact card for the home carousel. The prototype used a click handler; here
// it is a real link so the detail route is reachable without JavaScript.
export function MiniCard({ game }: { game: Game }) {
  return (
    <Link href={`/juegos/${game.id}`} className="mini-card">
      <div className="mini-cover">
        <GameCover cover={game.cover} />
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
      </div>
    </Link>
  );
}
