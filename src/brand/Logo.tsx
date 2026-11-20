import { useEffect, useId, useRef, useState } from "react";
import { MOTION_OK, loadGsap, prefersReducedMotion } from "./gsap";

/*
 * Marca de FitMentor: una "F" atlética dentro de un arco de repetición.
 * - El arco es el recorrido de una rep (de cobalto a bermellón, como el esfuerzo que sube) y queda abierto abajo:
 *   la rep que todavía falta.
 * - El brazo superior de la F termina en un disco de pesas; el brazo medio, en la articulación bermellón
 *   que la cámara sigue en cada repetición.
 */

const ARC = "M12.3 38.97A19 19 0 1 1 35.7 38.97";
const STEM = "M18.5 34.6V14.5H27.6";
const MID = "M18.5 24.6H24.4";

interface MarkProps {
  size?: number;
  className?: string;
  /** "brand": F en tinta para superficies claras. "inverse": F blanca sobre fondos oscuros. */
  tone?: "brand" | "inverse";
  /** Dibuja la marca al cargar y deja latiendo la articulación. Con `false` queda estática. */
  animated?: boolean;
  /** Oculta la marca a lectores de pantalla (cuando el texto ya dice "FitMentor"). */
  decorative?: boolean;
}

/** Solo la marca, en SVG. Se ve completa desde el primer pintado; GSAP la anima después si el usuario lo permite. */
export function LogoMark({ size = 36, className, tone = "brand", animated = true, decorative = false }: MarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const live = animated && !prefersReducedMotion();
  const [pending, setPending] = useState(live);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    let revert: (() => void) | undefined;
    void loadGsap().then((gsap) => {
      const svg = ref.current;
      if (cancelled || !svg) return;
      if (!gsap) {
        setPending(false);
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const q = gsap.utils.selector(svg);
        const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });
        tl.set(svg, { autoAlpha: 1 })
          .fromTo(q(".lm__arc"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.05 })
          .fromTo(q(".lm__stem"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.62 }, 0.18)
          .fromTo(q(".lm__mid"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.36, ease: "power2.out" }, 0.62)
          .fromTo(
            q(".lm__plate"),
            { scaleY: 0, scaleX: 0.4 },
            { scaleY: 1, scaleX: 1, duration: 0.6, ease: "back.out(2.6)", svgOrigin: "30 14.5" },
            0.7,
          )
          .fromTo(
            q(".lm__dot"),
            { scale: 0 },
            { scale: 1, duration: 0.8, ease: "elastic.out(1.1, 0.45)", svgOrigin: "27.6 24.6" },
            0.86,
          )
          .fromTo(q(".lm__glint"), { x: -40 }, { x: 44, duration: 0.9, ease: "power2.inOut" }, 1.05)
          .fromTo(q(".lm__halo"), { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power1.out" }, 0.9);

        // Latido: dos golpes y una pausa, con una onda que sale de la articulación.
        const beat = gsap.timeline({ repeat: -1, repeatDelay: 2.6, delay: 2 });
        beat
          .to(q(".lm__dot"), { scale: 1.3, duration: 0.12, ease: "power2.out", svgOrigin: "27.6 24.6" })
          .to(q(".lm__dot"), { scale: 1, duration: 0.16, ease: "power2.in", svgOrigin: "27.6 24.6" })
          .to(q(".lm__dot"), { scale: 1.18, duration: 0.11, ease: "power2.out", svgOrigin: "27.6 24.6" })
          .to(q(".lm__dot"), { scale: 1, duration: 0.3, ease: "power2.inOut", svgOrigin: "27.6 24.6" })
          .fromTo(
            q(".lm__ring"),
            { scale: 1, opacity: 0.9 },
            { scale: 3.2, opacity: 0, duration: 1.1, ease: "power2.out", svgOrigin: "27.6 24.6" },
            0,
          );
        setPending(false);
        return () => {
          tl.kill();
          beat.kill();
        };
      });
      mm.add("(prefers-reduced-motion: reduce)", () => setPending(false));
      revert = () => mm.revert();
    });
    return () => {
      cancelled = true;
      revert?.();
    };
  }, [live]);

  return (
    <svg
      ref={ref}
      className={["logo-mark", `logo-mark--${tone}`, live ? "logo-mark--live" : "", pending ? "is-pending" : "", className]
        .filter(Boolean)
        .join(" ")}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "FitMentor"}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-arc`} x1="6" y1="30" x2="42" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3b5bff" />
          <stop offset="0.5" stopColor="#8f46ff" />
          <stop offset="0.78" stopColor="#ff4f6b" />
          <stop offset="1" stopColor="#ff3d1f" />
        </linearGradient>
        <radialGradient id={`${uid}-dot`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffb199" />
          <stop offset="0.45" stopColor="#ff4a26" />
          <stop offset="1" stopColor="#d92a0c" />
        </radialGradient>
        <linearGradient id={`${uid}-glint`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${uid}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
          <g fill="none" stroke="#fff" strokeLinecap="round">
            <path d={ARC} strokeWidth="3.6" />
            <path d={STEM} strokeWidth="4.8" strokeLinejoin="round" />
            <path d={MID} strokeWidth="4.8" />
          </g>
          <rect x="28" y="9.5" width="4.4" height="10" rx="1.7" fill="#fff" />
        </mask>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {/* Resplandor suave bajo el arco */}
      <path className="lm__halo" d={ARC} fill="none" stroke={`url(#${uid}-arc)`} strokeWidth="4" opacity="0.55" filter={`url(#${uid}-glow)`} />
      <path className="lm__arc" d={ARC} pathLength={1} fill="none" stroke={`url(#${uid}-arc)`} strokeWidth="3.6" strokeLinecap="round" />

      <g className="lm__f" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path className="lm__stem" d={STEM} pathLength={1} strokeWidth="4.8" />
        <path className="lm__mid" d={MID} pathLength={1} strokeWidth="4.8" />
      </g>
      <rect className="lm__plate" x="28" y="9.5" width="4.4" height="10" rx="1.7" />

      <circle className="lm__ring" cx="27.6" cy="24.6" r="3.2" fill="none" stroke="#ff3d1f" strokeWidth="1.2" opacity="0" />
      <circle className="lm__dot" cx="27.6" cy="24.6" r="3.3" fill={`url(#${uid}-dot)`} />

      <g mask={`url(#${uid}-mask)`} aria-hidden="true">
        <g transform="rotate(18 24 24)">
          <rect className="lm__glint" x="0" y="-6" width="12" height="60" fill={`url(#${uid}-glint)`} transform="translate(-40 0)" opacity="0.9" />
        </g>
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

/** Marca + nombre. El nombre entra letra por letra después del trazo de la marca. */
export function Logo({ size = 36, markOnly, tone = "brand", animated = true, tagline, className }: LogoProps) {
  const word = useRef<HTMLSpanElement>(null);
  const live = animated && !markOnly && !prefersReducedMotion();

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    let revert: (() => void) | undefined;
    void loadGsap().then((gsap) => {
      if (cancelled || !gsap || !word.current) {
        word.current?.classList.remove("is-pending");
        return;
      }
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".logo__ch",
          { yPercent: 110, opacity: 0, rotate: 8 },
          { yPercent: 0, opacity: 1, rotate: 0, duration: 0.7, ease: "expo.out", stagger: 0.035, delay: 0.55 },
        );
        gsap.fromTo(".logo__tag", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 1.05 });
      }, word.current);
      word.current.classList.remove("is-pending");
      revert = () => ctx.revert();
    });
    return () => {
      cancelled = true;
      revert?.();
    };
  }, [live]);

  const letters = (text: string, offset: number) =>
    [...text].map((ch, i) => (
      <span key={i + offset} className="logo__ch" aria-hidden="true">
        {ch}
      </span>
    ));

  return (
    <span
      className={["logo", `logo--${tone}`, className].filter(Boolean).join(" ")}
      style={{ ["--logo-size" as string]: `${size}px` }}
    >
      <LogoMark size={size} tone={tone} animated={animated} decorative={!markOnly} />
      {!markOnly && (
        <span ref={word} className={["logo__text", live ? "is-pending" : ""].filter(Boolean).join(" ")}>
          <span className="logo__word">
            <span className="logo__fit">{letters("Fit", 0)}</span>
            <span className="logo__mentor">{letters("Mentor", 3)}</span>
            <span className="sr-only">FitMentor</span>
          </span>
          {tagline && <span className="logo__tag">{tagline}</span>}
        </span>
      )}
    </span>
  );
}
