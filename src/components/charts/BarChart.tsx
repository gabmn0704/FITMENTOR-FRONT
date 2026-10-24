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

/**
 * Franja de foto-finish: una columna por día sobre una regla de tiempo. El mejor día se marca con la
 * línea de meta en bermellón. Las columnas entran de izquierda a derecha, como el barrido de la cámara.
 */
export function BarChart({ data, label, height = 200, unit = "" }: BarChartProps) {
  const width = 560;
  const padX = 8;
  const padTop = 34;
  const padBottom = 34;
  const max = Math.max(1, ...data.map((d) => d.value));
  const best = data.reduce((top, d, i) => (d.value > (data[top]?.value ?? 0) ? i : top), 0);
  const slot = (width - padX * 2) / Math.max(1, data.length);
  const barWidth = Math.min(54, slot * 0.7);
  const innerH = height - padTop - padBottom;
  const baseline = height - padBottom;

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {/* Regla: marca larga por día, cuatro cortas entre medias. */}
      {Array.from({ length: data.length * 5 + 1 }, (_, i) => {
        const x = padX + (i * slot) / 5;
        const major = i % 5 === 0;
        return <line key={i} className="chart-tick" x1={x} x2={x} y1={baseline} y2={baseline + (major ? 9 : 4)} />;
      })}
      <line className="chart-grid" x1={padX} x2={width - padX} y1={baseline} y2={baseline} />

      {data[best]?.value > 0 && (
        <line
          className="chart-finish"
          x1={padX + best * slot + slot / 2}
          x2={padX + best * slot + slot / 2}
          y1={6}
          y2={baseline}
        />
      )}

      {data.map((datum, index) => {
        const barHeight = (datum.value / max) * innerH;
        const x = padX + index * slot + (slot - barWidth) / 2;
        const y = baseline - barHeight;
        const isBest = datum.value > 0 && index === best;
        return (
          <g key={`${datum.label}-${index}`}>
            {datum.value > 0 ? (
              <rect
                className={`bars-rect${isBest ? " bars-rect--best" : ""}`}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 3)}
                rx={2}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <title>{`${datum.label}: ${datum.value}${unit}`}</title>
              </rect>
            ) : (
              <rect className="bars-empty" x={x} y={baseline - 3} width={barWidth} height={3} rx={1} />
            )}
            {datum.value > 0 && (
              <text
                className={`chart-value${isBest ? " chart-value--best" : ""}`}
                x={x + barWidth / 2}
                y={Math.max(y - 8, 14)}
                textAnchor="middle"
                style={{ animationDelay: `${index * 80 + 500}ms` }}
              >
                {datum.value}
              </text>
            )}
            <text className="chart-axis" x={x + barWidth / 2} y={height - 8} textAnchor="middle">
              {datum.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
