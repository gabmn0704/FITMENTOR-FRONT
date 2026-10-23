import { useId, type ReactNode } from "react";

interface ProgressRingProps {
  /** Valor entre 0 y 100. */
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  children?: ReactNode;
}

/** Anillo SVG con degradado lima-naranja; la animación es CSS (respeta reduced motion). */
export function ProgressRing({ value, size = 132, stroke = 12, label, children }: ProgressRingProps) {
  const gradientId = `ring-${useId().replace(/:/g, "")}`;
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  return (
    <div
      className="ring"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `Progreso ${Math.round(clamped)} por ciento`}
    >
      <svg width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--orange)" />
            <stop offset="100%" stopColor="var(--lime)" />
          </linearGradient>
        </defs>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {children && <div className="ring__content">{children}</div>}
    </div>
  );
}
