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
  mascot?: MascotState;
  tone?: "paper" | "ink";
  /** Cifras o acciones bajo el texto. */
  children?: ReactNode;
  className?: string;
}

/** Cabecera de las páginas internas: título en máscara que sube línea a línea, cifras clave y Rep al costado. */
export function PageHero({ kicker, title, accent, lead, mascot = "idle", tone = "paper", children, className = "" }: PageHeroProps) {
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
    <header ref={root} className={`p2-hero p2-hero--${tone} ${className}`.trim()}>
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
      <PageMascot state={mascot} size={112} />
    </header>
  );
}
