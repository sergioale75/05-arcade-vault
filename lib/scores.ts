import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type RankingRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
  isYou: boolean;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

/** Top scores for a game, one row per player (game_rankings already keeps the best). */
export async function fetchRanking(
  client: SupabaseClient<Database>,
  gameId: string,
  limit: number,
): Promise<RankingRow[]> {
  const [{ data: userData }, { data, error }] = await Promise.all([
    client.auth.getUser(),
    client
      .from("game_rankings")
      .select("user_id, display_name, score, created_at")
      .eq("game_id", gameId)
      .order("score", { ascending: false })
      .limit(limit),
  ]);

  if (error || !data) {
    console.error("fetchRanking failed", error);
    return [];
  }

  const userId = userData.user?.id ?? null;

  return data.map((row, i) => ({
    rank: i + 1,
    name: row.display_name ?? "???",
    score: row.score ?? 0,
    date: row.created_at ? formatDate(row.created_at) : "",
    isYou: userId !== null && row.user_id === userId,
  }));
}

export async function submitScore(
  client: SupabaseClient<Database>,
  gameId: string,
  score: number,
): Promise<{ error: string | null }> {
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return { error: "No hay sesión activa." };

  const { error } = await client
    .from("scores")
    .insert({ user_id: userData.user.id, game_id: gameId, score });

  return { error: error?.message ?? null };
}
