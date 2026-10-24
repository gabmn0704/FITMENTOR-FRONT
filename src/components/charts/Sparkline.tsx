interface SparklineProps {
  values: number[];
  label: string;
  height?: number;
}

/** Línea compacta en SVG propio, sin librerías. Escala fija 0-100 para comparar sesiones. */
export function Sparkline({ values, label, height = 64 }: SparklineProps) {
  const width = 240;
  const pad = 4;
  if (values.length < 2) {
    return (
      <p className="muted" style={{ fontSize: 13 }}>
        Aparecerá la tendencia cuando haya más datos.
      </p>
    );
  }
  const step = (width - pad * 2) / (values.length - 1);
  const points = values.map((value, index) => {
    const x = pad + index * step;
    const y = pad + (1 - Math.min(100, Math.max(0, value)) / 100) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--cobalt)"
        strokeWidth={2.5}
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
    </svg>
  );
}
