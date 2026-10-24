import type { CSSProperties, ReactNode } from "react";

interface ProgressRingProps {
  /** Valor entre 0 y 100. */
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  children?: ReactNode;
}

/** Anillo SVG de un solo color de tinta; el trazo se dibuja por CSS (respeta reduced motion). */
export function ProgressRing({ value, size = 132, stroke = 12, label, children }: ProgressRingProps) {
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
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ "--circ": circumference } as CSSProperties}
        />
      </svg>
      {children && <div className="ring__content">{children}</div>}
    </div>
  );
}
