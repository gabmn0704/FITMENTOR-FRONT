interface BarDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  label: string;
  height?: number;
  unit?: string;
}

/** Barras verticales en SVG propio con animación CSS de crecimiento. */
export function BarChart({ data, label, height = 180, unit = "" }: BarChartProps) {
  const width = 560;
  const padX = 12;
  const padTop = 16;
  const padBottom = 28;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = (width - padX * 2) / Math.max(1, data.length);
  const barWidth = Math.min(44, slot * 0.56);
  const innerH = height - padTop - padBottom;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <line className="chart-grid" x1={padX} x2={width - padX} y1={height - padBottom} y2={height - padBottom} />
      {data.map((datum, index) => {
        const barHeight = (datum.value / max) * innerH;
        const x = padX + index * slot + (slot - barWidth) / 2;
        const y = height - padBottom - barHeight;
        return (
          <g key={`${datum.label}-${index}`}>
            <rect
              className="bars-rect"
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 2)}
              rx={8}
              fill={datum.value > 0 ? "url(#bar-grad)" : "var(--surface-strong)"}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <title>{`${datum.label}: ${datum.value}${unit}`}</title>
            </rect>
            <text className="chart-axis" x={x + barWidth / 2} y={height - 8} textAnchor="middle">
              {datum.label}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--lime)" />
          <stop offset="100%" stopColor="var(--orange)" stopOpacity={0.7} />
        </linearGradient>
      </defs>
    </svg>
  );
}
