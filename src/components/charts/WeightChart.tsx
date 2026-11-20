import { useId, useRef } from "react";
import { gsap, useGSAP, withMotion } from "../p2/motion";
import { smoothPath, useWidth } from "./geometry";
import type { WeightEntry } from "../../lib/tracking";

interface WeightChartProps {
  entries: WeightEntry[];
  /** Línea del plan: peso de partida, fecha de inicio y peso al que se quiere llegar en `weeks` semanas. */
  plan?: { startKg: number; startDate: string; targetKg: number | null; weeks: number };
  height?: number;
}

const DAY = 86_400_000;
const time = (date: string) => Date.parse(`${date.slice(0, 10)}T12:00:00`);

/**
 * Pesajes en el tiempo frente a la línea que marca el plan. El eje X es tiempo real (no un punto por registro), así
 * un hueco de dos semanas se ve como hueco. La curva se dibuja al entrar.
 */
export function WeightChart({ entries, plan, height = 220 }: WeightChartProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [box, width] = useWidth<HTMLDivElement>(560);
  const svg = useRef<SVGSVGElement>(null);

  const padLeft = 40;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 28;
  const innerW = Math.max(40, width - padLeft - padRight);
  const innerH = height - padTop - padBottom;

  const planStart = plan ? time(plan.startDate) : NaN;
  const planEnd = plan ? planStart + plan.weeks * 7 * DAY : NaN;
  const times = entries.map((e) => time(e.date));
  const t0 = Math.min(...times, Number.isFinite(planStart) ? planStart : Infinity);
  const t1 = Math.max(...times, Date.now(), t0 + 7 * DAY);
  const kgs = entries.map((e) => e.kg);
  if (plan) kgs.push(plan.startKg, plan.targetKg ?? plan.startKg);
  const lo = Math.floor(Math.min(...kgs) - 1);
  const hi = Math.ceil(Math.max(...kgs) + 1);
  const xOf = (t: number) => padLeft + ((t - t0) / Math.max(1, t1 - t0)) * innerW;
  const yOf = (kg: number) => padTop + (1 - (kg - lo) / Math.max(1, hi - lo)) * innerH;

  const points = entries.map((e) => ({ x: xOf(time(e.date)), y: yOf(e.kg) }));
  const line = smoothPath(points);
  const floor = height - padBottom;
  const area = points.length > 1 ? `${line} L${points[points.length - 1].x.toFixed(1)},${floor} L${points[0].x.toFixed(1)},${floor} Z` : "";

  // Línea del plan recortada a la ventana visible.
  let planLine = "";
  if (plan && plan.targetKg !== null && Number.isFinite(planStart)) {
    const end = Math.min(planEnd, t1);
    const kgAt = (t: number) => plan.startKg + (plan.targetKg! - plan.startKg) * Math.min(1, (t - planStart) / Math.max(1, planEnd - planStart));
    planLine = `M${xOf(planStart).toFixed(1)},${yOf(plan.startKg).toFixed(1)} L${xOf(end).toFixed(1)},${yOf(kgAt(end)).toFixed(1)}`;
  }

  const ticks = [lo, Math.round((lo + hi) / 2), hi];
  const last = points[points.length - 1];

  useGSAP(
    () =>
      withMotion(() => {
        const path = svg.current?.querySelector<SVGPathElement>(".p3-wchart__line");
        if (path && path.getTotalLength) {
          const length = path.getTotalLength();
          gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.4, ease: "expo.out", clearProps: "strokeDasharray,strokeDashoffset" });
        }
        gsap.from(".p3-wchart__area", { autoAlpha: 0, duration: 1.2, ease: "power2.out" });
        gsap.from(".p3-wchart__dot", { scale: 0, transformOrigin: "center", duration: 0.5, ease: "back.out(2)", stagger: 0.04, delay: 0.3 });
      }),
    { scope: svg, dependencies: [entries.length, width], revertOnUpdate: true },
  );

  const summary = entries.length
    ? `${entries.length} pesajes. Último: ${entries[entries.length - 1].kg} kilos.${plan?.targetKg ? ` Meta: ${plan.targetKg} kilos.` : ""}`
    : "Sin pesajes todavía.";

  return (
    <div className="p3-wchart" ref={box}>
      <svg ref={svg} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Evolución del peso. ${summary}`}>
        <defs>
          <linearGradient id={`wfill-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick} className="p3-wchart__grid">
            <line x1={padLeft} x2={width - padRight} y1={yOf(tick)} y2={yOf(tick)} />
            <text x={padLeft - 8} y={yOf(tick) + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        {planLine && <path className="p3-wchart__plan" d={planLine} />}
        {area && <path className="p3-wchart__area" d={area} fill={`url(#wfill-${uid})`} />}
        {points.length > 1 && <path className="p3-wchart__line" d={line} />}
        {points.map((p, index) => (
          <circle key={entries[index].date} className={`p3-wchart__dot${index === points.length - 1 ? " is-last" : ""}`} cx={p.x} cy={p.y} r={index === points.length - 1 ? 5.5 : 3.5} />
        ))}
        {last && (
          <text className="p3-wchart__label" x={Math.min(last.x, width - padRight - 4)} y={last.y - 12} textAnchor="end">
            {entries[entries.length - 1].kg} kg
          </text>
        )}
      </svg>
    </div>
  );
}
