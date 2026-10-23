interface MarkProps {
  size?: number;
  className?: string;
}

/**
 * Marca de FitMentor: una "F" construida como un esqueleto de postura.
 * El tallo y el brazo superior son los segmentos; el punto es la articulación detectada.
 */
export function LogoMark({ size = 34, className }: MarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="FitMentor"
      focusable="false"
    >
      <rect width="32" height="32" rx="9" fill="var(--lime)" />
      <g fill="none" stroke="var(--lime-ink)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 25V9h12" />
        <path d="M11 17h6" />
      </g>
      <circle cx="23" cy="17" r="2.4" fill="var(--lime-ink)" />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  /** Oculta el texto y deja solo la marca (barras laterales estrechas). */
  markOnly?: boolean;
}

export function Logo({ size = 34, markOnly }: LogoProps) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      {!markOnly && (
        <span className="logo__word">
          Fit<span>Mentor</span>
        </span>
      )}
    </span>
  );
}
