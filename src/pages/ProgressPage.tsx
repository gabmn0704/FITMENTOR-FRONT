import { useEffect, useMemo, useState } from "react";
import { CloudUpload, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Card, EmptyState } from "../components/ui";
import { BarChart } from "../components/charts/BarChart";
import { LineChart } from "../components/charts/LineChart";
import { useAuth } from "../hooks/useAuth";
import { useAsync } from "../hooks/useAsync";
import { DoublyLinkedList, type ListCursor } from "../structures";
import { exerciseLabel } from "../lib/exercises";
import { formatDuration, formatShortDate } from "../lib/format";
import { computeLocalStats } from "../lib/stats";
import { mergeHistory, readLocalSessions, syncPendingSessions, type HistoryEntry } from "../lib/sessions";
import { sessionsApi, statsApi } from "../lib/services";
import type { SessionRecord, Stats } from "../types";

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function weekdayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

export function ProgressPage() {
  const { token } = useAuth();
  const [version, setVersion] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [localList, setLocalList] = useState<SessionRecord[]>(() => readLocalSessions());
  const stats = useAsync(() => statsApi.get(token!), [token, version], Boolean(token));
  const serverSessions = useAsync(() => sessionsApi.list(token!, 50), [token, version], Boolean(token));

  const data: Stats = stats.data ?? computeLocalStats(localList);
  const pending = localList.filter((s) => !s.synced).length;

  // Historial en lista doblemente enlazada: más reciente primero, navegable con cursor.
  const history = useMemo(() => {
    const list = new DoublyLinkedList<HistoryEntry>();
    mergeHistory(serverSessions.data, localList).forEach((s) => list.append(s));
    return list;
  }, [serverSessions.data, localList]);
  const [cursor, setCursor] = useState<ListCursor<HistoryEntry> | null>(null);
  const [current, setCurrent] = useState<HistoryEntry | undefined>(undefined);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const c = history.cursor();
    setCursor(c);
    setCurrent(c.value);
    setPosition(c.index() + 1);
  }, [history]);

  const move = (direction: "next" | "prev") => {
    if (!cursor) return;
    if (direction === "next") cursor.next();
    else cursor.prev();
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

  return (
    <div className="stack">
      <header className="page-header" data-banner="deadlift">
        <p className="eyebrow">Tu progreso</p>
        <h1>Constancia y técnica</h1>
        <p>Cada sesión suma control, consistencia y técnica.</p>
      </header>

      <section className="stats-row" aria-label="Totales">
        <Card as="div"><div className="stat"><span className="stat__value tabular">{data.totalSessions}</span><span className="stat__label">sesiones</span></div></Card>
        <Card as="div"><div className="stat"><span className="stat__value tabular">{data.totalReps}</span><span className="stat__label">repeticiones</span></div></Card>
        <Card as="div"><div className="stat"><span className="stat__value tabular">{data.avgAccuracy}%</span><span className="stat__label">precisión media</span></div></Card>
        <Card as="div"><div className="stat"><span className="stat__value tabular">{data.streakDays}</span><span className="stat__label">días de racha</span></div></Card>
      </section>

      {pending > 0 && (
        <Card as="div" className="row" style={{ justifyContent: "space-between" }}>
          <span>
            <strong>{pending}</strong> {pending === 1 ? "sesión pendiente" : "sesiones pendientes"} de sincronizar.
          </span>
          <Button variant="ghost" onClick={() => void sync()} loading={syncing} disabled={!token} icon={<CloudUpload size={16} />}>
            Sincronizar
          </Button>
        </Card>
      )}

      <div className="home-split">
        <Card eyebrow="Última semana" title="Repeticiones por día">
          <BarChart label="Repeticiones de los últimos siete días" data={data.weekly.map((d, i) => ({ label: weekLabels[i], value: d.reps }))} />
        </Card>
        <Card eyebrow="Técnica" title="Precisión media">
          <LineChart label="Precisión media por día" values={accuracyValues} labels={weekLabels} />
        </Card>
      </div>

      <div className="home-split">
        <Card eyebrow="Reparto" title="Por ejercicio">
          {data.byExercise.length === 0 ? (
            <EmptyState title="Sin datos todavía">Completa una sesión y verás tu reparto aquí.</EmptyState>
          ) : (
            <div className="stack" style={{ gap: 14 }}>
              {data.byExercise.map((entry) => (
                <div key={entry.exercise}>
                  <div className="row" style={{ justifyContent: "space-between", fontSize: 14 }}>
                    <strong>{exerciseLabel(entry.exercise)}</strong>
                    <span className="muted tabular">
                      {entry.reps} reps · {entry.accuracy}%
                    </span>
                  </div>
                  <div className="bar" style={{ marginTop: 6 }} role="img" aria-label={`${exerciseLabel(entry.exercise)}: ${entry.reps} repeticiones`}>
                    <div className="bar__fill" style={{ width: `${(entry.reps / maxExerciseReps) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card eyebrow="Historial" title="Sesiones guardadas">
          {!current ? (
            <EmptyState title="Aún no hay sesiones">Completa una sesión y aparecerá aquí.</EmptyState>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              <div className="history-item" style={{ borderBottom: 0, padding: 0 }}>
                <div className="stat" style={{ minWidth: 56 }}>
                  <span className="stat__value tabular">{current.reps}</span>
                  <span className="stat__label">reps</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <strong>{exerciseLabel(current.exercise)}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {formatShortDate(current.date)} · {formatDuration(current.durationSeconds)} ·{" "}
                    {current.synced ? "Sincronizada" : "Pendiente"}
                  </div>
                </div>
                <span className="chip chip--lime tabular">{current.accuracy}%</span>
              </div>
              <div className="history-nav">
                <Button variant="ghost" onClick={() => move("prev")} disabled={!cursor?.hasPrev()} icon={<ChevronLeft size={16} />} aria-label="Sesión anterior">
                  Anterior
                </Button>
                <span className="muted tabular" aria-live="polite">
                  {position} / {history.size}
                </span>
                <Button variant="ghost" onClick={() => move("next")} disabled={!cursor?.hasNext()} aria-label="Sesión siguiente">
                  Siguiente <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
