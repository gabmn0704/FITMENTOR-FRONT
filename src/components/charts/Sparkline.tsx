import { useId, useRef } from "react";
import { gsap, useGSAP, withMotion } from "../p2/motion";
import { smoothPath } from "./geometry";

interface SparklineProps {
  values: number[];
  label: string;
  height?: number;
  /** Escala fija 0-100 (precisión) o relativa al máximo de la serie (repeticiones). */
  scale?: "percent" | "auto";
}

/** Línea compacta en SVG propio: degradado bajo la curva, punto final y trazo que se dibuja al entrar. */
export function Sparkline({ values, label, height = 64, scale = "percent" }: SparklineProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const root = useRef<SVGSVGElement>(null);
  const width = 240;
  const pad = 6;
  const top = scale === "auto" ? Math.max(1, ...values) : 100;
  const points = values.map((value, index) => ({
    x: pad + index * ((width - pad * 2) / Math.max(1, values.length - 1)),
    y: pad + (1 - Math.min(top, Math.max(0, value)) / top) * (height - pad * 2),
  }));
  const line = smoothPath(points);

  useGSAP(
    () =>
      withMotion(() => {
        const path = root.current?.querySelector<SVGPathElement>(".p2-spark__line");
        if (!path) return;
        const length = path.getTotalLength?.() ?? 300;
        gsap.fromTo(
          path,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            duration: 1.4,
            ease: "power3.inOut",
            scrollTrigger: { trigger: root.current, start: "top 95%", once: true },
          },
        );
        gsap.from(
          [root.current?.querySelector(".p2-spark__area"), root.current?.parentElement?.querySelector(".p2-spark__end")].filter(Boolean),
          { autoAlpha: 0, duration: 0.8, delay: 1, scrollTrigger: { trigger: root.current, start: "top 95%", once: true } },
        );
      }),
    { scope: root, dependencies: [line], revertOnUpdate: true },
  );

  if (values.length < 2) {
    return <p className="p2-chart-empty">Aparecerá la tendencia cuando haya más datos.</p>;
  }
  const last = points[points.length - 1];
  return (
    <span className="p2-spark-wrap" style={{ height }}>
      <svg
        ref={root}
        className="sparkline p2-spark"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
      >
        <defs>
          <linearGradient id={`spark-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" className="p2-line__stop-top" />
            <stop offset="100%" className="p2-line__stop-bottom" />
          </linearGradient>
        </defs>
        <path className="p2-spark__area" d={`${line} L${last.x},${height} L${points[0].x},${height} Z`} fill={`url(#spark-${uid})`} />
        <path className="p2-spark__line" d={line} vectorEffect="non-scaling-stroke" />
      </svg>
      <i className="p2-spark__end" style={{ left: `${(last.x / width) * 100}%`, top: `${(last.y / height) * 100}%` }} aria-hidden="true" />
    </span>
  );
}
