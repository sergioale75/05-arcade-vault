// Mock session, same localStorage keys as the prototype (av_user / av_scores).
// No schema versioning on purpose: this is throwaway mock data.

export type User = { name: string };
export type SavedScore = { game: string; score: number; name: string; at: number };

export const USER_KEY = "av_user";
export const SCORES_KEY = "av_scores";

/** Player names are stored uppercase and capped at 10 characters, like the arcade cabinets. */
export function normalizeName(raw: string): string {
  return (raw || "PLAYER1").toUpperCase().slice(0, 10);
}

export function readUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User | null;
    return parsed && typeof parsed.name === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeUser(user: User | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(USER_KEY);
  } catch {
    // Private mode or a full quota: the app keeps working, it just does not persist.
  }
  emit();
}

// ---- localStorage as an external store, for useSyncExternalStore ----
// Snapshots must be referentially stable between reads, so the parsed user is
// memoised against the raw string it came from.

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedUser: User | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeUser(listener: () => void): () => void {
  listeners.add(listener);
  // Other tabs write to the same key; keep them in sync too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function getUserSnapshot(): User | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(USER_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedUser = readUser();
  }
  return cachedUser;
}

/** The server never has a session: every page renders as guest, then hydrates. */
export function getServerUserSnapshot(): User | null {
  return null;
}

export function readScores(): SavedScore[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SCORES_KEY) || "[]");
    return Array.isArray(parsed) ? (parsed as SavedScore[]) : [];
  } catch {
    return [];
  }
}

export function appendScore(entry: Omit<SavedScore, "at">): void {
  if (typeof window === "undefined") return;
  try {
    const all = readScores();
    all.push({ ...entry, at: Date.now() });
    window.localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {
    // Same as above: persistence is best-effort.
  }
}
