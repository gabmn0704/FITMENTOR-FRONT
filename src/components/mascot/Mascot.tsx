import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { MASCOT_LABELS, MASCOT_NAME, mascotPhrase, type MascotState } from "../../lib/mascot";
import { MOTION_OK, loadGsap, prefersReducedMotion } from "../../brand/gsap";
import { animateMascot, popCount } from "./mascotMotion";

export interface MascotProps {
  /** Estado emocional: define cara, brazos y movimiento. */
  state?: MascotState;
  /** Alto del personaje en píxeles. */
  size?: number;
  /** Texto del globo. `true` muestra frases que cambian solas según el estado; un texto fija el mensaje. */
  message?: string | boolean;
  /** Número que se muestra cuando el estado es `count`. */
  count?: number;
  /** Dónde va el globo respecto al personaje. */
  placement?: "right" | "left" | "top";
  /** Hace que responda al toque o clic con un salto y una frase nueva. */
  interactive?: boolean;
  /** Los ojos siguen al puntero. Se desactiva solo con "menos movimiento". */
  lookAt?: boolean;
  className?: string;
}

const ROTATE_MS = 7000;
const INK = "#04140e";

/** Texto del globo: fijo o rotando frases del estado. */
function useMessage(state: MascotState, message: string | boolean | undefined, bump: number): string | null {
  const auto = message === true;
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000));

  useEffect(() => {
    if (!auto) return;
    setSeed((value) => value + 1);
    const id = window.setInterval(() => setSeed((value) => value + 1), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [auto, state]);

  if (typeof message === "string") return message;
  if (!auto) return null;
  return mascotPhrase(state, seed + bump);
}

/**
 * Pose de reposo de cada estado (grados y píxeles del lienzo 120x142). Es lo que se ve sin animación
 * y desde donde GSAP mueve las capas internas. Brazos: hombro (a) y codo (b); positivo = sentido horario.
 */
interface Pose {
  lA: number;
  lB: number;
  rA: number;
  rB: number;
  lid: number;
  brow: [number, number, number];
  look: [number, number];
  y: number;
}

const POSES: Record<MascotState, Pose> = {
  idle: { lA: 16, lB: -18, rA: -14, rB: 26, lid: 0, brow: [0, 0, 0], look: [0, 0], y: 0 },
  wave: { lA: 14, lB: -16, rA: -146, rB: -14, lid: 0, brow: [0, -2, 0], look: [0.6, -0.4], y: 0 },
  cheer: { lA: 148, lB: -26, rA: -148, rB: 26, lid: 0, brow: [0, -3, 0], look: [0, 0], y: 0 },
  count: { lA: 22, lB: -60, rA: -16, rB: 120, lid: 0.12, brow: [0, 1, -9], look: [0.4, 0.2], y: 1 },
  rest: { lA: 8, lB: -4, rA: -8, rB: 4, lid: 0.86, brow: [0, 2, 4], look: [0, 1], y: 2 },
  celebrate: { lA: 158, lB: -12, rA: -158, rB: 12, lid: 0, brow: [0, -4, 0], look: [0, -0.5], y: 0 },
  worried: { lA: -26, lB: -52, rA: 26, rB: 52, lid: 0.22, brow: [0, -1, 16], look: [-0.5, 0.8], y: 0 },
};

const SPARKS: Array<[number, number, number]> = [
  [10, 42, 0],
  [110, 38, 1],
  [6, 80, 2],
  [114, 78, 3],
  [22, 16, 4],
  [100, 12, 5],
];

const rot = (deg: number): CSSProperties => ({ transform: `rotate(${deg}deg)` });

/** Segmento de brazo o pierna: una cápsula de (0,0) a (0,len). */
function Capsule({ len, w, fill, className }: { len: number; w: number; fill: string; className?: string }) {
  return <rect className={className} x={-w / 2} y={-w / 2} width={w} height={len + w} rx={w / 2} fill={fill} />;
}

/**
 * Rep, la mascota de FitMentor: un personaje de volumen (luz de borde, brillo, sombra de contacto) con cinta
 * bermellón, ojos con párpados, cejas, brazos y piernas articulados y una mancuerna.
 * Estados `idle`, `wave`, `cheer`, `count`, `rest`, `celebrate` y `worried`. La pose es SVG puro;
 * el movimiento (respiración, parpadeo, saltos con squash & stretch, confeti) lo pone GSAP, que se descarga aparte.
 */
export function Mascot({
  state = "idle",
  size = 160,
  message,
  count,
  placement = "right",
  interactive = false,
  lookAt = true,
  className,
}: MascotProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${uid}-${name})`;
  const [override, setOverride] = useState<MascotState | null>(null);
  const [bump, setBump] = useState(0);
  const current = override ?? state;
  const text = useMessage(current, message, bump);
  const svg = useRef<SVGSVGElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  const [gsapReady, setGsapReady] = useState(false);
  const gsapRef = useRef<Awaited<ReturnType<typeof loadGsap>>>(null);
  const pose = POSES[current];

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // GSAP llega en su propio archivo; mientras tanto Rep ya está dibujado en su pose.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let alive = true;
    void loadGsap().then((gsap) => {
      if (!alive || !gsap) return;
      gsapRef.current = gsap;
      setGsapReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Una línea de tiempo por estado; se revierte entera al cambiar de estado.
  useEffect(() => {
    const gsap = gsapRef.current;
    const el = svg.current;
    if (!gsapReady || !gsap || !el) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => animateMascot(gsap, el, current));
    return () => mm.revert();
  }, [gsapReady, current]);

  // El número salta cada vez que cambia la cuenta.
  useEffect(() => {
    const gsap = gsapRef.current;
    if (!gsapReady || !gsap || !svg.current || current !== "count" || count === undefined) return;
    if (prefersReducedMotion()) return;
    return popCount(gsap, svg.current);
  }, [gsapReady, current, count]);

  // Los ojos miran hacia el puntero y la cara gira un poco con ellos, sin renders de React.
  useEffect(() => {
    if (!lookAt || typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches !== false) return;
    if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches !== true) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = root.current?.querySelector(".mascot__figure")?.getBoundingClientRect();
        const host = svg.current;
        if (!box || !host) return;
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height * 0.42);
        const dist = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, dist / 320);
        const ux = (dx / dist) * reach;
        const uy = (dy / dist) * reach;
        host.style.setProperty("--look-x", `${(ux * 2.8).toFixed(2)}px`);
        host.style.setProperty("--look-y", `${(uy * 2.6).toFixed(2)}px`);
        host.style.setProperty("--face-x", `${(ux * 1.6).toFixed(2)}px`);
        host.style.setProperty("--face-y", `${(uy * 1.2).toFixed(2)}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [lookAt]);

  const poke = () => {
    window.clearTimeout(timer.current);
    setOverride("cheer");
    setBump((value) => value + 1);
    timer.current = window.setTimeout(() => setOverride(null), 1600);
  };

  const happyEyes = current === "cheer" || current === "celebrate";
  const openMouth = current === "wave" || current === "cheer" || current === "celebrate";
  const holdsBell = current === "idle" || current === "count";
  const label = `${MASCOT_NAME}, la mascota de FitMentor, ${MASCOT_LABELS[current]}`;

  const eye = (cx: number, side: "l" | "r") => (
    <g className={`m-eye m-eye--${side}`}>
      <g clipPath={url(`eye-${side}`)}>
        <ellipse cx={cx} cy="63" rx="8.4" ry="9.8" fill={url("sclera")} />
        <g className="m-iris-pose" style={{ transform: `translate(${pose.look[0] * 2}px, ${pose.look[1] * 2}px)` }}>
          <g className="m-iris">
            <circle cx={cx + 0.6} cy="64" r="5.9" fill={url("iris")} />
            <circle cx={cx + 0.6} cy="64" r="2.9" fill="#05061a" />
            <circle cx={cx + 2.8} cy="61.4" r="1.9" fill="#fff" />
            <circle cx={cx - 1.4} cy="66.4" r="0.85" fill="#fff" opacity="0.85" />
          </g>
        </g>
        <g className="m-lid-pose" style={{ transform: `translateY(${pose.lid * 19.6}px)` }}>
          <g className="m-lid">
            <rect x={cx - 10} y={63 - 9.8 - 22} width="20" height="22" fill={url("lid")} />
            <path d={`M${cx - 10} ${63 - 9.8} H${cx + 10}`} stroke={INK} strokeWidth="1.6" opacity="0.55" />
          </g>
        </g>
      </g>
      {pose.lid < 0.5 && (
        <ellipse cx={cx} cy="63" rx="8.4" ry="9.8" fill="none" stroke="#06573a" strokeOpacity="0.35" strokeWidth="1" />
      )}
    </g>
  );

  const figure = (
    <svg
      ref={svg}
      className="mascot__svg"
      viewBox="0 0 120 142"
      width={(size * 120) / 142}
      height={size}
      role={interactive ? undefined : "img"}
      aria-label={interactive ? undefined : label}
      aria-hidden={interactive ? true : undefined}
      focusable="false"
    >
      <defs>
        <radialGradient id={id("body")} cx="0.36" cy="0.26" r="0.86">
          <stop offset="0" stopColor="#8ff5cf" />
          <stop offset="0.38" stopColor="#19e3a1" />
          <stop offset="0.8" stopColor="#0fb27f" />
          <stop offset="1" stopColor="#0a7a53" />
        </radialGradient>
        <linearGradient id={id("rim")} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#6ff0b4" stopOpacity="0" />
          <stop offset="0.7" stopColor="#7df0c0" stopOpacity="0.2" />
          <stop offset="1" stopColor="#c3ffe0" />
        </linearGradient>
        <radialGradient id={id("ao")} cx="0.5" cy="1" r="0.75">
          <stop offset="0" stopColor="#02261a" stopOpacity="0.75" />
          <stop offset="1" stopColor="#02261a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("spec")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("limb")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2ee8ae" />
          <stop offset="1" stopColor="#0c8f63" />
        </linearGradient>
        <linearGradient id={id("leg")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1b2e27" />
          <stop offset="1" stopColor="#0a1612" />
        </linearGradient>
        <radialGradient id={id("glove")} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#cdeedd" />
        </radialGradient>
        <linearGradient id={id("band")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6ff7a" />
          <stop offset="0.5" stopColor="#d4ff3a" />
          <stop offset="1" stopColor="#9bc21a" />
        </linearGradient>
        <linearGradient id={id("shoe")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dcff5a" />
          <stop offset="1" stopColor="#a8d41a" />
        </linearGradient>
        <linearGradient id={id("sclera")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d8f3e6" />
        </linearGradient>
        <radialGradient id={id("iris")} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#2ee8ae" />
          <stop offset="0.6" stopColor="#0a4a35" />
          <stop offset="1" stopColor="#04140e" />
        </radialGradient>
        <linearGradient id={id("lid")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3df0b4" />
          <stop offset="1" stopColor="#19e3a1" />
        </linearGradient>
        <radialGradient id={id("badge")} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#e6ff7a" />
          <stop offset="0.55" stopColor="#d4ff3a" />
          <stop offset="1" stopColor="#9bc21a" />
        </radialGradient>
        <radialGradient id={id("shadow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#04120d" stopOpacity="0.42" />
          <stop offset="0.6" stopColor="#04120d" stopOpacity="0.16" />
          <stop offset="1" stopColor="#04120d" stopOpacity="0" />
        </radialGradient>
        <clipPath id={id("clip")}>
          <path d="M60 19C84 19 99 43 99 73C99 98 83 114 60 114C37 114 21 98 21 73C21 43 36 19 60 19Z" />
        </clipPath>
        <clipPath id={id("eye-l")}>
          <ellipse cx="47" cy="63" rx="8.4" ry="9.8" />
        </clipPath>
        <clipPath id={id("eye-r")}>
          <ellipse cx="73" cy="63" rx="8.4" ry="9.8" />
        </clipPath>
        <filter id={id("soft")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      <ellipse className="m-shadow" cx="60" cy="135" rx="34" ry="5.5" fill={url("shadow")} />

      {current === "rest" && (
        <g className="m-floor-bell" transform="translate(98 130) rotate(-8)">
          <rect x="-9" y="-1.3" width="18" height="2.6" rx="1.3" fill="#2f5a49" />
          <rect x="-11" y="-5.5" width="4.6" height="11" rx="1.6" fill="#0f2a21" />
          <rect x="6.4" y="-5.5" width="4.6" height="11" rx="1.6" fill="#0f2a21" />
        </g>
      )}

      <g className="m-rig-pose" style={{ transform: `translateY(${pose.y}px)` }}>
        <g className="m-rig">
          {/* Piernas: muslo, rodilla, espinilla y tenis */}
          {(
            [
              ["l", 48.5, -1],
              ["r", 71.5, 1],
            ] as const
          ).map(([side, x, dir]) => (
            <g key={side} transform={`translate(${x} 104)`}>
              <g className={`m-leg m-leg--${side}`}>
                <Capsule len={10} w={10.5} fill={url("leg")} />
                <g transform="translate(0 10)">
                  <g className={`m-shin m-shin--${side}`}>
                    <Capsule len={9} w={9.5} fill={url("leg")} />
                    <g transform={`translate(0 13) scale(${dir} 1)`}>
                      <path d="M5 -5.2C5 -7 3.8 -8 2 -8H-3.4C-8.6 -8 -12.5 -4.6 -12.5 -0.4V0.8H5Z" fill={url("shoe")} />
                      <rect x="-13" y="0.2" width="18.6" height="3.4" rx="1.7" fill="#f4f6fb" />
                      <path d="M-6.5 -6.4L-2.4 -3.2M-3.2 -7.6L0.6 -4.4" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
                    </g>
                  </g>
                </g>
              </g>
            </g>
          ))}

          <g className="m-torso">
            {/* Cuerpo con volumen */}
            <path d="M60 19C84 19 99 43 99 73C99 98 83 114 60 114C37 114 21 98 21 73C21 43 36 19 60 19Z" fill="#b8f5d8" />
            <g clipPath={url("clip")}>
              <path
                d="M60 19C84 19 99 43 99 73C99 98 83 114 60 114C37 114 21 98 21 73C21 43 36 19 60 19Z"
                fill={url("body")}
                transform="translate(-1.6 -0.8)"
              />
              <path d="M96 40C104 62 102 92 84 110" fill="none" stroke={url("rim")} strokeWidth="5" filter={url("soft")} opacity="0.75" />
              <ellipse cx="60" cy="118" rx="44" ry="20" fill={url("ao")} />
              <ellipse cx="60" cy="96" rx="20" ry="13" fill="#fff" opacity="0.08" />

              {/* Cinta de la cabeza */}
              <path d="M14 37Q60 23 106 37V47Q60 33 14 47Z" fill={url("band")} />
              <path d="M14 38.6Q60 24.6 106 38.6" fill="none" stroke="#f3ffc4" strokeWidth="1.1" opacity="0.6" />
              <path d="M14 47Q60 33 106 47" fill="none" stroke="#4f6b0a" strokeWidth="1.4" opacity="0.35" />
            </g>

            {/* Brillos */}
            <ellipse cx="42" cy="31" rx="12" ry="6.5" fill={url("spec")} transform="rotate(-28 42 31)" />
            <circle cx="37.5" cy="29.5" r="2.1" fill="#fff" opacity="0.9" />

            {/* Nudo y puntas de la cinta */}
            <g className="m-knot" transform="translate(0 -4)">
              <g className="m-tail m-tail--a">
                <path d="M96.5 44.5C104 42 110 37 113 31C112 38 108 45 100 48.5Z" fill={url("band")} />
              </g>
              <g className="m-tail m-tail--b">
                <path d="M97 47C104 48.5 110 52 113.5 57.5C107.5 55.5 102 53.5 97 51.5Z" fill="#c8ee2a" />
              </g>
              <ellipse cx="97" cy="46.5" rx="3.6" ry="4.4" fill={url("band")} />
            </g>

            {/* Cara */}
            <g className="m-face" style={{ transform: "translate(var(--face-x, 0px), var(--face-y, 0px))" }}>
              <ellipse cx="34.5" cy="77" rx="6.5" ry="3.8" fill="#ff6a8a" opacity="0.55" filter={url("soft")} />
              <ellipse cx="85.5" cy="77" rx="6.5" ry="3.8" fill="#ff6a8a" opacity="0.55" filter={url("soft")} />

              {happyEyes ? (
                <g fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" className="m-happy">
                  <path className="m-happy-eye" d="M39.5 65Q47 55.5 54.5 65" />
                  <path className="m-happy-eye" d="M65.5 65Q73 55.5 80.5 65" />
                </g>
              ) : (
                <g className="m-eyes" style={{ transform: "translate(var(--look-x, 0px), var(--look-y, 0px))" }}>
                  {eye(47, "l")}
                  {eye(73, "r")}
                </g>
              )}

              <g fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round">
                <g className="m-brow-pose" style={{ transform: `translateY(${pose.brow[1]}px)` }}>
                  <g className="m-brows">
                    <path
                      className="m-brow m-brow--l"
                      d="M40 49.5Q46.5 46.6 53 48.6"
                      style={{ transform: `rotate(${-pose.brow[2]}deg)`, transformOrigin: "53px 48.6px" }}
                    />
                    <path
                      className="m-brow m-brow--r"
                      d="M80 49.5Q73.5 46.6 67 48.6"
                      style={{ transform: `rotate(${pose.brow[2]}deg)`, transformOrigin: "67px 48.6px" }}
                    />
                  </g>
                </g>
              </g>

              {/* Boca */}
              <g className="m-mouth">
                {current === "idle" && (
                  <path d="M52.5 81Q60 88 67.5 81" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
                )}
                {openMouth && (
                  <g className="m-mouth--open">
                    <path d="M49.5 79.5H70.5Q70.5 93 60 93Q49.5 93 49.5 79.5Z" fill="#2a0718" />
                    <path d="M52 79.5H68V81.6Q60 83 52 81.6Z" fill="#fff" />
                    <ellipse cx="60" cy="89.6" rx="6.2" ry="3.4" fill="#ff5a73" />
                  </g>
                )}
                {current === "count" && (
                  <g className="m-mouth--puff">
                    <ellipse cx="60" cy="84" rx="4.2" ry="4.6" fill="#2a0718" />
                    <ellipse cx="60" cy="85.8" rx="2.4" ry="1.4" fill="#ff5a73" />
                  </g>
                )}
                {current === "rest" && (
                  <path d="M55 83Q60 86.4 65 83" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
                )}
                {current === "worried" && (
                  <path
                    d="M50.5 86Q53 82.5 55.5 85.4T60.5 85.4T65.5 85.4T70 84.6"
                    fill="none"
                    stroke={INK}
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </g>
            </g>

            {/* Pecho: la marca en pequeño */}
            <g transform="translate(60 101)" opacity="0.92">
              <path d="M-4.6 4.8A7 7 0 1 1 4.6 4.8" fill="none" stroke="#f6f8ff" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
              <path d="M-2 3.6V-3.4H2.4M-2 0.2H0.6" fill="none" stroke="#f6f8ff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="1.6" cy="0.2" r="1.25" fill="#d4ff3a" />
            </g>
          </g>

          {/* Brazos: hombro y codo; la mano derecha sostiene la mancuerna */}
          {(
            [
              ["l", 24.5, pose.lA, pose.lB],
              ["r", 95.5, pose.rA, pose.rB],
            ] as const
          ).map(([side, x, a, b]) => (
            <g key={side} transform={`translate(${x} 77)`}>
              <g className="m-arm-pose" style={rot(a)}>
                <g className={`m-arm m-arm--${side}`}>
                  <Capsule len={13} w={9} fill={url("limb")} />
                  <g transform="translate(0 13)">
                    <g className="m-fore-pose" style={rot(b)}>
                      <g className={`m-fore m-fore--${side}`}>
                        <Capsule len={12} w={8.4} fill={url("limb")} />
                        {side === "r" && holdsBell && (
                          <g className="m-bell" transform="translate(0 16)">
                            <rect x="-11" y="-1.3" width="22" height="2.6" rx="1.3" fill="#2f5a49" />
                            <rect x="-13.5" y="-6" width="5" height="12" rx="1.8" fill="#0f2a21" />
                            <rect x="8.5" y="-6" width="5" height="12" rx="1.8" fill="#0f2a21" />
                            <rect x="-12.6" y="-5" width="1.4" height="10" rx="0.7" fill="#fff" opacity="0.28" />
                            <rect x="9.4" y="-5" width="1.4" height="10" rx="0.7" fill="#fff" opacity="0.28" />
                          </g>
                        )}
                        <circle cx="0" cy="15" r="6.2" fill={url("glove")} />
                        <path d="M-3.4 12.4Q-6.4 14 -5.4 17" fill="none" stroke="#9ccdb8" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
          ))}
        </g>
      </g>

      {/* Extras por estado */}
      {current === "worried" && (
        <path className="m-sweat" d="M104 52Q98 60 98 64A6 6 0 0 0 110 64Q110 60 104 52Z" fill="#b8f5e0" stroke="#fff" strokeOpacity="0.6" />
      )}
      {current === "rest" && (
        <g className="m-zzz" fill="#8ff5cf" fontWeight="800" fontFamily="'Outfit Variable', system-ui, sans-serif">
          <text x="94" y="34" fontSize="13">
            z
          </text>
          <text x="102" y="22" fontSize="10">
            z
          </text>
          <text x="108" y="12" fontSize="8">
            z
          </text>
        </g>
      )}
      {(current === "celebrate" || current === "cheer") && (
        <g className="m-sparks" fill="#ffc400">
          {SPARKS.map(([x, y, i]) => (
            <path
              key={i}
              className="m-spark"
              d={`M${x} ${y - 6}l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z`}
            />
          ))}
        </g>
      )}
      <g className="m-confetti" aria-hidden="true" />
      {current === "count" && count !== undefined && (
        <g key={count} className="m-count">
          <circle cx="101" cy="25" r="16" fill={url("badge")} />
          <circle cx="101" cy="25" r="16" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" />
          <text
            className="m-count__num"
            x="101"
            y="31"
            textAnchor="middle"
            fontSize={count > 99 ? 13 : 17}
            fontWeight="800"
            fontFamily="'Outfit Variable', system-ui, sans-serif"
            fill="#fff"
          >
            {count}
          </text>
          <text className="m-count__plus" x="86" y="12" fontSize="9" fontWeight="800" fontFamily="'Outfit Variable', system-ui, sans-serif" fill="#d4ff3a" opacity="0">
            +1
          </text>
        </g>
      )}
    </svg>
  );

  return (
    <div
      ref={root}
      className={["mascot", `mascot--${placement}`, className].filter(Boolean).join(" ")}
      data-state={current}
      style={{ "--mascot-size": `${size}px` } as CSSProperties}
    >
      {interactive ? (
        <button
          type="button"
          className="mascot__figure mascot__figure--button"
          aria-label={`${label}. Tócame para que te anime`}
          onClick={poke}
        >
          {figure}
        </button>
      ) : (
        <div className="mascot__figure">{figure}</div>
      )}
      {text && (
        <p className="mascot__bubble" key={text} role="status" aria-live="polite">
          {text}
        </p>
      )}
    </div>
  );
}
