import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Notice } from "../ui";
import { useAuth } from "../../hooks/useAuth";
import { GOOGLE_CLIENT_ID, isGoogleEnabled } from "../../lib/config";
import { loadGoogleIdentity } from "../../lib/google";
import { ApiError } from "../../lib/api";

type Mode = "login" | "register";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 0) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "No se pudo iniciar sesión. Inténtalo de nuevo.";
}

/** Valida en el cliente antes de llamar al backend; devuelve el primer problema encontrado. */
export function validateCredentials(mode: Mode, name: string, email: string, password: string): string | null {
  if (mode === "register" && !name.trim()) return "Escribe tu nombre.";
  if (!EMAIL_PATTERN.test(email.trim())) return "Escribe un correo válido.";
  if (mode === "register" && password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (mode === "login" && !password) return "Escribe tu contraseña.";
  return null;
}

export function AuthPanel() {
  const { loginWithGoogle, loginAsGuest, loginWithEmail, registerWithEmail, authNotice } = useAuth();
  const googleSlot = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    if (!isGoogleEnabled) return;
    let cancelled = false;
    loadGoogleIdentity()
      .then((id) => {
        if (cancelled || !googleSlot.current) return;
        id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          auto_select: false,
          callback: (response) => {
            setBusy(true);
            setError("");
            loginWithGoogle(response.credential)
              .catch((err: unknown) => setError(errorMessage(err)))
              .finally(() => setBusy(false));
          },
        });
        id.renderButton(googleSlot.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 340,
          locale: "es",
        });
        setGoogleReady(true);
      })
      .catch(() => {
        if (!cancelled) setGoogleReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateCredentials(mode, name, email, password);
    if (problem) {
      setError(problem);
      return;
    }
    void run(() => (mode === "login" ? loginWithEmail(email, password) : registerWithEmail(name, email, password)));
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
  };

  return (
    <div className="auth-panel" id="acceso">
      <div className="auth-tabs" role="tablist" aria-label="Acceso">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className="auth-tabs__tab"
          onClick={() => switchMode("login")}
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          className="auth-tabs__tab"
          onClick={() => switchMode("register")}
        >
          Crear cuenta
        </button>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : authNotice && <Notice tone="info">{authNotice}</Notice>}

      <form className="stack" onSubmit={onSubmit} noValidate>
        {mode === "register" && (
          <div className="field">
            <label htmlFor="auth-name">Nombre</label>
            <input
              id="auth-name"
              className="input"
              value={name}
              maxLength={60}
              autoComplete="given-name"
              placeholder="Cómo quieres que te llame"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="auth-email">Correo</label>
          <input
            id="auth-email"
            className="input"
            type="email"
            value={email}
            maxLength={180}
            autoComplete="email"
            placeholder="tu@correo.com"
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="auth-password">Contraseña</label>
          <input
            id="auth-password"
            className="input"
            type="password"
            value={password}
            maxLength={72}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "login" ? "Tu contraseña" : "Mínimo 8 caracteres"}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button type="submit" variant="primary" large block loading={busy}>
          {mode === "login" ? "Entrar" : "Crear mi cuenta"}
        </Button>
      </form>

      <div className="login__divider">o continúa con</div>

      {isGoogleEnabled && (
        <div className="auth-google">
          <div ref={googleSlot} style={{ minHeight: 44 }} />
          {!googleReady && <p className="muted auth-hint">Cargando acceso con Google…</p>}
        </div>
      )}

      <Button variant="ghost" large block disabled={busy} onClick={() => void run(() => loginAsGuest(name))}>
        Entrar como invitado
      </Button>
      <p className="muted auth-hint">El modo invitado no necesita datos; tu progreso se guarda solo en este dispositivo.</p>
    </div>
  );
}
