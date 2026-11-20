import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { MASCOT_LABELS, MASCOT_NAME, mascotPhrase, type MascotState } from "../../lib/mascot";

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
  /** Las pupilas siguen al puntero. Se desactiva solo con "menos movimiento". */
  lookAt?: boolean;
  className?: string;
}

const ROTATE_MS = 7000;
const INK = "#0a0c12";

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

const SPARKS: Array<[number, number, number]> = [
  [12, 40, 0],
  [108, 36, 1],
  [8, 78, 2],
  [112, 76, 3],
  [22, 16, 4],
  [98, 12, 5],
];

/**
 * Rep, la mascota de FitMentor: una pastilla cobalto con cinta bermellón que cuenta tus repeticiones.
 * Todo es SVG + CSS (sin imágenes): estados `idle`, `wave`, `cheer`, `count`, `rest`, `celebrate` y `worried`.
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
  const [override, setOverride] = useState<MascotState | null>(null);
  const [bump, setBump] = useState(0);
  const current = override ?? state;
  const text = useMessage(current, message, bump);
  const pupils = useRef<SVGGElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Las pupilas miran hacia el puntero sin provocar renders de React.
  useEffect(() => {
    if (!lookAt || typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches !== false) return;
    if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches !== true) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = root.current?.getBoundingClientRect();
        if (!box || !pupils.current) return;
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height * 0.45);
        const dist = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, dist / 260) * 2.6;
        pupils.current.style.transform = `translate(${((dx / dist) * reach).toFixed(2)}px, ${((dy / dist) * reach).toFixed(2)}px)`;
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
  const sleepyEyes = current === "rest";
  const openMouth = current === "wave" || current === "cheer" || current === "celebrate";
  const label = `${MASCOT_NAME}, la mascota de FitMentor, ${MASCOT_LABELS[current]}`;

  const figure = (
    <svg
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
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#4a63ff" />
          <stop offset="1" stopColor="#1b3bff" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <rect x="26" y="34" width="68" height="82" rx="30" />
        </clipPath>
      </defs>

      <ellipse className="m-shadow" cx="60" cy="136" rx="30" ry="5" fill="rgb(10 12 18 / 0.22)" />

      <g className="m-body">
        <g className="m-legs">
          <rect x="42" y="108" width="13" height="20" rx="6" fill={INK} />
          <rect x="65" y="108" width="13" height="20" rx="6" fill={INK} />
          <rect x="38" y="124" width="21" height="9" rx="4.5" fill="#ff3d1f" />
          <rect x="61" y="124" width="21" height="9" rx="4.5" fill="#ff3d1f" />
        </g>

        <g transform="translate(27 84)">
          <g className="m-arm m-arm--l">
            <rect x="-5" y="-3" width="10" height="29" rx="5" fill="#1328cf" />
            <circle cx="0" cy="28" r="7.5" fill="#f6f8ff" />
            <rect className="m-bell" x="-9" y="26" width="18" height="4.5" rx="2.2" fill={INK} />
          </g>
        </g>
        <g transform="translate(93 84)">
          <g className="m-arm m-arm--r">
            <rect x="-5" y="-3" width="10" height="29" rx="5" fill="#1328cf" />
            <circle cx="0" cy="28" r="7.5" fill="#f6f8ff" />
          </g>
        </g>

        <rect x="26" y="34" width="68" height="82" rx="30" fill={`url(#${uid}-body)`} />
        <g clipPath={`url(#${uid}-clip)`}>
          <ellipse cx="44" cy="40" rx="26" ry="9" fill="#fff" opacity="0.16" />
          <rect x="24" y="47" width="72" height="9" fill="#ff3d1f" />
          <rect x="24" y="47" width="72" height="2.5" fill="#fff" opacity="0.22" />
        </g>

        {/* Cara */}
        <g className="m-face">
          <ellipse cx="37" cy="83" rx="6" ry="3.6" fill="#ff3d1f" opacity="0.38" />
          <ellipse cx="83" cy="83" rx="6" ry="3.6" fill="#ff3d1f" opacity="0.38" />

          {happyEyes && (
            <g fill="none" stroke="#f6f8ff" strokeWidth="3.6" strokeLinecap="round">
              <path className="m-happy-eye" d="M38 72q8-10 16 0" />
              <path className="m-happy-eye" d="M66 72q8-10 16 0" />
            </g>
          )}
          {sleepyEyes && (
            <g fill="none" stroke="#f6f8ff" strokeWidth="3.4" strokeLinecap="round">
              <path d="M38 68q8 8 16 0" />
              <path d="M66 68q8 8 16 0" />
            </g>
          )}
          {!happyEyes && !sleepyEyes && (
            <g className="m-eyes">
              <g className="m-eye">
                <circle cx="46" cy="69" r="8.4" fill="#f6f8ff" />
              </g>
              <g className="m-eye">
                <circle cx="74" cy="69" r="8.4" fill="#f6f8ff" />
              </g>
              <g ref={pupils} className="m-pupils">
                <circle cx="46" cy="70" r="4.4" fill={INK} />
                <circle cx="74" cy="70" r="4.4" fill={INK} />
                <circle cx="47.6" cy="68.2" r="1.4" fill="#fff" />
                <circle cx="75.6" cy="68.2" r="1.4" fill="#fff" />
              </g>
            </g>
          )}

          {current === "worried" && (
            <g fill="none" stroke="#f6f8ff" strokeWidth="3" strokeLinecap="round">
              <path className="m-brow" d="M37 58l17 5" />
              <path className="m-brow" d="M83 58l-17 5" />
            </g>
          )}

          {/* Boca */}
          {current === "idle" && (
            <path className="m-mouth" d="M52 84q8 6 16 0" fill="none" stroke="#f6f8ff" strokeWidth="3.2" strokeLinecap="round" />
          )}
          {openMouth && (
            <g className="m-mouth m-mouth--open">
              <path d="M49 80h22q0 15-11 15t-11-15z" fill={INK} />
              <ellipse cx="60" cy="91.5" rx="6" ry="3.2" fill="#ff3d1f" />
            </g>
          )}
          {current === "count" && <ellipse className="m-mouth m-mouth--o" cx="60" cy="86" rx="4.2" ry="5" fill={INK} />}
          {current === "rest" && (
            <circle className="m-mouth m-mouth--z" cx="60" cy="85" r="3" fill="none" stroke="#f6f8ff" strokeWidth="2.6" />
          )}
          {current === "worried" && (
            <path
              className="m-mouth"
              d="M50 88q4.5-6 7.5 0t7.5 0t7.5 0"
              fill="none"
              stroke="#f6f8ff"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
        </g>

        {/* Pecho: la F de la marca */}
        <g fill="none" stroke="#f6f8ff" strokeWidth="2.6" strokeLinecap="square" opacity="0.92">
          <path d="M51 108v-9h11" />
          <path d="M51 103.5h7" />
        </g>
        <circle cx="62" cy="103.5" r="2" fill="#ff3d1f" />
      </g>

      {/* Extras por estado */}
      {current === "worried" && (
        <path className="m-sweat" d="M100 46q-6 8-6 12a6 6 0 0 0 12 0q0-4-6-12z" fill="#9fd0ff" />
      )}
      {current === "rest" && (
        <g className="m-zzz" fill="#8a9dff" fontWeight="900" fontFamily="Archivo, system-ui, sans-serif">
          <text x="92" y="38" fontSize="13">
            z
          </text>
          <text x="100" y="26" fontSize="10">
            z
          </text>
          <text x="106" y="16" fontSize="8">
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
              style={{ "--k": i } as CSSProperties}
              d={`M${x} ${y - 6}l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z`}
            />
          ))}
        </g>
      )}
      {current === "count" && count !== undefined && (
        <g key={count} className="m-count">
          <circle cx="98" cy="28" r="15" fill="#ff3d1f" />
          <text
            x="98"
            y="34"
            textAnchor="middle"
            fontSize={count > 99 ? 13 : 17}
            fontWeight="900"
            fontFamily="Archivo, system-ui, sans-serif"
            fill="#fff"
          >
            {count}
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
