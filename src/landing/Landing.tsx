import { useRef } from "react";
import { ArrowRight, Bot, Camera, CalendarDays, ShieldCheck, Trophy } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Logo } from "../brand/Logo";
import { EXERCISE_LIST } from "../lib/exercises";
import { AuthPanel } from "./AuthPanel";
import { PoseArt } from "./PoseArt";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const REVEAL_TEXT =
  "Tu cámara mide los ángulos de tus articulaciones, cuenta cada repetición y te dice qué corregir antes de que se vuelva una lesión. Todo ocurre en tu dispositivo, sin enviar video a ningún servidor.";

const SLICES = [
  {
    id: "camara",
    icon: Camera,
    title: "Postura en vivo",
    text: "Detecta 33 puntos del cuerpo y mide rodillas, cadera y espalda en cada cuadro.",
  },
  {
    id: "coach",
    icon: Bot,
    title: "Coach que responde",
    text: "Pregunta por técnica, descanso o progresión y recibe consejos según tu nivel.",
  },
  {
    id: "rutina",
    icon: CalendarDays,
    title: "Rutina adaptable",
    text: "Un plan semanal que sube o baja la carga según tu precisión y constancia.",
  },
  {
    id: "logros",
    icon: Trophy,
    title: "Logros y rachas",
    text: "Insignias, historial y gráficas para que la constancia se vea.",
  },
];

function goToAccess() {
  const panel = document.getElementById("acceso");
  panel?.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => document.getElementById("auth-email")?.focus({ preventScroll: true }), 450);
}

export function Landing() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".lp-hero__reveal", { y: 36, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.12 });

        gsap.fromTo(
          ".lp-word",
          { opacity: 0.12 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.08,
            scrollTrigger: { trigger: ".lp-reveal", start: "top 75%", end: "bottom 45%", scrub: true },
          },
        );

        gsap.utils.toArray<HTMLElement>(".lp-scale").forEach((el) => {
          gsap
            .timeline({
              scrollTrigger: { trigger: el, start: "top 90%", end: "bottom 10%", scrub: true },
            })
            .fromTo(el, { scale: 0.82, opacity: 0.4 }, { scale: 1, opacity: 1, ease: "none", duration: 0.35 })
            .to(el, { scale: 1, opacity: 1, duration: 0.3 })
            .to(el, { opacity: 0.2, ease: "none", duration: 0.35 });
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([".lp-word", ".lp-scale", ".lp-hero__reveal"], { clearProps: "all" });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  const words = REVEAL_TEXT.split(" ");
  const marquee = [...EXERCISE_LIST, ...EXERCISE_LIST, ...EXERCISE_LIST];

  return (
    <div ref={root} className="lp">
      <header className="lp-nav">
        <a className="lp-nav__brand" href="#inicio" aria-label="FitMentor, inicio">
          <Logo size={30} />
        </a>
        <nav className="lp-nav__links" aria-label="Secciones">
          <a href="#funciones">Funciones</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#acceso">Acceso</a>
        </nav>
        <button type="button" className="lp-btn lp-btn--light lp-nav__cta" onClick={goToAccess}>
          Entrar
        </button>
      </header>

      <main className="lp-main" id="main">
        <section className="lp-hero" id="inicio">
          <div className="lp-hero__bg" aria-hidden="true">
            <PoseArt className="lp-hero__pose" labels={false} />
          </div>
          <div className="lp-hero__content">
            <h1 className="lp-hero__title lp-hero__reveal">
              Corrige tu postura
              <span className="lp-pill lp-pill--lime" aria-hidden="true">
                <Camera size={22} />
              </span>
              en tiempo real, directo en tu
              <span className="lp-pill lp-pill--orange" aria-hidden="true">
                <ShieldCheck size={22} />
              </span>
              navegador.
            </h1>
            <p className="lp-hero__lead lp-hero__reveal">
              FitMentor usa tu cámara y visión por computadora para contar repeticiones y avisarte qué ajustar, sin
              enviar tu video a ningún servidor.
            </p>
            <div className="lp-hero__actions lp-hero__reveal">
              <button type="button" className="lp-btn lp-btn--lime" onClick={goToAccess}>
                Empezar gratis
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <a className="lp-btn lp-btn--glass" href="#como-funciona">
                Ver cómo funciona
              </a>
            </div>
          </div>
        </section>

        <section className="lp-marquee" aria-label="Ejercicios compatibles">
          <div className="lp-marquee__track" aria-hidden="true">
            {marquee.map((exercise, index) => (
              <span key={`${exercise.id}-${index}`} className="lp-marquee__item">
                {exercise.label}
                <i />
              </span>
            ))}
          </div>
          <ul className="sr-only">
            {EXERCISE_LIST.map((exercise) => (
              <li key={exercise.id}>{exercise.label}</li>
            ))}
          </ul>
        </section>

        <section className="lp-section" id="funciones">
          <div className="lp-section__head">
            <h2>Un entrenador que ve lo que tú no puedes ver.</h2>
          </div>
          <div className="lp-bento">
            <article className="lp-card lp-card--a lp-scale">
              <PoseArt className="lp-card__pose" />
              <div className="lp-card__copy">
                <h3>Postura medida, no adivinada</h3>
                <p>Cada articulación se mide en grados y se compara con el rango seguro del ejercicio.</p>
              </div>
            </article>
            <article className="lp-card lp-card--b">
              <ShieldCheck size={28} aria-hidden="true" />
              <h3>Privado por diseño</h3>
              <p>El video se procesa en tu dispositivo y nunca se sube.</p>
            </article>
            <article className="lp-card lp-card--c">
              <div className="lp-chat" aria-hidden="true">
                <span className="lp-chat__bubble lp-chat__bubble--user">¿Por qué me duele la rodilla?</span>
                <span className="lp-chat__bubble">Empuja las rodillas hacia afuera y baja más despacio.</span>
              </div>
              <h3>Coach con IA</h3>
            </article>
            <article className="lp-card lp-card--d">
              <div className="lp-bars" aria-hidden="true">
                {[38, 52, 46, 68, 61, 80, 92].map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="lp-card__copy">
                <h3>Rutinas que evolucionan contigo</h3>
                <p>Historial, racha y logros para ver tu progreso semana a semana.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="lp-section lp-reveal" id="como-funciona">
          <p className="lp-reveal__text">
            {words.map((word, index) => (
              <span key={index} className="lp-word">
                {word}{" "}
              </span>
            ))}
          </p>
        </section>

        <section className="lp-section">
          <div className="lp-section__head">
            <h2>Todo lo que necesitas para entrenar mejor.</h2>
          </div>
          <div className="lp-accordion">
            {SLICES.map(({ id, icon: Icon, title, text }) => (
              <article key={id} className="lp-slice" tabIndex={0}>
                <Icon size={26} aria-hidden="true" />
                <div className="lp-slice__body">
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section lp-cta">
          <div className="lp-cta__copy">
            <h2>Tu primera sesión está a un clic.</h2>
            <p>
              Crea tu cuenta para guardar tu progreso en cualquier dispositivo, o entra como invitado y empieza en
              segundos.
            </p>
          </div>
          <AuthPanel />
        </section>
      </main>

      <footer className="lp-footer">
        <Logo size={26} />
        <p>Proyecto académico de Patrones de Software. FitMentor no sustituye el consejo médico.</p>
      </footer>
    </div>
  );
}
