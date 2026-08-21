"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";

export function AuthCard() {
  const router = useRouter();
  const { signIn, signUp, signOut } = useSession();

  const [tab, setTab] = useState<"in" | "up">("in");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = tab === "in" ? await signIn(email, pass) : await signUp(email, pass, user);

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/juegos");
  };

  const playAsGuest = async () => {
    await signOut();
    router.push("/juegos");
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" />
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === "in" ? "on" : ""}
            onClick={() => {
              setTab("in");
              setError(null);
            }}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === "up" ? "on" : ""}
            onClick={() => {
              setTab("up");
              setError(null);
            }}
          >
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={submit}>
          {tab === "up" && (
            <div className="field slide-in">
              <label htmlFor="av-user">Usuario</label>
              <input
                id="av-user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="px_kai"
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="av-email">Correo electrónico</label>
            <input
              id="av-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
            />
          </div>

          <div className="field">
            <label htmlFor="av-pass">Contraseña</label>
            <input
              id="av-pass"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              className="mono"
              style={{ color: "var(--magenta)", fontSize: 12, marginTop: 10, letterSpacing: "0.04em" }}
            >
              ▸ {error}
            </div>
          )}

          <button
            className="btn lg"
            type="submit"
            disabled={submitting}
            style={{ width: "100%", marginTop: 8 }}
          >
            {submitting ? "UN MOMENTO…" : tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
          </button>
        </form>

        <button
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={playAsGuest}
        >
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button className="btn ghost" type="button">
            ◆ GOOGLE
          </button>
          <button className="btn ghost" type="button">
            ▣ GITHUB
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
