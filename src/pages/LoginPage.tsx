import { useEffect, useRef, useState, type FormEvent } from "react";
import { Activity, Brain, Camera, Zap } from "lucide-react";
import { Button, Notice } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { GOOGLE_CLIENT_ID, isGoogleEnabled } from "../lib/config";
import { loadGoogleIdentity } from "../lib/google";
import { ApiError } from "../lib/api";

const features = [
  { icon: Camera, text: "Corrección de postura en tiempo real con tu cámara" },
  { icon: Brain, text: "Rutinas que se adaptan a tu nivel y progreso" },
  { icon: Activity, text: "Historial, racha y logros para mantener la constancia" },
];

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 0) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "No se pudo iniciar sesión. Inténtalo de nuevo.";
}

export function LoginPage() {
  const { loginWithGoogle, loginAsGuest } = useAuth();
  const googleSlot = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
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
          width: 320,
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

  const onGuest = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loginAsGuest(name);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <main className="card login rise" id="main">
        <div className="login__brand">
          <span className="brand__mark" aria-hidden="true">
            <Zap size={18} fill="currentColor" />
          </span>
          FitMentor
        </div>
        <div className="stack">
          <p className="eyebrow">Entrenamiento con IA</p>
          <h1>
            Tu coach de <em>técnica</em>, en tu navegador.
          </h1>
          <p className="muted">
            Analiza tu postura con la cámara sin enviar video a ningún servidor.
          </p>
        </div>

        <ul className="login__features">
          {features.map(({ icon: Icon, text }) => (
            <li key={text}>
              <Icon size={16} aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="login__actions">
          {isGoogleEnabled && (
            <>
              <div ref={googleSlot} className="row" style={{ justifyContent: "center", minHeight: 44 }} />
              {!googleReady && <p className="muted" style={{ fontSize: 13 }}>Cargando acceso con Google…</p>}
              <div className="login__divider">o</div>
            </>
          )}
          <form className="stack" onSubmit={onGuest}>
            <div className="field">
              <label htmlFor="guest-name">Tu nombre (opcional)</label>
              <input
                id="guest-name"
                className="input"
                value={name}
                maxLength={40}
                autoComplete="given-name"
                placeholder="Como quieras que te llame"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" large block loading={busy}>
              Entrar como invitado
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
