import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Dumbbell, Timer } from "lucide-react";
import { Button, Card, EmptyState, Notice } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useAsync } from "../hooks/useAsync";
import { useProfile } from "../hooks/useProfile";
import { WeekPlanView } from "../components/plan/WeekPlanView";
import { Odometer } from "../components/motion/Odometer";
import { SinglyLinkedList, type SinglyNode } from "../structures";
import { routineApi } from "../lib/services";
import { exerciseLabel } from "../lib/exercises";
import { formatDuration } from "../lib/format";
import { levelLabel, routineNote, routineReason } from "../lib/contract";
import type { RouteId } from "../lib/routes";
import type { Routine, RoutineItem } from "../types";

interface RoutinePageProps {
  onNavigate: (route: RouteId) => void;
}

/** Carrusel de la rutina: la lista enlazada recorre los ejercicios y vuelve al inicio. */
function buildList(routine: Routine | null): SinglyLinkedList<RoutineItem> {
  const list = new SinglyLinkedList<RoutineItem>();
  routine?.items.forEach((item) => list.append(item));
  return list;
}

export function RoutinePage({ onNavigate }: RoutinePageProps) {
  const { token, user } = useAuth();
  const { profile, reset } = useProfile();
  const routine = useAsync(() => routineApi.get(token!), [token], Boolean(token));
  const list = useMemo(() => buildList(routine.data), [routine.data]);
  const [node, setNode] = useState<SinglyNode<RoutineItem> | null>(null);
  const [position, setPosition] = useState(1);

  useEffect(() => {
    setNode(list.first());
    setPosition(1);
  }, [list]);

  const next = () => {
    if (!node) return;
    const following = list.nextCircular(node);
    if (!following) return;
    setNode(following);
    setPosition((p) => (p >= list.size ? 1 : p + 1));
  };

  const current = node?.value;

  return (
    <div className="stack">
      <header className="page-header" data-banner="core">
        <h1>Tu rutina de hoy</h1>
        <p>{routine.data ? routineReason(routine.data.reason, routine.data.level) : "La IA ajusta series y repeticiones según tu nivel y tu última sesión."}</p>
      </header>

      {profile ? (
        <WeekPlanView profile={profile} level={user?.level ?? "BEGINNER"} onNavigate={onNavigate} />
      ) : (
        <Card as="section" title="Haz tu plan personal">
          <p className="muted" style={{ marginBottom: 16 }}>
            Cuéntanos tu objetivo, peso, altura y plazo, y armamos tu rutina semanal con la alimentación de cada día.
          </p>
          <Button variant="primary" large onClick={reset}>
            Crear mi plan
          </Button>
        </Card>
      )}

      {profile && routine.data && current && <h2 className="section-title">Ajuste de la IA según tu última sesión</h2>}

      {!token && <Notice tone="info">Inicia sesión para generar tu rutina personalizada.</Notice>}
      {token && routine.loading && <div className="skeleton" style={{ height: 320 }} aria-label="Cargando rutina" />}
      {token && routine.error && <Notice tone="error">No pudimos cargar la rutina: {routine.error}</Notice>}

      {routine.data && current && (
        <div className="home-split">
          <Card title={exerciseLabel(current.exercise)} className="stack" as="div">
            <div className="row" style={{ gap: 28 }}>
              <div className="stat">
                <span className="stat__value tabular"><Odometer key={`s-${position}`} value={current.sets} /></span>
                <span className="stat__label">series</span>
              </div>
              <div className="stat">
                <span className="stat__value tabular"><Odometer key={`r-${position}`} value={current.reps} /></span>
                <span className="stat__label">repeticiones</span>
              </div>
              <div className="stat">
                <span className="stat__value tabular">{formatDuration(routine.data.restSeconds)}</span>
                <span className="stat__label">descanso</span>
              </div>
            </div>
            <p style={{ fontSize: 16 }}>{routineNote(current.note)}</p>
            <div className="row">
              <Button variant="primary" onClick={() => onNavigate("entrenar")} icon={<Dumbbell size={16} />}>
                Entrenar este ejercicio
              </Button>
              <Button variant="ghost" onClick={next} icon={<ArrowRight size={16} />}>
                Siguiente
              </Button>
            </div>
          </Card>

          <Card title={`Nivel ${levelLabel(routine.data.level).toLowerCase()}`} as="div">
            <ol className="stack" style={{ gap: 10, padding: 0, margin: 0, listStyle: "none" }}>
              {list.toArray().map((item, index) => (
                <li key={`${item.exercise}-${index}`}>
                  <button
                    type="button"
                    className="routine-item"
                    style={{ width: "100%", textAlign: "left" }}
                    aria-current={node?.value === item ? "step" : undefined}
                    onClick={() => {
                      let walker: SinglyNode<RoutineItem> | null = list.first();
                      for (let i = 0; walker && i < index; i++) walker = list.nextCircular(walker);
                      setNode(walker);
                      setPosition(index + 1);
                    }}
                  >
                    <span className="routine-item__index">{index + 1}</span>
                    <span style={{ minWidth: 0 }}>
                      <strong>{exerciseLabel(item.exercise)}</strong>
                      <span className="routine-item__meta" style={{ display: "block" }}>
                        {item.sets} × {item.reps} · {routineNote(item.note)}
                      </span>
                    </span>
                    <Timer size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}

      {routine.data && list.size === 0 && <EmptyState title="Sin ejercicios por hoy">Descansa y vuelve mañana.</EmptyState>}
    </div>
  );
}
