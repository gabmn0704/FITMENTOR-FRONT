import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { gsap, useGSAP, withMotion } from "../p2/motion";
import { smoothPath, useWidth } from "./geometry";

interface LineChartProps {
  /** null marca un día sin datos: no se dibuja punto y la línea salta el hueco. */
  values: Array<number | null>;
  labels: string[];
  label: string;
  height?: number;
  /** Valor de referencia dibujado como línea de meta (0 a 100). */
  target?: number;
}

/**
 * Precisión 0-100 como curva suave: degradado bajo la línea, meta punteada, el trazo se dibuja al entrar
 * y un lector (puntero o flechas del teclado) muestra el valor de cada día.
 */
export function LineChart({ values, labels, label, height = 220, target = 85 }: LineChartProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [box, width] = useWidth<HTMLDivElement>(560);
  const svg = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const padLeft = 34;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
  const innerH = height - padTop - padBottom;
  const innerW = Math.max(40, width - padLeft - padRight);
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;
  const yOf = (value: number) => padTop + (1 - Math.min(100, Math.max(0, value)) / 100) * innerH;
  const xOf = (index: number) => padLeft + index * step;
  const floor = height - padBottom;

  const points = values.flatMap((value, index) => (value === null ? [] : [{ index, value, x: xOf(index), y: yOf(value) }]));
  const line = smoothPath(points);
  const area = points.length > 1 ? `${line} L${points[points.length - 1].x.toFixed(1)},${floor} L${points[0].x.toFixed(1)},${floor} Z` : "";
  const best = points.reduce<(typeof points)[number] | null>((top, p) => (!top || p.value > top.value ? p : top), null);
  const shown = active === null ? null : points.find((p) => p.index === active) ?? null;

  useGSAP(
    () =>
      withMotion(() => {
        const path = svg.current?.querySelector<SVGPathElement>(".p2-line__stroke");
        if (!path) return;
        const length = path.getTotalLength?.() ?? 800;
        const trigger = { trigger: box.current, start: "top 88%", once: true };
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        gsap.to(path, { strokeDashoffset: 0, duration: 1.6, ease: "power3.inOut", scrollTrigger: trigger, onComplete: () => gsap.set(path, { clearProps: "strokeDasharray,strokeDashoffset" }) });
        gsap.from(".p2-line__area", { autoAlpha: 0, duration: 1.2, delay: 0.5, ease: "power2.out", scrollTrigger: trigger });
        gsap.from(".p2-line__dot", { scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2.4)", stagger: 0.08, delay: 0.7, scrollTrigger: trigger });
      }),
    { scope: box, dependencies: [line, width], revertOnUpdate: true },
  );

  const nearest = (clientX: number) => {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect || points.length === 0) return null;
    const x = clientX - rect.left;
    return points.reduce((top, p) => (Math.abs(p.x - x) < Math.abs(top.x - x) ? p : top), points[0]).index;
  };

  const onPointer = (event: PointerEvent<SVGSVGElement>) => setActive(nearest(event.clientX));

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (points.length === 0) return;
    const at = points.findIndex((p) => p.index === active);
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = at === -1 ? (delta > 0 ? 0 : points.length - 1) : Math.min(points.length - 1, Math.max(0, at + delta));
      setActive(points[next].index);
    } else if (event.key === "Escape") setActive(null);
  };

  const summary = points.map((p) => `${labels[p.index] ?? ""} ${p.value}%`).join(", ");

  return (
    <div
      ref={box}
      className="p2-line"
      tabIndex={points.length ? 0 : -1}
      role="group"
      aria-label={`${label}. ${summary || "Sin datos"}. Usa las flechas para recorrer los días.`}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
    >
      <svg
        ref={svg}
        className="p2-line__svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        focusable="false"
        onPointerMove={onPointer}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={`fill-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" className="p2-line__stop-top" />
            <stop offset="100%" className="p2-line__stop-bottom" />
          </linearGradient>
          <linearGradient id={`stroke-${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" className="p2-line__stroke-a" />
            <stop offset="100%" className="p2-line__stroke-b" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line className="p2-line__grid" x1={padLeft} x2={width - padRight} y1={yOf(tick)} y2={yOf(tick)} />
            <text className="p2-axis" x={padLeft - 10} y={yOf(tick) + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        <line className="p2-line__target" x1={padLeft} x2={width - padRight} y1={yOf(target)} y2={yOf(target)} />
        <text className="p2-line__target-label" x={width - padRight} y={yOf(target) - 7} textAnchor="end">
          meta {target}%
        </text>
        {area && <path className="p2-line__area" d={area} fill={`url(#fill-${uid})`} />}
        {line && <path className="p2-line__stroke" d={line} stroke={`url(#stroke-${uid})`} />}
        {shown && <line className="p2-line__cursor" x1={shown.x} x2={shown.x} y1={padTop} y2={floor} />}
        {points.map((p) => (
          <circle
            key={p.index}
            className={`p2-line__dot${best && p.index === best.index ? " is-best" : ""}${shown?.index === p.index ? " is-active" : ""}`}
            cx={p.x}
            cy={p.y}
            r={shown?.index === p.index ? 7 : 4.5}
          />
        ))}
        {labels.map((text, i) => (
          <text key={`${text}-${i}`} className={`p2-axis${shown?.index === i ? " is-active" : ""}`} x={xOf(i)} y={height - 8} textAnchor="middle">
            {text}
          </text>
        ))}
      </svg>
      {points.length === 0 && <p className="p2-chart-empty">Sin sesiones esta semana: la curva aparece con tu primera sesión.</p>}
      {shown && (
        <div
          className="p2-tip"
          style={{ left: Math.min(width - 70, Math.max(70, shown.x)), top: shown.y }}
          role="status"
          aria-live="polite"
        >
          <span>{labels[shown.index]}</span>
          <strong className="tabular">{shown.value}%</strong>
          <small>{shown.value >= target ? "sobre la meta" : `${target - shown.value} pts bajo la meta`}</small>
        </div>
      )}
    </div>
  );
}
