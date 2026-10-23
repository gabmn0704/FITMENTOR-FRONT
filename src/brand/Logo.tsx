interface MarkProps {
  size?: number;
  className?: string;
  /** "lime" para fondos oscuros; "ink" para el panel lima del cartel. */
  tone?: "lime" | "ink";
}

/**
 * Marca de FitMentor: una "F" hecha con un tallo y dos brazos. El brazo superior es la barra,
 * el inferior sube en diagonal como una repetición bien hecha y termina en la articulación (el punto naranja).
 */
export function LogoMark({ size = 36, className, tone = "lime" }: MarkProps) {
  const tile = tone === "lime" ? "#c6ff3d" : "#0d0f0c";
  const letter = tone === "lime" ? "#0d1200" : "#c6ff3d";
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="FitMentor"
      focusable="false"
    >
      <rect width="40" height="40" rx="12" fill={tile} />
      <g fill="none" stroke={letter} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 31V10h15" />
        <path d="M13 21l9-4.5" />
      </g>
      <circle cx="26.5" cy="16.2" r="3.3" fill="#ff6a2b" />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  /** Oculta el texto y deja solo la marca (barras laterales estrechas). */
  markOnly?: boolean;
  tone?: "lime" | "ink";
}

export function Logo({ size = 36, markOnly, tone = "lime" }: LogoProps) {
  return (
    <span className={`logo logo--${tone}`}>
      <LogoMark size={size} tone={tone} />
      {!markOnly && (
        <span className="logo__word">
          FIT<span>MENTOR</span>
        </span>
      )}
    </span>
  );
}
