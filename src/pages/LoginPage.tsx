import { Logo } from "../brand/Logo";
import { AuthPanel } from "../components/auth/AuthPanel";
import { Marquee } from "../components/motion/Marquee";

const TICKER = ["Sentadilla", "Flexión", "Plancha", "Peso muerto", "Zancada", "Coach IA", "Tu cámara, tu privacidad"];
const HIGHLIGHTS = ["Mide tus ángulos en vivo", "Cuenta cada repetición", "Tu video no sale del dispositivo"];

/** Primera pantalla: campo cobalto con la foto en dúo y el titular, y el acceso como un dorsal. */
export function LoginPage() {
  return (
    <div className="access">
      <section className="access__field" aria-label="FitMentor">
        <img className="access__photo" src="/img/ropes.jpg" alt="" />

        <a className="access__brand" href="#main" aria-label="FitMentor">
          <Logo size={44} tone="inverse" />
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
          <ul className="access__points">
            {HIGHLIGHTS.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>

        <div className="access__ticker">
          <Marquee items={TICKER} label="Ejercicios que corrige FitMentor" />
        </div>
      </section>

      <main className="access__panel" id="main">
        <div className="bib-form">
          <div className="bib-form__band" aria-hidden="true">
            <span>FitMentor</span>
            <span>Acceso</span>
          </div>
          <div className="bib-form__body">
            <h2>Entra a tu cuenta</h2>
            <AuthPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
