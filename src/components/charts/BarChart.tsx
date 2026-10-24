import type { CSSProperties } from "react";
import { Odometer } from "../motion/Odometer";

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
 * Franja de foto-finish: un carril por día sobre una regla de tiempo. Las barras avanzan de izquierda a
 * derecha hasta la línea de meta (bermellón), que marca el mejor día; cada cifra rueda en su carril.
 * Es HTML y CSS (no un SVG escalado) para que el texto conserve su tamaño en cualquier pantalla.
 */
export function BarChart({ data, label, unit = "" }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const best = data.reduce((top, d, i) => (d.value > (data[top]?.value ?? 0) ? i : top), 0);
  const hasBest = (data[best]?.value ?? 0) > 0;

  return (
    <div className="lanes" role="img" aria-label={`${label}. ${data.map((d) => `${d.label} ${d.value}${unit}`).join(", ")}`}>
      <div className="lanes__ruler" aria-hidden="true" />
      <ol className="lanes__list" aria-hidden="true">
        {data.map((datum, index) => {
          const isBest = hasBest && index === best;
          return (
            <li
              key={`${datum.label}-${index}`}
              className={`lane${isBest ? " lane--best" : ""}`}
              style={{ "--w": `${(datum.value / max) * 100}%`, "--i": index } as CSSProperties}
            >
              <span className="lane__day">{datum.label}</span>
              <span className="lane__track">
                <span className="lane__bar" />
              </span>
              <span className="lane__value">
                <Odometer value={datum.value} stagger={40} />
                {unit}
              </span>
              {isBest && <span className="lane__stamp">Mejor día</span>}
            </li>
          );
        })}
      </ol>
      {hasBest && <span className="lanes__finish" aria-hidden="true" />}
    </div>
  );
}
