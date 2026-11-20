import { useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { gsap, useGSAP, withMotion } from "../p2/motion";
import { heatmap, type DatedSession, type HeatCell } from "./insights";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const ROWS = ["Lun", "", "Mié", "", "Vie", "", "Dom"];

function describe(cell: HeatCell): string {
  const date = `${cell.date.getDate()} de ${MONTHS[cell.date.getMonth()]}`;
  if (cell.future) return `${date}: por venir`;
  if (cell.sessions === 0) return `${date}: sin sesión`;
  return `${date}: ${cell.sessions} ${cell.sessions === 1 ? "sesión" : "sesiones"}, ${cell.reps} repeticiones`;
}

/** Mapa de constancia: una columna por semana y un cuadro por día, más intenso cuantas más repeticiones. */
export function Heatmap({ sessions, weeks = 18 }: { sessions: DatedSession[]; weeks?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const columns = useMemo(() => heatmap(sessions, weeks), [sessions, weeks]);
  const [hover, setHover] = useState<{ cell: HeatCell; x: number; y: number } | null>(null);
  const activeDays = columns.flat().filter((c) => c.sessions > 0).length;

  useGSAP(
    () =>
      withMotion(() => {
        gsap.from(".p2-heat__cell", {
          scale: 0.2,
          autoAlpha: 0,
          duration: 0.5,
          ease: "back.out(2)",
          stagger: { each: 0.006, grid: [weeks, 7], from: "start", axis: "x" },
          scrollTrigger: { trigger: root.current, start: "top 90%", once: true },
          clearProps: "transform,opacity,visibility",
        });
      }),
    { scope: root, dependencies: [columns], revertOnUpdate: true },
  );

  const onOver = (event: PointerEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-cell]");
    if (!target || !root.current) return setHover(null);
    const [w, d] = (target.dataset.cell ?? "0-0").split("-").map(Number);
    const cell = columns[w]?.[d];
    if (!cell) return;
    const box = root.current.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    setHover({ cell, x: rect.left - box.left + rect.width / 2, y: rect.top - box.top });
  };

  return (
    <div ref={root} className="p2-heat" onPointerOver={onOver} onPointerLeave={() => setHover(null)}>
      <div
        className="p2-heat__grid"
        role="img"
        aria-label={`Mapa de constancia de las últimas ${weeks} semanas: ${activeDays} días con sesión.`}
        style={{ "--weeks": weeks } as CSSProperties}
      >
        <span aria-hidden="true" />
        {columns.map((column, w) => {
          const month = column[0].date.getMonth();
          const prev = w > 0 ? columns[w - 1][0].date.getMonth() : -1;
          return (
            <span key={`m-${column[0].key}`} className="p2-heat__month" aria-hidden="true">
              {month !== prev ? MONTHS[month] : ""}
            </span>
          );
        })}
        {ROWS.map((row, d) => (
          <div key={`row-${d}`} className="p2-heat__row" aria-hidden="true">
            <span className="p2-heat__day">{row}</span>
            {columns.map((column, w) => {
              const cell = column[d];
              return (
                <span
                  key={cell.key}
                  data-cell={`${w}-${d}`}
                  className={`p2-heat__cell is-l${cell.level}${cell.future ? " is-future" : ""}`}
                  title={describe(cell)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="p2-heat__legend" aria-hidden="true">
        <span>Menos</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i key={level} className={`p2-heat__cell is-l${level}`} />
        ))}
        <span>Más</span>
      </div>
      {hover && !hover.cell.future && (
        <div className="p2-tip p2-tip--small" style={{ left: hover.x, top: hover.y }} aria-hidden="true">
          <strong>{describe(hover.cell)}</strong>
        </div>
      )}
    </div>
  );
}
