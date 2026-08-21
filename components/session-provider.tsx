"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitScore } from "@/lib/scores";

type User = { name: string };

type AuthResult = { error: string | null };

type SessionValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  saveScore: (gameId: string, score: number) => Promise<AuthResult>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single();
      setUser(data ? { name: data.display_name } : null);
    },
    [supabase],
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) loadProfile(data.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user.id);
      else setUser(null);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase, loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const saveScore = useCallback(
    (gameId: string, score: number) => submitScore(supabase, gameId, score),
    [supabase],
  );

  return (
    <SessionContext.Provider value={{ user, loading, signIn, signUp, signOut, saveScore }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
