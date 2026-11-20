import { useMemo, useRef, useState, type CSSProperties } from "react";
import { CalendarPlus, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Dumbbell, Moon, RotateCcw, Timer } from "lucide-react";
import { Button } from "../ui";
import { Odometer } from "../motion/Odometer";
import { ExerciseGuide } from "../training/ExerciseGuide";
import { MealPlanCard } from "./MealPlanCard";
import { CATALOG, catalogLabel, type CatalogId } from "../../lib/catalog";
import { useDoneSets } from "../../hooks/useDoneSets";
import { setPendingExercise } from "../../lib/pendingExercise";
import { formatDuration } from "../../lib/format";
import { currentWeek, goalName, type BodyProfile } from "../../lib/profile";
import { DAY_NAMES, DAY_SHORT, buildWeekPlan, expectedWeightKg, todayIndex } from "../../lib/weeklyPlan";
import { gsap, useGSAP, withMotion } from "../p2/motion";
import { downloadText, mondayOf, weekToIcs } from "../../lib/tracking";
import type { RouteId } from "../../lib/routes";
import type { Level } from "../../types";

interface WeekPlanViewProps {
  profile: BodyProfile;
  level: Level;
  onNavigate: (route: RouteId) => void;
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Plan de la semana como tablero: siete tarjetas (la del día elegido se abre en acordeón horizontal), el detalle
 * del día con la guía ilustrada de cada ejercicio y, debajo, la alimentación. Se puede mirar otras semanas del plan.
 */
export function WeekPlanView({ profile, level, onNavigate }: WeekPlanViewProps) {
  const thisWeek = Math.min(currentWeek(profile), profile.weeks);
  const [week, setWeek] = useState(thisWeek);
  const [direction, setDirection] = useState<1 | -1>(1);
  const plan = useMemo(() => buildWeekPlan(profile, level, week), [profile, level, week]);
  const today = todayIndex();
  const isThisWeek = week === thisWeek;
  const [selected, setSelected] = useState(today);
  const [openGuide, setOpenGuide] = useState<CatalogId | null>(null);
  const { done, mark } = useDoneSets();
  const day = plan.days[selected];
  const weeksLeft = Math.max(0, profile.weeks - week);
  const hasTarget = profile.targetWeightKg !== null;
  const expected = expectedWeightKg(profile, week);
  const trainDays = plan.days.filter((d) => d.kind === "train");
  const weekMinutes = trainDays.reduce((sum, d) => sum + d.minutes, 0);
  const board = useRef<HTMLDivElement>(null);
  const detail = useRef<HTMLDivElement>(null);

  const setsDone = (dayIndex: number) => {
    if (!isThisWeek || dayIndex !== today) return null;
    const items = plan.days[dayIndex].items.filter((item) => !item.engine);
    const total = items.reduce((sum, item) => sum + item.sets, 0);
    if (total === 0) return null;
    const got = items.reduce((sum, item) => sum + Math.min(item.sets, done[item.exercise] ?? 0), 0);
    return { got, total };
  };

  const goWeek = (next: number) => {
    const clamped = Math.min(profile.weeks, Math.max(1, next));
    if (clamped === week) return;
    setDirection(clamped > week ? 1 : -1);
    setWeek(clamped);
    setOpenGuide(null);
  };

  // La semana elegida, como eventos de calendario a las 18:00 con aviso 30 minutos antes.
  const exportWeek = () => {
    const monday = mondayOf();
    monday.setDate(monday.getDate() + (week - thisWeek) * 7);
    downloadText(`fitmentor-semana-${week}.ics`, weekToIcs(plan, monday, catalogLabel), "text/calendar;charset=utf-8");
  };

  // Cambio de semana: el tablero sale y entra hacia el lado al que se avanza.
  useGSAP(
    () =>
      withMotion(() => {
        gsap.from(".p2-day", { x: 40 * direction, autoAlpha: 0, duration: 0.7, ease: "expo.out", stagger: 0.04, clearProps: "transform,opacity,visibility" });
        gsap.from("[data-week-fade]", { y: 10, autoAlpha: 0, duration: 0.6, ease: "expo.out", stagger: 0.05, clearProps: "all" });
      }),
    { scope: board, dependencies: [week], revertOnUpdate: true },
  );

  // Cambio de día: el detalle entra en cascada.
  useGSAP(
    () =>
      withMotion(() => {
        gsap.from("[data-detail]", { y: 22, autoAlpha: 0, duration: 0.7, ease: "expo.out", stagger: 0.06, clearProps: "transform,opacity,visibility" });
      }),
    { scope: detail, dependencies: [selected, week], revertOnUpdate: true },
  );

  // La guía se despliega midiendo su alto real.
  useGSAP(
    () =>
      withMotion(() => {
        if (!openGuide) return;
        const panel = detail.current?.querySelector<HTMLElement>(`[data-guide="${openGuide}"]`);
        if (!panel) return;
        gsap.from(panel, { height: 0, autoAlpha: 0, duration: 0.6, ease: "expo.out", clearProps: "height,opacity,visibility" });
        gsap.from(panel.querySelectorAll(".guide__frames > *, .guide__text > *"), { y: 16, autoAlpha: 0, duration: 0.6, delay: 0.12, stagger: 0.06, ease: "expo.out", clearProps: "all" });
      }),
    { scope: detail, dependencies: [openGuide], revertOnUpdate: true },
  );

  return (
    <div className="p2-plan">
      <section className="p2-week" ref={board} aria-labelledby="week-title" data-reveal>
        <div className="p2-week__top">
          <div className="p2-week__intro">
            <h2 id="week-title" className="p2-week__title" data-week-fade>
              Semana {week} <span>de {profile.weeks}</span>
            </h2>
            <p className="p2-week__theme" data-week-fade>
              {plan.deload && <span className="p2-pill p2-pill--soft">Descarga</span>}
              {plan.theme}
            </p>
          </div>
          <div className="p2-week__nav" role="group" aria-label="Cambiar de semana">
            <button type="button" className="p2-chipbtn" onClick={exportWeek} title="Descarga un archivo .ics para Google Calendar, Outlook o tu teléfono">
              <CalendarPlus size={15} aria-hidden="true" /> Añadir al calendario
            </button>
            {!isThisWeek && (
              <button type="button" className="p2-chipbtn" onClick={() => goWeek(thisWeek)}>
                <RotateCcw size={14} aria-hidden="true" /> Semana actual
              </button>
            )}
            <button type="button" className="p2-iconbtn" onClick={() => goWeek(week - 1)} disabled={week <= 1} aria-label="Semana anterior">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" className="p2-iconbtn" onClick={() => goWeek(week + 1)} disabled={week >= profile.weeks} aria-label="Semana siguiente">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p2-week__track" aria-hidden="true">
          {Array.from({ length: profile.weeks }, (_, index) => (
            <span key={index} className={index + 1 < week ? "is-past" : index + 1 === week ? "is-now" : ""} />
          ))}
        </div>

        <dl className="p2-week__facts">
          <div data-week-fade>
            <dt>Objetivo</dt>
            <dd>{goalName(profile.goal)}</dd>
          </div>
          <div data-week-fade>
            <dt>Entrenos</dt>
            <dd className="tabular">
              {trainDays.length} días · {weekMinutes} min
            </dd>
          </div>
          {hasTarget && (
            <div data-week-fade>
              <dt>Al cerrar la semana</dt>
              <dd className="tabular">
                cerca de {expected} kg <small>meta {profile.targetWeightKg} kg</small>
              </dd>
            </div>
          )}
          <div data-week-fade>
            <dt>Quedan</dt>
            <dd className="tabular">{weeksLeft > 0 ? `${weeksLeft} ${weeksLeft === 1 ? "semana" : "semanas"}` : "Última semana"}</dd>
          </div>
        </dl>

        <div className="p2-board" role="tablist" aria-label="Días de la semana">
          {plan.days.map((d) => {
            const isOn = selected === d.index;
            const isToday = isThisWeek && today === d.index;
            const progress = setsDone(d.index);
            return (
              <button
                key={`${week}-${d.index}`}
                type="button"
                role="tab"
                id={`day-tab-${d.index}`}
                aria-controls="day-panel"
                aria-selected={isOn}
                className={`p2-day${d.kind === "train" ? " is-train" : " is-rest"}${isOn ? " is-on" : ""}${isToday ? " is-today" : ""}`}
                onClick={() => {
                  setSelected(d.index);
                  setOpenGuide(null);
                }}
              >
                <span className="p2-day__top">
                  <span className="p2-day__short">{DAY_SHORT[d.index]}</span>
                  {isToday && <span className="p2-day__today">Hoy</span>}
                </span>
                <span className="p2-day__title">{d.kind === "train" ? d.title : "Descanso"}</span>
                <span className="p2-day__meta">
                  {d.kind === "train" ? (
                    <>
                      <Dumbbell size={13} aria-hidden="true" /> {d.items.length} ejercicios · {d.minutes} min
                    </>
                  ) : (
                    <>
                      <Moon size={13} aria-hidden="true" /> Recupera
                    </>
                  )}
                </span>
                {isOn && d.kind === "train" && (
                  <span className="p2-day__list" aria-hidden="true">
                    {d.items.slice(0, 4).map((item) => (
                      <span key={item.exercise}>{catalogLabel(item.exercise)}</span>
                    ))}
                  </span>
                )}
                <span className="p2-day__bar" aria-hidden="true">
                  <span style={{ width: progress ? `${(progress.got / progress.total) * 100}%` : d.kind === "train" ? "0%" : "100%" }} />
                </span>
                {progress && (
                  <span className="p2-day__sets tabular">
                    {progress.got}/{progress.total} series
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="p2-detail" id="day-panel" role="tabpanel" aria-labelledby={`day-tab-${day.index}`} ref={detail}>
        <header className="p2-detail__head" data-detail>
          <div>
            <p className="p2-detail__kicker">{DAY_NAMES[day.index]}</p>
            <h2 className="p2-detail__title">{day.title}</h2>
            <p className="p2-detail__focus">{day.focus}</p>
          </div>
          {day.kind === "train" && (
            <div className="p2-detail__cta">
              <span className="p2-detail__time tabular">
                <Timer size={16} aria-hidden="true" /> Unos {day.minutes} minutos con calentamiento
              </span>
              <Button variant="primary" large onClick={() => onNavigate("entrenar")} icon={<Dumbbell size={18} />}>
                Ir a entrenar
              </Button>
            </div>
          )}
        </header>

        {day.kind === "train" ? (
          <ol className="p2-exlist">
            {day.items.map((item, index) => {
              const open = openGuide === item.exercise;
              const got = done[item.exercise] ?? 0;
              const trackable = !item.engine && isThisWeek && day.index === today;
              return (
                <li key={item.exercise} className={`p2-ex${open ? " is-open" : ""}`} data-detail style={{ "--i": index } as CSSProperties}>
                  <div className="p2-ex__row">
                    <span className="p2-ex__num tabular" aria-hidden="true">
                      {pad(index + 1)}
                    </span>
                    <div className="p2-ex__name">
                      <h3>{catalogLabel(item.exercise)}</h3>
                      <p>
                        <span className="p2-pill">{CATALOG[item.exercise].muscle}</span>
                        <span className="p2-ex__rest">
                          <Timer size={13} aria-hidden="true" /> descanso {formatDuration(item.restSec)}
                        </span>
                      </p>
                    </div>
                    <div className="p2-ex__dose tabular" aria-label={`${item.sets} series de ${item.target}${item.unit === "seconds" ? " segundos" : " repeticiones"}${item.perSide ? " por lado" : ""}`}>
                      <span aria-hidden="true">
                        <Odometer key={`${week}-${item.exercise}-s`} value={item.sets} stagger={40} />
                        <i>×</i>
                        <Odometer key={`${week}-${item.exercise}-t`} value={item.target} stagger={40} />
                        {item.unit === "seconds" ? <i>s</i> : null}
                      </span>
                      <small aria-hidden="true">
                        series × {item.unit === "seconds" ? "segundos" : "reps"}
                        {item.perSide ? " por lado" : ""}
                      </small>
                    </div>
                  </div>
                  <p className="p2-ex__note">{item.note}</p>
                  <div className="p2-ex__actions">
                    <button
                      type="button"
                      className="p2-chipbtn"
                      aria-expanded={open}
                      aria-controls={`guide-${item.exercise}`}
                      onClick={() => setOpenGuide(open ? null : item.exercise)}
                    >
                      {open ? "Ocultar la guía" : "Ver cómo se hace"} <ChevronDown size={15} aria-hidden="true" className="p2-chev" />
                    </button>
                    {item.engine ? (
                      <button
                        type="button"
                        className="p2-chipbtn p2-chipbtn--cobalt"
                        onClick={() => {
                          setPendingExercise({ engine: item.engine!, variant: item.exercise });
                          onNavigate("entrenar");
                        }}
                      >
                        <Camera size={15} aria-hidden="true" /> Entrenar con la cámara
                      </button>
                    ) : (
                      trackable && (
                        <div className="p2-sets" role="group" aria-label={`Series de ${catalogLabel(item.exercise)}`}>
                          <span className="p2-sets__label tabular">
                            Series {got}/{item.sets}
                          </span>
                          {Array.from({ length: item.sets }, (_, setIndex) => (
                            <button
                              key={setIndex}
                              type="button"
                              className={`p2-set${got > setIndex ? " is-done" : ""}`}
                              aria-pressed={got > setIndex}
                              aria-label={`Serie ${setIndex + 1}`}
                              onClick={() => mark(item.exercise, setIndex + 1)}
                            >
                              {got > setIndex ? <Check size={15} aria-hidden="true" /> : setIndex + 1}
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                  {open && (
                    <div className="p2-ex__guide" id={`guide-${item.exercise}`} data-guide={item.exercise}>
                      <ExerciseGuide exercise={item.exercise} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="p2-rest" data-detail>
            <Moon size={28} aria-hidden="true" />
            <div>
              <h3>Hoy no hay series: también cuenta como entrenamiento</h3>
              <p>Camina 20 a 30 minutos, estira caderas y espalda, y duerme bien. El músculo crece mientras descansas.</p>
            </div>
          </div>
        )}
      </section>

      <MealPlanCard profile={profile} dayIndex={day.index} week={week} trainingDay={day.kind === "train"} isToday={isThisWeek && day.index === today} />
    </div>
  );
}
