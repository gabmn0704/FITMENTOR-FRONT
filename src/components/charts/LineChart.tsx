import { useLayoutEffect, useRef } from "react";

interface LineChartProps {
  values: number[];
  labels: string[];
  label: string;
  height?: number;
}

/** Línea de precisión 0-100 con área suave y trazo que se dibuja al entrar. */
export function LineChart({ values, labels, label, height = 180 }: LineChartProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const width = 560;
  const padX = 14;
  const padTop = 14;
  const padBottom = 28;
  const innerH = height - padTop - padBottom;
  const innerW = width - padX * 2;
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;

  const points = values.map((value, index) => ({
    x: padX + index * step,
    y: padTop + (1 - Math.min(100, Math.max(0, value)) / 100) * innerH,
  }));
  const line = points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = points.length
    ? `${line} L${points[points.length - 1].x.toFixed(1)},${height - padBottom} L${points[0].x.toFixed(1)},${height - padBottom} Z`
    : "";

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (path) path.style.setProperty("--len", String(Math.ceil(path.getTotalLength?.() ?? 1000)));
  }, [line]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {[0, 50, 100].map((tick) => {
        const y = padTop + (1 - tick / 100) * innerH;
        return (
          <g key={tick}>
            <line className="chart-grid" x1={padX} x2={width - padX} y1={y} y2={y} />
            <text className="chart-axis" x={0} y={y + 4}>
              {tick}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--lime)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--lime)" stopOpacity={0} />
        </linearGradient>
      </defs>
      {area && <path d={area} fill="url(#area-grad)" />}
      {line && <path ref={pathRef} className="line-path" d={line} />}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--bg-elevated)" stroke="var(--lime)" strokeWidth={2}>
          <title>{`${labels[i] ?? ""}: ${values[i]}%`}</title>
        </circle>
      ))}
      {labels.map((text, i) => (
        <text key={`${text}-${i}`} className="chart-axis" x={padX + i * step} y={height - 6} textAnchor="middle">
          {text}
        </text>
      ))}
    </svg>
  );
}
