import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, CloudUpload, Flame, Minus, Timer } from "lucide-react";
import { Button, EmptyState } from "../components/ui";
import { BarChart } from "../components/charts/BarChart";
import { Heatmap } from "../components/charts/Heatmap";
import { LineChart } from "../components/charts/LineChart";
import { Sparkline } from "../components/charts/Sparkline";
import { compareWeeks, percentChange, weeklyReps } from "../components/charts/insights";
import { Odometer } from "../components/motion/Odometer";
import { PageHero } from "../components/p2/PageHero";
import { Ring } from "../components/p2/Ring";
import { gsap, useGSAP, useReveal, withMotion } from "../components/p2/motion";
import { useAuth } from "../hooks/useAuth";
import { useAsync } from "../hooks/useAsync";
import { DoublyLinkedList, type ListCursor } from "../structures";
import { exerciseLabel } from "../lib/exercises";
import { formatDuration, formatShortDate, weekdayLabel } from "../lib/format";
import { computeLocalStats } from "../lib/stats";
import { mergeHistory, readLocalSessions, syncPendingSessions, type HistoryEntry } from "../lib/sessions";
import { sessionsApi, statsApi } from "../lib/services";
import type { SessionRecord, Stats } from "../types";

/** Flecha y texto del cambio frente a la semana anterior. */
function Delta({ value, unit = "%" }: { value: number | null; unit?: string }) {
  if (value === null) return <span className="p2-delta is-new">Nuevo</span>;
  const tone = value > 0 ? "is-up" : value < 0 ? "is-down" : "is-flat";
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`p2-delta ${tone}`}>
      <Icon size={14} aria-hidden="true" />
      {value > 0 ? "+" : value < 0 ? "−" : ""}
      {Math.abs(value)}
      {unit}
    </span>
  );
}

export function ProgressPage() {
  const { token } = useAuth();
  const [version, setVersion] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [localList, setLocalList] = useState<SessionRecord[]>(() => readLocalSessions());
  const stats = useAsync(() => statsApi.get(token!), [token, version], Boolean(token));
  const serverSessions = useAsync(() => sessionsApi.list(token!, 50), [token, version], Boolean(token));
  const page = useRef<HTMLDivElement>(null);
  const historyCard = useRef<HTMLDivElement>(null);

  const data: Stats = stats.data ?? computeLocalStats(localList);
  const pending = localList.filter((s) => !s.synced).length;

  // Historial en lista doblemente enlazada: más reciente primero, navegable con cursor.
  const merged = useMemo(() => mergeHistory(serverSessions.data, localList), [serverSessions.data, localList]);
  const history = useMemo(() => {
    const list = new DoublyLinkedList<HistoryEntry>();
    merged.forEach((s) => list.append(s));
    return list;
  }, [merged]);
  const [cursor, setCursor] = useState<ListCursor<HistoryEntry> | null>(null);
  const [current, setCurrent] = useState<HistoryEntry | undefined>(undefined);
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    const c = history.cursor();
    setCursor(c);
    setCurrent(c.value);
    setPosition(c.index() + 1);
  }, [history]);

  const move = (to: "next" | "prev") => {
    if (!cursor) return;
    if (to === "next") cursor.next();
    else cursor.prev();
    setDirection(to === "next" ? 1 : -1);
    setCurrent(cursor.value);
    setPosition(cursor.index() + 1);
  };

  const sync = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      await syncPendingSessions(token);
    } finally {
      setLocalList(readLocalSessions());
      setVersion((v) => v + 1);
      setSyncing(false);
    }
  };

  const weekLabels = data.weekly.map((d) => weekdayLabel(d.date));
  const accuracyValues = data.weekly.map((d) => (d.reps > 0 ? d.accuracy : null));
  const maxExerciseReps = Math.max(1, ...data.byExercise.map((e) => e.reps));
  const ranked = [...data.byExercise].sort((a, b) => b.reps - a.reps);
  const compare = useMemo(() => compareWeeks(merged), [merged]);
  const trend = useMemo(() => weeklyReps(merged, 8), [merged]);
  const repsDelta = percentChange(compare.current.reps, compare.previous.reps);

  useReveal(page, [merged.length > 0]);

  // Cambio de sesión en el historial: la ficha entra desde el lado hacia el que se avanza.
  useGSAP(
    () =>
      withMotion(() => {
        gsap.from("[data-swap]", { x: 28 * direction, autoAlpha: 0, duration: 0.55, ease: "expo.out", stagger: 0.04, clearProps: "all" });
      }),
    { scope: historyCard, dependencies: [position], revertOnUpdate: true },
  );

  const verdict =
    compare.current.sessions === 0
      ? "Esta semana aún no hay sesiones. Con una sola ya empiezas a sumar."
      : compare.current.reps >= compare.previous.reps
        ? "Vas por encima de la semana pasada. Mantén el ritmo y cuida la técnica."
        : `Te faltan ${compare.previous.reps - compare.current.reps} repeticiones para igualar la semana pasada. Una sesión más te acerca.`;

  const rows: Array<{ label: string; now: number; before: number; unit: string }> = [
    { label: "Repeticiones", now: compare.current.reps, before: compare.previous.reps, unit: "" },
    { label: "Sesiones", now: compare.current.sessions, before: compare.previous.sessions, unit: "" },
    { label: "Precisión", now: compare.current.accuracy, before: compare.previous.accuracy, unit: "%" },
    { label: "Minutos activos", now: compare.current.minutes, before: compare.previous.minutes, unit: "" },
  ];

  return (
    <div className="p2-page" ref={page}>
      <PageHero
        title={["Constancia", "y técnica"]}
        accent={1}
        kicker={`${data.totalSessions} ${data.totalSessions === 1 ? "sesión registrada" : "sesiones registradas"}`}
        lead="Cada sesión suma control y consistencia. Aquí ves cómo vas, día a día y semana a semana."
        mascot="cheer"
      >
        {pending > 0 ? (
          <div className="p2-sync">
            <span>
              <strong className="tabular">{pending}</strong> {pending === 1 ? "sesión pendiente" : "sesiones pendientes"} de sincronizar
            </span>
            <Button variant="ghost" onClick={() => void sync()} loading={syncing} disabled={!token} icon={<CloudUpload size={16} />}>
              Sincronizar
            </Button>
          </div>
        ) : null}
      </PageHero>

      <section className="p2-bento p2-bento--progress" aria-label="Tu progreso">
        <article className="p2-tile p2-tile--feature" data-area="reps" data-reveal>
          <div className="p2-tile__head">
            <h2 className="p2-tile__title">Repeticiones totales</h2>
            <Delta value={repsDelta} />
          </div>
          <p className="p2-figure p2-figure--xl">
            <Odometer value={data.totalReps} />
          </p>
          <p className="p2-tile__note">
            Esta semana llevas <strong className="tabular">{compare.current.reps}</strong> repeticiones en {compare.current.activeDays}{" "}
            {compare.current.activeDays === 1 ? "día" : "días"}.
          </p>
          <div className="p2-tile__spark">
            <Sparkline values={trend} scale="auto" height={84} label="Repeticiones por semana en las últimas ocho semanas" />
            <span className="p2-tile__axis" aria-hidden="true">
              <span>hace 8 semanas</span>
              <span>esta semana</span>
            </span>
          </div>
        </article>

        <article className="p2-tile" data-area="sessions" data-reveal>
          <h2 className="p2-tile__title">Sesiones</h2>
          <p className="p2-figure">
            <Odometer value={data.totalSessions} />
          </p>
          <p className="p2-tile__note">
            {compare.current.sessions} en los últimos 7 días <Delta value={percentChange(compare.current.sessions, compare.previous.sessions)} />
          </p>
        </article>

        <article className="p2-tile p2-tile--ring" data-area="accuracy" data-reveal>
          <div>
            <h2 className="p2-tile__title">Precisión media</h2>
            <p className="p2-tile__note">Meta: 85 %</p>
          </div>
          <Ring value={data.avgAccuracy} size={104} stroke={10} tone={data.avgAccuracy >= 85 ? "good" : "cobalt"} label={`Precisión media ${data.avgAccuracy} por ciento`}>
            <strong className="tabular">
              {data.avgAccuracy}
              <small>%</small>
            </strong>
          </Ring>
        </article>

        <article className="p2-tile p2-tile--ink" data-area="streak" data-reveal>
          <h2 className="p2-tile__title">
            <Flame size={16} aria-hidden="true" /> Racha
          </h2>
          <p className="p2-figure">
            <Odometer value={data.streakDays} />
            <small>{data.streakDays === 1 ? "día" : "días"}</small>
          </p>
          <p className="p2-tile__note">{data.streakDays > 0 ? "Entrena hoy y la llama sigue viva." : "Una sesión hoy enciende la racha."}</p>
        </article>

        <article className="p2-tile" data-area="minutes" data-reveal>
          <h2 className="p2-tile__title">
            <Timer size={16} aria-hidden="true" /> Minutos esta semana
          </h2>
          <p className="p2-figure">
            <Odometer value={compare.current.minutes} />
            <small>min</small>
          </p>
          <p className="p2-tile__note">
            Semana pasada: <span className="tabular">{compare.previous.minutes} min</span>
          </p>
        </article>

        <article className="p2-tile p2-tile--chart" data-area="bars" data-reveal="scroll">
          <div className="p2-tile__head">
            <h2 className="p2-tile__title p2-tile__title--lg">Repeticiones por día</h2>
            <span className="p2-tile__meta">Últimos 7 días</span>
          </div>
          <BarChart label="Repeticiones de los últimos siete días" data={data.weekly.map((d, i) => ({ label: weekLabels[i], value: d.reps }))} />
        </article>

        <article className="p2-tile p2-tile--chart" data-area="line" data-reveal="scroll">
          <div className="p2-tile__head">
            <h2 className="p2-tile__title p2-tile__title--lg">Precisión por día</h2>
            <span className="p2-tile__meta">Pasa el puntero o usa las flechas</span>
          </div>
          <LineChart label="Precisión media por día" values={accuracyValues} labels={weekLabels} />
        </article>

        <article className="p2-tile p2-tile--chart" data-area="heat" data-reveal="scroll">
          <div className="p2-tile__head">
            <h2 className="p2-tile__title p2-tile__title--lg">Mapa de constancia</h2>
            <span className="p2-tile__meta">Últimas 18 semanas</span>
          </div>
          <Heatmap sessions={merged} />
        </article>

        <article className="p2-tile p2-tile--compare" data-area="compare" data-reveal="scroll">
          <div className="p2-tile__head">
            <h2 className="p2-tile__title p2-tile__title--lg">Esta semana frente a la anterior</h2>
          </div>
          <ul className="p2-compare">
            {rows.map((row) => {
              const top = Math.max(1, row.now, row.before);
              return (
                <li key={row.label}>
                  <div className="p2-compare__head">
                    <span>{row.label}</span>
                    <Delta value={row.unit === "%" ? row.now - row.before : percentChange(row.now, row.before)} unit={row.unit === "%" ? " pts" : "%"} />
                  </div>
                  <div className="p2-compare__bars" aria-label={`${row.label}: ${row.now}${row.unit} esta semana, ${row.before}${row.unit} la anterior`} role="img">
                    <span className="p2-compare__bar is-now" style={{ width: `${(row.now / top) * 100}%` }}>
                      <em className="tabular">
                        {row.now}
                        {row.unit}
                      </em>
                    </span>
                    <span className="p2-compare__bar is-before" style={{ width: `${(row.before / top) * 100}%` }}>
                      <em className="tabular">
                        {row.before}
                        {row.unit}
                      </em>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="p2-compare__legend" aria-hidden="true">
            <i className="is-now" /> Últimos 7 días <i className="is-before" /> 7 días anteriores
          </p>
          <p className="p2-verdict">{verdict}</p>
        </article>

        <article className="p2-tile" data-area="exercises" data-reveal="scroll">
          <h2 className="p2-tile__title p2-tile__title--lg">Por ejercicio</h2>
          {ranked.length === 0 ? (
            <EmptyState title="Sin datos todavía">Completa una sesión y verás tu reparto aquí.</EmptyState>
          ) : (
            <ol className="p2-rank">
              {ranked.map((entry, index) => (
                <li key={entry.exercise}>
                  <span className="p2-rank__pos tabular">{index + 1}</span>
                  <div className="p2-rank__body">
                    <div className="p2-rank__line">
                      <strong>{exerciseLabel(entry.exercise)}</strong>
                      <span className="tabular">
                        {entry.reps} <small>reps · {entry.accuracy}%</small>
                      </span>
                    </div>
                    <div className="p2-meter" role="img" aria-label={`${exerciseLabel(entry.exercise)}: ${entry.reps} repeticiones`}>
                      <span style={{ width: `${(entry.reps / maxExerciseReps) * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="p2-tile p2-tile--history" data-area="history" data-reveal="scroll" ref={historyCard}>
          <div className="p2-tile__head">
            <h2 className="p2-tile__title p2-tile__title--lg">Sesiones guardadas</h2>
            {current && (
              <span className="p2-tile__meta tabular" aria-live="polite">
                {position} / {history.size}
              </span>
            )}
          </div>
          {!current ? (
            <EmptyState title="Aún no hay sesiones">Completa una sesión y aparecerá aquí.</EmptyState>
          ) : (
            <>
              <div className="p2-session" key={current.id}>
                <div data-swap>
                  <span className="p2-session__date">{formatShortDate(current.date)}</span>
                  <strong className="p2-session__name">{exerciseLabel(current.exercise)}</strong>
                </div>
                <div className="p2-session__stats" data-swap>
                  <span>
                    <strong className="tabular">{current.reps}</strong>
                    <small>reps</small>
                  </span>
                  <span>
                    <strong className="tabular">{current.accuracy}%</strong>
                    <small>precisión</small>
                  </span>
                  <span>
                    <strong className="tabular">{formatDuration(current.durationSeconds)}</strong>
                    <small>duración</small>
                  </span>
                </div>
                <span className={`p2-status ${current.synced ? "is-ok" : "is-pending"}`} data-swap>
                  {current.synced ? "Sincronizada" : "Pendiente de sincronizar"}
                </span>
              </div>
              <div className="p2-pager">
                <Button variant="ghost" onClick={() => move("prev")} disabled={!cursor?.hasPrev()} icon={<ChevronLeft size={16} />} aria-label="Sesión anterior">
                  Anterior
                </Button>
                <Button variant="ghost" onClick={() => move("next")} disabled={!cursor?.hasNext()} aria-label="Sesión siguiente">
                  Siguiente <ChevronRight size={16} aria-hidden="true" />
                </Button>
              </div>
            </>
          )}
        </article>
      </section>
    </div>
  );
}
