"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { fetchRanking, type RankingRow } from "@/lib/scores";
import { GAMES } from "@/lib/games";

export function HallOfFame() {
  const { user } = useSession();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState(GAMES[0].id);
  // Keyed by tab so a fetch still in flight for the previous tab never
  // overwrites the rows once the player has already switched away from it.
  const [result, setResult] = useState<{ tab: string; rows: RankingRow[] } | null>(null);

  useEffect(() => {
    let active = true;
    fetchRanking(supabase, tab, 12).then((rows) => {
      if (active) setResult({ tab, rows });
    });
    return () => {
      active = false;
    };
  }, [supabase, tab]);

  const loading = result === null || result.tab !== tab;
  const rows = loading ? [] : result.rows;
  const game = GAMES.find((g) => g.id === tab)!;
  const you = rows.find((r) => r.isYou) ?? null;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {!loading && rows.length === 0 ? (
        <div className="hall-empty" style={{ textAlign: "center", padding: "48px 0" }}>
          <p className="pixel neon-cyan" style={{ fontSize: 14 }}>
            AÚN NO HAY MARCAS
          </p>
          <p className="mono" style={{ color: "var(--ink-faint)", marginTop: 8 }}>
            SÉ EL PRIMERO
          </p>
        </div>
      ) : (
        <>
          {rows.length >= 3 && (
            <div className="podium">
              <div className="podium-slot silver">
                <div className="rank-num">02</div>
                <div className="name">{rows[1].name}</div>
                <div className="score">{rows[1].score.toLocaleString("es-ES")}</div>
                <div className="date">{rows[1].date}</div>
              </div>
              <div className="podium-slot gold">
                <div
                  className="pixel"
                  style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
                >
                  CAMPEÓN
                </div>
                <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                  01
                </div>
                <div className="name">{rows[0].name}</div>
                <div className="score" style={{ fontSize: 20 }}>
                  {rows[0].score.toLocaleString("es-ES")}
                </div>
                <div className="date">{rows[0].date}</div>
              </div>
              <div className="podium-slot bronze">
                <div className="rank-num">03</div>
                <div className="name">{rows[2].name}</div>
                <div className="score">{rows[2].score.toLocaleString("es-ES")}</div>
                <div className="date">{rows[2].date}</div>
              </div>
            </div>
          )}

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.name + i}
                className={
                  "tr" +
                  (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "") +
                  (r.isYou ? " you" : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
          {user && you && (
            <div
              className="mono"
              style={{
                textAlign: "center",
                marginTop: 12,
                fontSize: 11,
                color: "var(--yellow)",
                letterSpacing: "0.14em",
              }}
            >
              ▸ TU MEJOR MARCA EN {game.title}: #{String(you.rank).padStart(2, "0")}
            </div>
          )}
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
