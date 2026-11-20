import type { CSSProperties } from "react";
import { Odometer } from "../motion/Odometer";
import { useInView } from "../../hooks/useInView";

interface BarDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  label: string;
  unit?: string;
}

/**
 * Columnas por día que crecen desde la base al entrar en pantalla. El mejor día va en lima con su sello,
 * una línea punteada marca el promedio y cada columna muestra su cifra al pasar el puntero o enfocarla.
 * Es HTML y CSS (no un SVG escalado) para que el texto conserve su tamaño en cualquier pantalla.
 */
export function BarChart({ data, label, unit = "" }: BarChartProps) {
  // Sin GSAP: Inicio carga este gráfico de entrada y no debe arrastrar la librería al primer paquete.
  const [root, seen] = useInView<HTMLDivElement>(0.2);
  const max = Math.max(1, ...data.map((d) => d.value));
  const best = data.reduce((top, d, i) => (d.value > (data[top]?.value ?? 0) ? i : top), 0);
  const hasBest = (data[best]?.value ?? 0) > 0;
  const active = data.filter((d) => d.value > 0);
  const average = active.length ? Math.round(active.reduce((sum, d) => sum + d.value, 0) / active.length) : 0;
  return (
    <div
      ref={root}
      className={`p2-bars${seen ? " is-in" : ""}`}
      role="img"
      aria-label={`${label}. ${data.map((d) => `${d.label} ${d.value}${unit}`).join(", ")}${average ? `. Promedio de los días activos: ${average}${unit}` : ""}`}
    >
      <div className="p2-bars__plot" aria-hidden="true">
        {average > 0 && (
          <span className="p2-bars__avg" style={{ "--hn": average / max } as CSSProperties}>
            <em>prom. {average}</em>
          </span>
        )}
        {data.map((datum, index) => {
          const isBest = hasBest && index === best;
          const pct = (datum.value / max) * 100;
          return (
            <div
              key={`${datum.label}-${index}`}
              className={`p2-bars__col${isBest ? " is-best" : ""}${datum.value === 0 ? " is-zero" : ""}`}
              style={{ "--h": `${Math.max(datum.value > 0 ? 4 : 0, pct)}%`, "--i": index } as CSSProperties}
            >
              <span className="p2-bars__track">
                <span className="p2-bars__fill" />
                <span className="p2-bars__value">
                  {datum.value > 0 ? <Odometer value={datum.value} stagger={40} /> : <span className="p2-bars__dash">0</span>}
                  {datum.value > 0 && unit}
                </span>
                {isBest && <span className="p2-bars__stamp">Mejor día</span>}
              </span>
              <span className="p2-bars__day">{datum.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
