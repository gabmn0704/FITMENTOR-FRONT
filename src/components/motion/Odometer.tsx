import { useEffect, useState, type CSSProperties } from "react";
import { useInView } from "../../hooks/useInView";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface OdometerProps {
  /** Número a mostrar. Los decimales se infieren del propio valor (o de `decimals`). */
  value: number;
  decimals?: number;
  /** Texto fijo tras el número, por ejemplo "%" o "°". */
  suffix?: string;
  /** Milisegundos entre una cifra y la siguiente al entrar. */
  stagger?: number;
  className?: string;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function format(value: number, decimals: number): string {
  return Number.isFinite(value) ? Math.abs(value).toFixed(decimals) : "0";
}

function decimalsOf(value: number): number {
  const text = String(value);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : Math.min(2, text.length - dot - 1);
}

/**
 * Marcador mecánico: cada cifra es una columna de 0 a 9 que rueda hasta su valor, de izquierda a derecha,
 * cuando el número entra en pantalla y cada vez que cambia. Sin movimiento si se pide reducirlo.
 */
export function Odometer({ value, decimals, suffix = "", stagger = 90, className = "" }: OdometerProps) {
  const reduced = useReducedMotion();
  const [ref, seen] = useInView<HTMLSpanElement>(0.2);
  const places = decimals ?? decimalsOf(value);
  const text = format(value, places);
  const sign = value < 0 ? "−" : "";

  // Las columnas nacen en 0 y, un frame después de verse, ruedan al valor real.
  const [armed, setArmed] = useState(reduced);
  useEffect(() => {
    if (!seen || armed) return;
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, [seen, armed]);

  return (
    <span ref={ref} className={`odo tabular ${className}`.trim()} aria-label={`${sign}${text}${suffix}`} role="img">
      {sign && (
        <span className="odo__fixed" aria-hidden="true">
          {sign}
        </span>
      )}
      {[...text].map((char, index) => {
        if (char < "0" || char > "9") {
          return (
            <span className="odo__fixed" aria-hidden="true" key={`${index}-${char}`}>
              {char}
            </span>
          );
        }
        const target = armed ? Number(char) : 0;
        return (
          <span className="odo__digit" aria-hidden="true" key={index}>
            <span
              className="odo__col"
              style={{ "--to": target, "--delay": `${index * stagger}ms` } as CSSProperties}
            >
              {DIGITS.map((digit) => (
                <span key={digit}>{digit}</span>
              ))}
            </span>
          </span>
        );
      })}
      {suffix && (
        <span className="odo__fixed odo__suffix" aria-hidden="true">
          {suffix}
        </span>
      )}
    </span>
  );
}
