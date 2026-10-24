import { useLayoutEffect, useRef } from "react";

interface LineChartProps {
  /** null marca un día sin datos: no se dibuja punto y la línea salta el hueco. */
  values: Array<number | null>;
  labels: string[];
  label: string;
  height?: number;
  /** Valor de referencia dibujado como línea de meta (0 a 100). */
  target?: number;
}

/** Línea de precisión 0-100 con trama bajo la curva, meta punteada y trazo que se dibuja al entrar. */
export function LineChart({ values, labels, label, height = 200, target = 85 }: LineChartProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const width = 560;
  const padX = 26;
  const padTop = 16;
  const padBottom = 32;
  const innerH = height - padTop - padBottom;
  const innerW = width - padX * 2;
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;
  const yOf = (value: number) => padTop + (1 - Math.min(100, Math.max(0, value)) / 100) * innerH;

  const points = values.flatMap((value, index) =>
    value === null ? [] : [{ index, x: padX + index * step, y: yOf(value) }],
  );
  const line = points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area =
    points.length > 1
      ? `${line} L${points[points.length - 1].x.toFixed(1)},${height - padBottom} L${points[0].x.toFixed(1)},${height - padBottom} Z`
      : "";

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (path) path.style.setProperty("--len", String(Math.ceil(path.getTotalLength?.() ?? 1000)));
  }, [line]);

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <defs>
        <pattern id="area-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" className="chart-hatch" />
        </pattern>
      </defs>
      {[0, 50, 100].map((tick) => {
        const y = yOf(tick);
        return (
          <g key={tick}>
            <line className="chart-grid" x1={padX} x2={width - padX} y1={y} y2={y} />
            <text className="chart-axis" x={0} y={y + 4}>
              {tick}
            </text>
          </g>
        );
      })}
      <line className="chart-target" x1={padX} x2={width - padX} y1={yOf(target)} y2={yOf(target)} />
      <text className="chart-target-label" x={padX + 4} y={yOf(target) - 6}>
        meta {target}
      </text>
      {area && <path d={area} fill="url(#area-hatch)" className="chart-area" />}
      {line && <path ref={pathRef} className="line-path" d={line} />}
      {points.map((p) => (
        <rect key={p.index} className="line-dot" x={p.x - 5} y={p.y - 5} width={10} height={10} rx={2}>
          <title>{`${labels[p.index] ?? ""}: ${values[p.index]}%`}</title>
        </rect>
      ))}
      {labels.map((text, i) => (
        <text key={`${text}-${i}`} className="chart-axis" x={padX + i * step} y={height - 8} textAnchor="middle">
          {text}
        </text>
      ))}
    </svg>
  );
}
