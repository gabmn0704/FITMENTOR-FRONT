import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, Notice } from "../ui";
import { useAuth } from "../../hooks/useAuth";
import { GOOGLE_CLIENT_ID, isGoogleEnabled } from "../../lib/config";
import { loadGoogleIdentity } from "../../lib/google";
import { ApiError, pingBackend } from "../../lib/api";

type Mode = "login" | "register";

const RETRY_ATTEMPTS = 4;
const RETRY_DELAY_MS = 8000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 0 a 4: longitud, mayúsculas y minúsculas, números y símbolos. Solo orienta; el backend valida. */
export function passwordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

const STRENGTH_LABELS = ["", "Débil", "Aceptable", "Buena", "Fuerte"];
const STRENGTH_COLORS = ["", "var(--signal)", "var(--signal)", "var(--cobalt)", "var(--good)"];

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "Este servidor aún no admite cuentas por correo. Usa Google o entra como invitado.";
  }
  if (error instanceof ApiError && error.status === 0) {
    return "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo; si persiste, entra como invitado en un minuto.";
  }
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
  const [showPassword, setShowPassword] = useState(false);
  const strength = passwordStrength(password);

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
          // El botón de Google tiene ancho fijo: se ajusta al ancho real del formulario (200 a 340 px).
          width: Math.round(Math.min(340, Math.max(200, googleSlot.current.parentElement?.clientWidth ?? 340))),
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

  const [waking, setWaking] = useState(false);

  // Si el servidor tarda en responder se avisa por qué; mientras tanto ya se puede escribir.
  const [serverSlow, setServerSlow] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => setServerSlow(true), 2500);
    void pingBackend(controller.signal).finally(() => {
      window.clearTimeout(timer);
      if (!controller.signal.aborted) setServerSlow(false);
    });
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  /** Un fallo de red suele ser el servidor gratuito despertando: se reintenta unas veces antes de rendirse. */
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      for (let attempt = 0; ; attempt += 1) {
        try {
          await action();
          return;
        } catch (err) {
          const offline = err instanceof ApiError && err.status === 0;
          if (!offline || attempt >= RETRY_ATTEMPTS) throw err;
          setWaking(true);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWaking(false);
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
      <div className="auth-tabs" role="tablist" aria-label="Acceso" data-mode={mode}>
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

      {serverSlow && !waking && !error && (
        <Notice tone="info">
          Despertando el servidor: la primera vez del día puede tardar hasta un minuto. Ve escribiendo tus datos; entras apenas esté listo.
        </Notice>
      )}
      {waking && !error && (
        <Notice tone="info">El servidor estaba dormido y está despertando. Puede tardar hasta un minuto; seguimos intentando…</Notice>
      )}
      {error ? <Notice tone="error">{error}</Notice> : !waking && authNotice && <Notice tone="info">{authNotice}</Notice>}

      <form className="stack" onSubmit={onSubmit} noValidate>
        {mode === "register" && (
          <div className="field field--enter">
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
        <div className="field field--password">
          <label htmlFor="auth-password">Contraseña</label>
          <input
            id="auth-password"
            className="input"
            type={showPassword ? "text" : "password"}
            value={password}
            maxLength={72}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "login" ? "Tu contraseña" : "Mínimo 8 caracteres"}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            className="field__reveal"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
        {mode === "register" && password && (
          <div className="field--enter" style={{ "--strength-color": STRENGTH_COLORS[strength] } as CSSProperties}>
            <div className="strength" aria-hidden="true">
              {[1, 2, 3, 4].map((step) => (
                <i key={step} className={strength >= step ? "on" : ""} />
              ))}
            </div>
            <span className="strength__text" role="status">
              {strength === 0 ? "Usa al menos 8 caracteres" : `Seguridad: ${STRENGTH_LABELS[strength]}`}
            </span>
          </div>
        )}
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
