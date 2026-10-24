import { useMemo, useState } from "react";
import { Camera, Check, ChevronDown, Dumbbell, Timer } from "lucide-react";
import { Button, Card } from "../ui";
import { Odometer } from "../motion/Odometer";
import { ExerciseGuide } from "../training/ExerciseGuide";
import { MealPlanCard } from "./MealPlanCard";
import { CATALOG, catalogLabel, type CatalogId } from "../../lib/catalog";
import { useDoneSets } from "../../hooks/useDoneSets";
import { setPendingExercise } from "../../lib/pendingExercise";
import { formatDuration } from "../../lib/format";
import { currentWeek, goalName, type BodyProfile } from "../../lib/profile";
import { DAY_NAMES, DAY_SHORT, buildWeekPlan, expectedWeightKg, todayIndex } from "../../lib/weeklyPlan";
import type { RouteId } from "../../lib/routes";
import type { Level } from "../../types";

interface WeekPlanViewProps {
  profile: BodyProfile;
  level: Level;
  onNavigate: (route: RouteId) => void;
}

/** Rutina de la semana en curso: selector de día, ejercicios con su técnica y, debajo, la alimentación del día. */
export function WeekPlanView({ profile, level, onNavigate }: WeekPlanViewProps) {
  const week = currentWeek(profile);
  const plan = useMemo(() => buildWeekPlan(profile, level, week), [profile, level, week]);
  const [selected, setSelected] = useState(todayIndex());
  const [openGuide, setOpenGuide] = useState<CatalogId | null>(null);
  const { done, mark } = useDoneSets();
  const day = plan.days[selected];
  const weeksLeft = Math.max(0, profile.weeks - week);
  const hasTarget = profile.targetWeightKg !== null;
  const expected = expectedWeightKg(profile, week);

  return (
    <div className="stack">
      <Card as="section" title={`Semana ${Math.min(week, profile.weeks)} de ${profile.weeks}`} className="week-card">
        <p className="week-card__goal">
          Objetivo: <strong>{goalName(profile.goal)}</strong>
          {hasTarget && (
            <>
              {" "}
              · de {profile.weightKg} kg a {profile.targetWeightKg} kg
            </>
          )}
          . {plan.theme}.
        </p>
        <div className="week-progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (week / profile.weeks) * 100)}%` }} />
        </div>
        <p className="muted week-card__meta">
          {weeksLeft > 0 ? `Quedan ${weeksLeft} ${weeksLeft === 1 ? "semana" : "semanas"}.` : "Última semana del plan: pásate por Perfil para renovarlo."}
          {hasTarget && (
            <>
              {" "}
              Si sigues el plan, hacia el final de esta semana estarías cerca de <strong>{expected} kg</strong>.
            </>
          )}
        </p>

        <div className="day-tabs" role="tablist" aria-label="Días de la semana">
          {plan.days.map((d) => (
            <button
              key={d.index}
              type="button"
              role="tab"
              aria-selected={selected === d.index}
              className={`day-tab${d.kind === "train" ? " is-train" : ""}${todayIndex() === d.index ? " is-today" : ""}`}
              onClick={() => {
                setSelected(d.index);
                setOpenGuide(null);
              }}
            >
              <span>{DAY_SHORT[d.index]}</span>
              <i aria-hidden="true" />
            </button>
          ))}
        </div>
      </Card>

      <Card as="section" title={`${DAY_NAMES[day.index]}: ${day.title}`}>
        <p className="muted day-focus">{day.focus}</p>
        {day.kind === "train" ? (
          <>
            <ul className="plan-items">
              {day.items.map((item) => (
                <li key={item.exercise} className="plan-item">
                  <div className="plan-item__main">
                    <strong className="plan-item__name">{catalogLabel(item.exercise)}</strong>
                    <span className="chip">{CATALOG[item.exercise].muscle}</span>
                    <span className="plan-item__dose tabular">
                      <Odometer key={`${week}-${item.exercise}-s`} value={item.sets} stagger={40} /> ×{" "}
                      <Odometer key={`${week}-${item.exercise}-t`} value={item.target} stagger={40} />
                      {item.unit === "seconds" ? " s" : ""}
                      {item.perSide ? <small> por lado</small> : null}
                    </span>
                    <span className="plan-item__rest">
                      <Timer size={14} aria-hidden="true" /> descanso {formatDuration(item.restSec)}
                    </span>
                  </div>
                  <p className="muted plan-item__note">{item.note}</p>
                  <button
                    type="button"
                    className="guide-toggle"
                    aria-expanded={openGuide === item.exercise}
                    onClick={() => setOpenGuide(openGuide === item.exercise ? null : item.exercise)}
                  >
                    Ver cómo se hace <ChevronDown size={16} aria-hidden="true" />
                  </button>
                  {openGuide === item.exercise && <ExerciseGuide exercise={item.exercise} compact />}
                  {item.engine ? (
                    <button
                      type="button"
                      className="camera-link"
                      onClick={() => {
                        setPendingExercise({ engine: item.engine!, variant: item.exercise });
                        onNavigate("entrenar");
                      }}
                    >
                      <Camera size={16} aria-hidden="true" /> Entrenar con la cámara
                    </button>
                  ) : (
                    day.index === todayIndex() && (
                      <div className="set-tracker" role="group" aria-label={`Series de ${catalogLabel(item.exercise)}`}>
                        <span className="set-tracker__label">
                          Series hechas {done[item.exercise] ?? 0}/{item.sets}
                        </span>
                        {Array.from({ length: item.sets }, (_, index) => (
                          <button
                            key={index}
                            type="button"
                            className={`set-pill${(done[item.exercise] ?? 0) > index ? " is-done" : ""}`}
                            aria-pressed={(done[item.exercise] ?? 0) > index}
                            aria-label={`Serie ${index + 1}`}
                            onClick={() => mark(item.exercise, index + 1)}
                          >
                            {(done[item.exercise] ?? 0) > index ? <Check size={16} aria-hidden="true" /> : index + 1}
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </li>
              ))}
            </ul>
            <div className="row day-actions">
              <Button variant="primary" large onClick={() => onNavigate("entrenar")} icon={<Dumbbell size={18} />}>
                Ir a entrenar
              </Button>
              <span className="muted tabular">Unos {day.minutes} minutos con calentamiento</span>
            </div>
          </>
        ) : (
          <p className="rest-note">Hoy no hay series: cuenta como entrenamiento. Camina, estira y duerme bien.</p>
        )}
      </Card>

      <MealPlanCard profile={profile} dayIndex={day.index} week={week} trainingDay={day.kind === "train"} />
    </div>
  );
}
