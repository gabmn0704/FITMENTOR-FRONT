import { useMemo, useState } from "react";
import { Logo } from "../brand/Logo";
import { AuthPanel, type AuthMode, type AuthMood } from "../components/auth/AuthPanel";
import { Mascot } from "../components/mascot/Mascot";
import { Marquee } from "../components/motion/Marquee";
import { PoseField } from "../components/motion/PoseField";
import type { MascotState } from "../lib/mascot";

const TICKER = ["Sentadilla", "Flexión", "Plancha", "Peso muerto", "Zancada", "Coach IA", "Tu cámara, tu privacidad"];

/** Traduce el ánimo del formulario en lo que hace y dice la mascota. */
function mascotFor(mood: AuthMood): { state: MascotState; message: string | true } {
  switch (mood) {
    case "busy":
      return { state: "count", message: "Un momento, estoy abriendo tu sesión…" };
    case "error":
      return { state: "worried", message: true };
    case "register":
      return { state: "cheer", message: "Crea tu cuenta y empezamos a entrenar." };
    case "typing":
      return { state: "idle", message: "Tus datos están protegidos. No veo tu contraseña." };
    default:
      return { state: "wave", message: true };
  }
}

/** Primera pantalla: escena cobalto con esqueleto de postura, mascota que reacciona y el acceso como un dorsal. */
export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [mood, setMood] = useState<AuthMood>("welcome");
  const mascot = useMemo(() => mascotFor(mood), [mood]);
  const register = mode === "register";

  return (
    <div className="access">
      <section className="access__field" aria-label="FitMentor">
        <img className="access__photo" src="/img/ropes.jpg" alt="" />
        <span className="access__orb access__orb--a" aria-hidden="true" />
        <span className="access__orb access__orb--b" aria-hidden="true" />
        <PoseField />

        <a className="access__brand" href="#main" aria-label="FitMentor">
          <Logo size={48} tone="inverse" />
        </a>

        <div className="access__copy">
          <h1 className="access__title">
            <span className="mask">
              <span>Entrena</span>
            </span>
            <span className="mask">
              <span className="access__accent">bien.</span>
            </span>
          </h1>

          <div className="access__mascot">
            <Mascot state={mascot.state} size={210} message={mascot.message} interactive />
          </div>
        </div>

        <div className="access__ticker">
          <Marquee items={TICKER} label="Ejercicios que corrige FitMentor" />
        </div>
      </section>

      <main className="access__panel" id="main">
        <div className="bib-form" data-mode={mode}>
          <div className="bib-form__band" aria-hidden="true">
            <span>FitMentor</span>
            <span className="swap" key={mode}>
              {register ? "Registro" : "Acceso"}
            </span>
          </div>
          <div className="bib-form__body">
            <h2 className="swap swap--title" key={mode}>
              {register ? "Crea tu cuenta" : "Entra a tu cuenta"}
            </h2>
            <AuthPanel onModeChange={setMode} onMood={setMood} />
          </div>
        </div>
      </main>
    </div>
  );
}
