import Link from "next/link";
import { notFound } from "next/navigation";
import { GameCover } from "@/components/game-cover";
import { GAMES, getGame, seededScores } from "@/lib/games";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default async function GameDetailPage({ params }: PageProps<"/juegos/[id]">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  // Same seed formula the Hall of Fame uses, so both screens agree on a game's ranking.
  const rows = seededScores(id.length * 23 + 7, 10);

  return (
    <main className="av-main">
      <div className="av-detail fade-in">
        <div>
          <div className="detail-cover">
            <GameCover cover={game.cover} />
          </div>

          <div className="detail-info" style={{ marginTop: 24 }}>
            <h2 className="neon-cyan">{game.title}</h2>

            <div className="detail-tags">
              <span>{game.cat}</span>
              <span>{game.plays} PARTIDAS</span>
              <span>1 JUGADOR</span>
            </div>

            <p>{game.long}</p>

            <div className="stat-strip">
              <div>
                <div className="l">Mejor puntuación</div>
                <div className="v">{game.best.toLocaleString("es-ES")}</div>
              </div>
              <div>
                <div className="l">Partidas</div>
                <div className="v">{game.plays}</div>
              </div>
              <div>
                <div className="l">Categoría</div>
                <div className="v">{game.cat}</div>
              </div>
            </div>

            <div className="detail-actions">
              <Link href={`/jugar/${game.id}`} className="btn lg pulse">
                JUGAR AHORA
              </Link>
              <Link href="/" className="btn ghost lg">
                VOLVER
              </Link>
            </div>
          </div>
        </div>

        <aside className="leaderboard">
          <h3>MEJORES MARCAS</h3>
          {rows.map((r, i) => (
            <div
              key={r.name + i}
              className={
                "lb-row" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
              }
            >
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">{r.name}</div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            </div>
          ))}
        </aside>
      </div>
    </main>
  );
}
