import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, withMotion } from "./motion";

interface RingProps {
  /** Porcentaje de 0 a 100 (lo que pase de 100 se dibuja lleno). */
  value: number;
  size?: number;
  stroke?: number;
  tone?: "cobalt" | "signal" | "good" | "ink" | "gold";
  label: string;
  children?: ReactNode;
  className?: string;
}

/** Anillo de progreso: el arco se dibuja al entrar en pantalla; el centro lleva la cifra. */
export function Ring({ value, size = 120, stroke = 10, tone = "cobalt", label, children, className = "" }: RingProps) {
  const root = useRef<HTMLDivElement>(null);
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const offset = circ * (1 - pct / 100);

  useGSAP(
    () =>
      withMotion(() => {
        gsap.from(".p2-ring__arc", {
          strokeDashoffset: circ,
          duration: 1.5,
          ease: "expo.out",
          scrollTrigger: { trigger: root.current, start: "top 95%", once: true },
        });
      }),
    { scope: root, dependencies: [value], revertOnUpdate: true },
  );

  return (
    <div
      ref={root}
      className={`p2-ring p2-ring--${tone} ${className}`.trim()}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        <circle className="p2-ring__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="p2-ring__arc"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && (
        <div className="p2-ring__center" aria-hidden="true">
          {children}
        </div>
      )}
    </div>
  );
}
