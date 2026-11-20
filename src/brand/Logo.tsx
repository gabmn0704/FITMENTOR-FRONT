import { useEffect, useId, useRef } from "react";
import { MOTION_OK, loadGsap, prefersReducedMotion } from "./gsap";

/*
 * Marca de FitMentor: una "F" de corte inclinado (velocidad hacia adelante) y, a su lado, una flecha de
 * progreso. Baldosa oscura con degradado esmeralda a lima. La geometría es la misma de public/logo.svg.
 *
 * Animación: la flecha sube y la F se asienta una sola vez al montar; nada late ni gira de forma continua.
 */

const F_PATH = "M160 392V128h222l-40 64H224v52h74l-40 64h-34v84z";
const ARROW_PATH = "M308 392l50-80 50 80z";
const GLYPH_TRANSFORM = "translate(256 258) scale(1.1) translate(-281 -260)";

interface MarkProps {
  size?: number;
  className?: string;
  /** Compatibilidad: la baldosa es oscura en ambos temas, el tono solo cambia el texto del logotipo. */
  tone?: "brand" | "inverse";
  /** Entrada breve al montar. Con `false` queda estática. */
  animated?: boolean;
  /** Oculta la marca a lectores de pantalla (cuando el texto ya dice "FitMentor"). */
  decorative?: boolean;
}

/** Solo la marca, en SVG. Se ve completa desde el primer pintado; GSAP la anima después si el usuario lo permite. */
export function LogoMark({ size = 36, className, tone = "brand", animated = true, decorative = false }: MarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const live = animated && !prefersReducedMotion();

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    let revert: (() => void) | undefined;
    void loadGsap().then((gsap) => {
      const svg = ref.current;
      if (cancelled || !gsap || !svg) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const q = gsap.utils.selector(svg);
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.from(q(".lm__f"), { opacity: 0, x: -14, duration: 0.7 })
          .from(q(".lm__arrow"), { opacity: 0, y: 26, duration: 0.7 }, 0.12);
        return () => {
          tl.kill();
        };
      });
      revert = () => mm.revert();
    });
    return () => {
      cancelled = true;
      revert?.();
    };
  }, [live]);

  const grad = `${uid}-g`;
  return (
    <svg
      ref={ref}
      className={["logo-mark", `logo-mark--${tone}`, className].filter(Boolean).join(" ")}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "FitMentor"}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      <defs>
        <linearGradient id={grad} x1="130" y1="410" x2="390" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#19E3A1" />
          <stop offset="1" stopColor="#D4FF3A" />
        </linearGradient>
      </defs>
      <rect className="lm__tile" width="512" height="512" rx="116" fill="#0A0E13" />
      <g transform={GLYPH_TRANSFORM} fill={`url(#${grad})`} stroke={`url(#${grad})`} strokeWidth="24" strokeLinejoin="round">
        <path className="lm__f" d={F_PATH} />
        <path className="lm__arrow" d={ARROW_PATH} />
      </g>
    </svg>
  );
}

interface LogoProps {
  size?: number;
  /** Oculta el texto y deja solo la marca (barras laterales estrechas). */
  markOnly?: boolean;
  tone?: "brand" | "inverse";
  animated?: boolean;
  /** Línea pequeña bajo el nombre (pantalla de acceso). */
  tagline?: string;
  className?: string;
}

/** Marca + nombre. El nombre entra con un desplazamiento corto después de la marca. */
export function Logo({ size = 36, markOnly, tone = "brand", animated = true, tagline, className }: LogoProps) {
  const word = useRef<HTMLSpanElement>(null);
  const live = animated && !markOnly && !prefersReducedMotion();

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    let revert: (() => void) | undefined;
    void loadGsap().then((gsap) => {
      if (cancelled || !gsap || !word.current) return;
      const ctx = gsap.context(() => {
        gsap.from(".logo__word, .logo__tag", { opacity: 0, x: -8, duration: 0.6, ease: "expo.out", delay: 0.2, stagger: 0.08 });
      }, word.current);
      revert = () => ctx.revert();
    });
    return () => {
      cancelled = true;
      revert?.();
    };
  }, [live]);

  return (
    <span
      className={["logo", `logo--${tone}`, className].filter(Boolean).join(" ")}
      style={{ ["--logo-size" as string]: `${size}px` }}
    >
      <LogoMark size={size} tone={tone} animated={animated} decorative={!markOnly} />
      {!markOnly && (
        <span ref={word} className="logo__text">
          <span className="logo__word" aria-label="FitMentor">
            <span className="logo__fit" aria-hidden="true">Fit</span>
            <span className="logo__mentor" aria-hidden="true">Mentor</span>
          </span>
          {tagline && <span className="logo__tag">{tagline}</span>}
        </span>
      )}
    </span>
  );
}
