import { Logo } from "../brand/Logo";
import { AuthPanel } from "../components/auth/AuthPanel";
import { Marquee } from "../components/motion/Marquee";

const TICKER = ["Sentadilla", "Flexión", "Plancha", "Peso muerto", "Zancada", "Coach IA", "Tu cámara, tu privacidad"];
const HIGHLIGHTS = ["Mide tus ángulos en vivo", "Cuenta cada repetición", "Tu video no sale del dispositivo"];

/** Primera pantalla: foto a sangre con el titular a la izquierda y el acceso a la derecha. */
export function LoginPage() {
  return (
    <div className="login-split">
      <section className="login-poster" aria-label="FitMentor">
        <img className="login-poster__bg" src="/img/ropes.jpg" alt="" />
        <div className="login-poster__scrim" aria-hidden="true" />

        <a className="login-poster__brand" href="#main" aria-label="FitMentor">
          <Logo size={44} tone="lime" />
        </a>

        <div className="login-poster__copy">
          <h1 className="login-poster__title">
            <span className="mask">
              <span>Entrena</span>
            </span>
            <span className="mask">
              <span className="login-poster__accent">bien.</span>
            </span>
          </h1>
          <ul className="login-poster__points">
            {HIGHLIGHTS.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
        <div className="login-marquee">
          <Marquee items={TICKER} label="Ejercicios que corrige FitMentor" />
        </div>
      </section>

      <main className="login-panel" id="main">
        <div className="login-panel__inner">
          <h2>Entra a tu cuenta</h2>
          <AuthPanel />
        </div>
      </main>
    </div>
  );
}
