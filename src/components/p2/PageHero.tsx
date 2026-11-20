import { useRef, type ReactNode } from "react";
import { PageMascot } from "../mascot/PageMascot";
import type { MascotState } from "../../lib/mascot";
import { gsap, useGSAP, withMotion } from "./motion";

interface PageHeroProps {
  /** Línea corta sobre el título (estado, semana, nivel). */
  kicker?: ReactNode;
  /** Título en una o dos líneas: nunca más de dos. */
  title: readonly [string] | readonly [string, string];
  /** Línea del título que va en color de acento. */
  accent?: 0 | 1;
  lead?: ReactNode;
  /** Datos útiles al costado (cifras, semana). Solo contenido real, nunca decoración. */
  aside?: ReactNode;
  /** Rep, la mascota, al costado de la cabecera. */
  mascot?: MascotState;
  tone?: "paper" | "ink";
  /** Cifras o acciones bajo el texto. */
  children?: ReactNode;
  className?: string;
}

/** Cabecera de las páginas internas: título en máscara que sube línea a línea, y cifras clave. */
export function PageHero({ kicker, title, accent, lead, aside, mascot, tone = "paper", children, className = "" }: PageHeroProps) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () =>
      withMotion(() => {
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.from("[data-hero-line]", { yPercent: 110, duration: 1.1, stagger: 0.09 })
          .from("[data-hero-fade]", { y: 14, autoAlpha: 0, duration: 0.8, stagger: 0.07, clearProps: "all" }, "-=0.8")
          .from(".p2-hero__glow", { scale: 0.6, autoAlpha: 0, duration: 1.6, ease: "power2.out" }, 0);
      }),
    { scope: root },
  );

  return (
    <header ref={root} className={`p2-hero p2-hero--${tone} ${aside ? "p2-hero--aside" : ""} ${className}`.trim()}>
      <span className="p2-hero__glow" aria-hidden="true" />
      <span className="p2-hero__grid" aria-hidden="true" />
      <div className="p2-hero__copy">
        {kicker && (
          <p className="p2-hero__kicker" data-hero-fade>
            {kicker}
          </p>
        )}
        <h1 className="p2-hero__title">
          {title.map((line, index) => (
            <span key={line} className="p2-mask">
              <span data-hero-line className={accent === index ? "p2-hero__accent" : undefined}>
                {line}
              </span>
            </span>
          ))}
        </h1>
        {lead && (
          <p className="p2-hero__lead" data-hero-fade>
            {lead}
          </p>
        )}
        {children && (
          <div className="p2-hero__extra" data-hero-fade>
            {children}
          </div>
        )}
      </div>
      {aside && (
        <div className="p2-hero__aside" data-hero-fade>
          {aside}
        </div>
      )}
      {mascot && <PageMascot state={mascot} size={112} />}
    </header>
  );
}

export interface HeroFigure {
  label: string;
  value: ReactNode;
  note?: string;
}

/** Cifras clave de la cabecera: valor grande y etiqueta corta. */
export function HeroFigures({ items }: { items: HeroFigure[] }) {
  return (
    <dl className="p2-figures">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd className="tabular">{item.value}</dd>
          {item.note && <small>{item.note}</small>}
        </div>
      ))}
    </dl>
  );
}

/** Siete columnas con las repeticiones de cada día; hoy resaltado. */
export function HeroWeek({ days }: { days: Array<{ label: string; value: number; today?: boolean }> }) {
  const max = Math.max(1, ...days.map((d) => d.value));
  return (
    <ol className="p2-week" aria-label="Repeticiones de los últimos siete días">
      {days.map((day, index) => (
        <li key={`${day.label}-${index}`} className={day.today ? "is-today" : undefined}>
          <span className="p2-week__bar" style={{ ["--v" as string]: Math.max(0.06, day.value / max) }} />
          <span className="p2-week__num tabular">{day.value}</span>
          <span className="p2-week__day">{day.label}</span>
        </li>
      ))}
    </ol>
  );
}
