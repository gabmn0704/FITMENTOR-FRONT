interface MarkProps {
  size?: number;
  className?: string;
  /** "brand": dorsal cobalto sobre superficies claras. "inverse": dorsal blanco sobre el cobalto del riel. */
  tone?: "brand" | "inverse";
  /** Dibuja la F al cargar y hace latir el punto. Con `false` queda estática (iconos pequeños, impresión). */
  animated?: boolean;
}

/**
 * Marca de FitMentor: una "F" de trazo recto, como el número de un dorsal. El brazo medio termina en
 * la articulación (el punto bermellón): la medida que la cámara sigue en cada repetición.
 * Animada: el trazo se dibuja al cargar, el punto aparece con rebote y después late como un pulso.
 */
export function LogoMark({ size = 36, className, tone = "brand", animated = true }: MarkProps) {
  const tile = tone === "brand" ? "#1b3bff" : "#f6f8ff";
  const letter = tone === "brand" ? "#f6f8ff" : "#1b3bff";
  return (
    <svg
      className={["logo-mark", animated ? "logo-mark--live" : "", className].filter(Boolean).join(" ")}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="FitMentor"
      focusable="false"
    >
      <rect className="lm__tile" width="40" height="40" rx="9" fill={tile} />
      <g fill="none" stroke={letter} strokeWidth="4.4" strokeLinecap="square" strokeLinejoin="miter">
        <path className="lm__stroke lm__stroke--a" pathLength="1" d="M13 31V10h15" />
        <path className="lm__stroke lm__stroke--b" pathLength="1" d="M13 21h9" />
      </g>
      <circle className="lm__ring" cx="27" cy="21" r="3.4" fill="none" stroke="#ff3d1f" strokeWidth="1.6" />
      <circle className="lm__dot" cx="27" cy="21" r="3.4" fill="#ff3d1f" />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  /** Oculta el texto y deja solo la marca (barras laterales estrechas). */
  markOnly?: boolean;
  tone?: "brand" | "inverse";
  animated?: boolean;
}

export function Logo({ size = 36, markOnly, tone = "brand", animated = true }: LogoProps) {
  return (
    <span className={`logo logo--${tone}`}>
      <LogoMark size={size} tone={tone} animated={animated} />
      {!markOnly && (
        <span className="logo__word">
          FIT<span>MENTOR</span>
        </span>
      )}
    </span>
  );
}
