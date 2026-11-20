import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { Lock } from "lucide-react";
import { Logo } from "../brand/Logo";
import { MOTION_OK, loadGsap, prefersReducedMotion } from "../brand/gsap";
import { AuthPanel, type AuthMode } from "../components/auth/AuthPanel";
import { Marquee } from "../components/motion/Marquee";
import { PoseField } from "../components/motion/PoseField";

const TICKER = ["Sentadilla", "Flexión", "Plancha", "Peso muerto", "Zancada", "Coach IA", "Tu cámara, tu privacidad"];

/** Entrada coreografiada de la escena y del panel. Sin GSAP o con "menos movimiento", todo ya está en su sitio. */
function useIntro(root: RefObject<HTMLDivElement>) {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let cancelled = false;
    let revert: (() => void) | undefined;
    void loadGsap().then((gsap) => {
      const el = root.current;
      if (cancelled || !gsap || !el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const q = gsap.utils.selector(el);
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.from(q(".access__lede, .access__facts > div"), { y: 18, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.55)
          .from(q(".login-glass"), { y: 40, opacity: 0, scale: 0.97, duration: 1.1 }, 0.25)
          .from(q(".login-glass__secure, .login-glass__lead"), { y: 14, opacity: 0, duration: 0.8, stagger: 0.06 }, 0.5)
          .from(q(".login-glass .auth-panel > *"), { y: 16, opacity: 0, duration: 0.8, stagger: 0.05 }, 0.65)
          .from(q(".access__arc"), { rotate: -40, opacity: 0, duration: 2, ease: "power3.out", transformOrigin: "50% 50%" }, 0)
          .from(q(".access__ticker"), { yPercent: 100, duration: 0.9 }, 0.9);
        return () => tl.kill();
      });
      revert = () => mm.revert();
    });
    return () => {
      cancelled = true;
      revert?.();
    };
  }, [root]);
}

/**
 * Primera pantalla: una sola escena oscura. A la izquierda, foto en movimiento con el esqueleto de postura;
 * a la derecha, el acceso en un panel de vidrio sobre un arco de luz (el arco de la marca), con un reflejo
 * que sigue al puntero.
 */
export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const register = mode === "register";
  const root = useRef<HTMLDivElement>(null);
  useIntro(root);

  // Reflejo de luz que sigue al puntero sobre el vidrio (solo variables CSS, sin renders).
  const onGlassMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--gx", `${((event.clientX - box.left) / box.width) * 100}%`);
    event.currentTarget.style.setProperty("--gy", `${((event.clientY - box.top) / box.height) * 100}%`);
  };

  return (
    <div className="access" ref={root}>
      <section className="access__field" aria-label="FitMentor">
        <img className="access__photo" src="/img/ropes.jpg" alt="" />
        <span className="access__orb access__orb--a" aria-hidden="true" />
        <span className="access__orb access__orb--b" aria-hidden="true" />
        <PoseField />

        <a className="access__brand" href="#main" aria-label="FitMentor">
          <Logo size={44} tone="inverse" />
        </a>

        <div className="access__copy">
          <div className="access__headline">
            <h1 className="access__title">
              <span className="mask">
                <span>Entrena</span>
              </span>
              <span className="mask">
                <span className="access__accent">bien.</span>
              </span>
            </h1>
            <p className="access__lede">Tu coach con IA mira tu postura, cuenta tus repeticiones y te corrige al instante.</p>
          </div>

          <dl className="access__facts" aria-label="Cómo funciona">
            <div>
              <dt>33</dt>
              <dd>puntos del cuerpo que sigue la cámara</dd>
            </div>
            <div>
              <dt>0</dt>
              <dd>videos que salen de tu dispositivo</dd>
            </div>
            <div>
              <dt>5</dt>
              <dd>ejercicios con corrección de técnica</dd>
            </div>
          </dl>
        </div>

        <div className="access__ticker">
          <Marquee items={TICKER} label="Ejercicios que corrige FitMentor" />
        </div>
      </section>

      <main className="access__panel" id="main">
        <svg className="access__arc" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="access-arc" x1="6" y1="30" x2="42" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#19e3a1" />
              <stop offset="1" stopColor="#d4ff3a" />
            </linearGradient>
          </defs>
          <path d="M12.3 38.97A19 19 0 1 1 35.7 38.97" fill="none" stroke="url(#access-arc)" strokeWidth="0.5" strokeLinecap="round" />
        </svg>

        <div className="login-glass" data-mode={mode} onPointerMove={onGlassMove}>
          <div className="login-glass__head">
            <span className="login-glass__step swap" key={mode}>
              {register ? "Nueva cuenta" : "Acceso"}
            </span>
            <span className="login-glass__secure">
              <Lock size={13} strokeWidth={2.4} aria-hidden="true" />
              Conexión cifrada
            </span>
          </div>
          <h2 className="login-glass__title swap swap--title" key={`t-${mode}`}>
            {register ? "Crea tu cuenta" : "Bienvenido de nuevo"}
          </h2>
          <p className="login-glass__lead">
            {register ? "Un minuto para registrarte y tu primera sesión queda lista." : "Entra para seguir donde dejaste tu entrenamiento."}
          </p>
          <AuthPanel onModeChange={setMode} />
        </div>
      </main>
    </div>
  );
}
