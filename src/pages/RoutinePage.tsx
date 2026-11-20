import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarRange, Dumbbell, Sparkles } from "lucide-react";
import { Button, EmptyState, Notice } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useAsync } from "../hooks/useAsync";
import { useProfile } from "../hooks/useProfile";
import { WeekPlanView } from "../components/plan/WeekPlanView";
import { Odometer } from "../components/motion/Odometer";
import { PageHero } from "../components/p2/PageHero";
import { gsap, useGSAP, useReveal, withMotion } from "../components/p2/motion";
import { SinglyLinkedList, type SinglyNode } from "../structures";
import { routineApi } from "../lib/services";
import { exerciseLabel } from "../lib/exercises";
import { formatDuration } from "../lib/format";
import { levelLabel, routineNote, routineReason } from "../lib/contract";
import { goalName } from "../lib/profile";
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

const pad = (value: number) => String(value).padStart(2, "0");

export function RoutinePage({ onNavigate }: RoutinePageProps) {
  const { token, user } = useAuth();
  const { profile, openWizard } = useProfile();
  const routine = useAsync(() => routineApi.get(token!), [token], Boolean(token));
  const list = useMemo(() => buildList(routine.data), [routine.data]);
  const [node, setNode] = useState<SinglyNode<RoutineItem> | null>(null);
  const [position, setPosition] = useState(1);
  const page = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNode(list.first());
    setPosition(1);
  }, [list]);

  useReveal(page, [Boolean(routine.data), Boolean(profile)]);

  // Cambio de ejercicio en el ajuste de la IA: el nombre sube en máscara y las cifras entran en cascada.
  useGSAP(
    () =>
      withMotion(() => {
        gsap.from("[data-ai-line]", { yPercent: 105, duration: 0.8, ease: "expo.out" });
        gsap.from("[data-ai-fade]", { y: 14, autoAlpha: 0, duration: 0.6, ease: "expo.out", stagger: 0.05, delay: 0.1, clearProps: "all" });
      }),
    { scope: stage, dependencies: [position, routine.data], revertOnUpdate: true },
  );

  const next = () => {
    if (!node) return;
    const following = list.nextCircular(node);
    if (!following) return;
    setNode(following);
    setPosition((p) => (p >= list.size ? 1 : p + 1));
  };

  const jump = (index: number) => {
    let walker: SinglyNode<RoutineItem> | null = list.first();
    for (let i = 0; walker && i < index; i++) walker = list.nextCircular(walker);
    setNode(walker);
    setPosition(index + 1);
  };

  const current = node?.value;

  return (
    <div className="p2-page p3-routine" ref={page}>
      <PageHero
        title={["Tu semana,", "pieza a pieza"]}
        accent={1}
        kicker={
          profile ? (
            <>
              <CalendarRange size={14} aria-hidden="true" /> Plan de {profile.weeks} semanas · {goalName(profile.goal)}
            </>
          ) : (
            "Plan semanal"
          )
        }
        lead={routine.data ? routineReason(routine.data.reason, routine.data.level) : "La IA ajusta series y repeticiones según tu nivel y tu última sesión."}
        mascot="wave"
      />

      {profile ? (
        <WeekPlanView profile={profile} level={user?.level ?? "BEGINNER"} onNavigate={onNavigate} />
      ) : (
        <section className="p3-cta" data-reveal aria-labelledby="plan-cta">
          <div>
            <p className="p3-eyebrow">Sin plan todavía</p>
            <h2 id="plan-cta" className="p3-cta__title">
              Haz tu plan personal
            </h2>
            <p className="p3-cta__lead">
              Cuéntanos tu objetivo, peso, altura y plazo, y armamos tu rutina semanal con la alimentación de cada día.
            </p>
          </div>
          <Button variant="primary" large onClick={openWizard} icon={<ArrowRight size={18} />}>
            Crear mi plan
          </Button>
        </section>
      )}

      {!token && <Notice tone="info">Inicia sesión para generar tu rutina personalizada.</Notice>}
      {token && routine.loading && <div className="skeleton" style={{ height: 320, borderRadius: 22 }} aria-label="Cargando rutina" />}
      {token && routine.error && <Notice tone="error">No pudimos cargar la rutina: {routine.error}</Notice>}

      {routine.data && current && (
        <section className="p3-ai" aria-labelledby="ai-title" data-reveal="scroll">
          <div className="p3-ai__stage" ref={stage}>
            <p className="p3-ai__kicker">
              <Sparkles size={14} aria-hidden="true" /> <span id="ai-title">Ajuste de la IA según tu última sesión</span>
            </p>
            <p className="p3-ai__count tabular" aria-live="polite">
              {pad(position)} <span>/ {pad(list.size)}</span>
            </p>
            <h2 className="p3-ai__name">
              <span className="p2-mask">
                <span data-ai-line>{exerciseLabel(current.exercise)}</span>
              </span>
            </h2>
            <dl className="p3-ai__figures">
              <div data-ai-fade>
                <dt>Series</dt>
                <dd className="tabular">
                  <Odometer key={`s-${position}`} value={current.sets} />
                </dd>
              </div>
              <div data-ai-fade>
                <dt>Repeticiones</dt>
                <dd className="tabular">
                  <Odometer key={`r-${position}`} value={current.reps} />
                </dd>
              </div>
              <div data-ai-fade>
                <dt>Descanso</dt>
                <dd className="tabular">{formatDuration(routine.data.restSeconds)}</dd>
              </div>
            </dl>
            <p className="p3-ai__note" data-ai-fade>
              {routineNote(current.note)}
            </p>
            <div className="p3-ai__actions" data-ai-fade>
              <Button variant="primary" large onClick={() => onNavigate("entrenar")} icon={<Dumbbell size={18} />}>
                Entrenar este ejercicio
              </Button>
              <button type="button" className="p3-ai__next" onClick={next}>
                Siguiente <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="p3-ai__rail">
            <p className="p3-ai__level">Nivel {levelLabel(routine.data.level).toLowerCase()}</p>
            <ol className="p3-ai__list">
              {list.toArray().map((item, index) => {
                const on = node?.value === item;
                return (
                  <li key={`${item.exercise}-${index}`}>
                    <button type="button" className={`p3-ai__item${on ? " is-on" : ""}`} aria-current={on ? "step" : undefined} onClick={() => jump(index)}>
                      <span className="p3-ai__pos tabular" aria-hidden="true">
                        {pad(index + 1)}
                      </span>
                      <span className="p3-ai__label">
                        <strong>{exerciseLabel(item.exercise)}</strong>
                        <small>{routineNote(item.note)}</small>
                      </span>
                      <span className="p3-ai__dose tabular">
                        {item.sets}×{item.reps}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      {routine.data && list.size === 0 && <EmptyState title="Sin ejercicios por hoy">Descansa y vuelve mañana.</EmptyState>}
    </div>
  );
}
