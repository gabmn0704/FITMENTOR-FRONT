import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface CountUpProps {
  value: number;
  /** Texto fijo tras el número (por ejemplo "%"). */
  suffix?: string;
  durationMs?: number;
}

function decimalsOf(value: number): number {
  const text = String(value);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : Math.min(2, text.length - dot - 1);
}

/** Cuenta desde 0 hasta `value` con ease-out fuerte; sin movimiento si se pide reducirlo. */
export function CountUp({ value, suffix = "", durationMs = 1100 }: CountUpProps) {
  const reduced = useReducedMotion();
  const decimals = decimalsOf(value);
  const [shown, setShown] = useState(reduced ? value : 0);
  const from = useRef(0);

  useEffect(() => {
    if (reduced || !Number.isFinite(value)) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 4);
      setShown(origin + (value - origin) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduced]);

  return (
    <span className="tabular" aria-label={`${value}${suffix}`}>
      <span aria-hidden="true">
        {shown.toFixed(decimals)}
        {suffix}
      </span>
    </span>
  );
}
