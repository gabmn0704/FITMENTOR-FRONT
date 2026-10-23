import { Logo } from "../brand/Logo";
import { AuthPanel } from "../components/auth/AuthPanel";

/** Primera pantalla: un cartel a la izquierda y el acceso a la derecha. */
export function LoginPage() {
  return (
    <div className="login-split">
      <section className="login-poster" aria-label="FitMentor">
        <a className="login-poster__brand" href="#main" aria-label="FitMentor">
          <Logo size={44} tone="ink" />
        </a>
        <h1 className="login-poster__title">
          <span className="mask">
            <span>Entrena</span>
          </span>
          <span className="mask">
            <span>bien.</span>
          </span>
        </h1>
        <p className="login-poster__lead">
          Tu cámara mide los ángulos de tu cuerpo, cuenta cada repetición y te dice qué corregir. El video nunca sale de
          tu dispositivo.
        </p>
        <div className="login-poster__photo" aria-hidden="true">
          <img src="/img/deadlift.jpg" alt="" />
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
