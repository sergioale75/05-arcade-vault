"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import {
  appendScore,
  getServerUserSnapshot,
  getUserSnapshot,
  normalizeName,
  subscribeUser,
  writeUser,
  type SavedScore,
  type User,
} from "@/lib/session";

type SessionValue = {
  user: User | null;
  signIn: (name: string) => void;
  signOut: () => void;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // localStorage is an external store: the server snapshot is always guest, so the
  // markup matches on hydration and the real session lands on the next render.
  const user = useSyncExternalStore(subscribeUser, getUserSnapshot, getServerUserSnapshot);

  const signIn = useCallback((name: string) => {
    writeUser({ name: normalizeName(name) });
  }, []);

  const signOut = useCallback(() => {
    writeUser(null);
  }, []);

  const saveScore = useCallback((entry: Omit<SavedScore, "at">) => {
    appendScore(entry);
  }, []);

  return (
    <SessionContext.Provider value={{ user, signIn, signOut, saveScore }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
