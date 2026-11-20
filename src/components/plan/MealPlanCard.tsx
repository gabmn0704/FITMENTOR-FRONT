import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Droplets, Flame, GlassWater } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { dateKey, glassesFor, readDayLog, setWater, toggleMeal, type DayLog } from "../../lib/tracking";
import { Odometer } from "../motion/Odometer";
import { gsap, useGSAP, withMotion } from "../p2/motion";
import { mealPlanForDay } from "../../lib/meals";
import { postWorkoutTip } from "../../lib/nutrition";
import type { BodyProfile } from "../../lib/profile";

interface MealPlanCardProps {
  profile: BodyProfile;
  /** Día de la semana (0 = lunes); rota los alimentos para que cada día cambie el menú. */
  dayIndex: number;
  week: number;
  trainingDay: boolean;
  /** Es el día de hoy: se pueden marcar comidas y vasos de agua. */
  isToday?: boolean;
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Alimentación del día, justo después de la rutina: a la izquierda las metas (energía y reparto de macros en una
 * sola barra), a la derecha las comidas como una línea de tiempo con gramos y cambios posibles.
 */
export function MealPlanCard({ profile, dayIndex, week, trainingDay, isToday = false }: MealPlanCardProps) {
  const root = useRef<HTMLElement>(null);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const today = dateKey();
  const [log, setLog] = useState<DayLog>(() => readDayLog(today, userId));
  useEffect(() => setLog(readDayLog(today, userId)), [today, userId]);
  const day = mealPlanForDay(profile, trainingDay, dayIndex + (week - 1) * 7);
  const { targets, total } = day;
  const macroKcal = {
    protein: targets.proteinG * 4,
    carbs: targets.carbsG * 4,
    fat: targets.fatG * 9,
  };
  const macroSum = Math.max(1, macroKcal.protein + macroKcal.carbs + macroKcal.fat);
  const macros = [
    { key: "protein", label: "Proteína", value: targets.proteinG, got: total.proteinG, share: macroKcal.protein / macroSum },
    { key: "carbs", label: "Carbohidratos", value: targets.carbsG, got: total.carbsG, share: macroKcal.carbs / macroSum },
    { key: "fat", label: "Grasas", value: targets.fatG, got: total.fatG, share: macroKcal.fat / macroSum },
  ];
  const kcalFit = Math.round((total.kcal / Math.max(1, targets.kcal)) * 100);
  const glasses = Math.min(16, glassesFor(targets.waterL));
  const doneMeals = day.meals.filter((meal) => log.meals.includes(meal.slot));
  const eatenKcal = doneMeals.reduce((sum, meal) => sum + meal.kcal, 0);
  const eatenProtein = doneMeals.reduce((sum, meal) => sum + meal.proteinG, 0);

  // Cambio de día: el reparto se vuelve a dibujar y las comidas entran en cascada por la línea de tiempo.
  useGSAP(
    () =>
      withMotion(() => {
        gsap.from(".p3-macrobar > span", { scaleX: 0, transformOrigin: "left center", duration: 1.1, ease: "expo.out", stagger: 0.08 });
        gsap.from(".p3-meal", { y: 24, autoAlpha: 0, duration: 0.7, ease: "expo.out", stagger: 0.07, clearProps: "transform,opacity,visibility" });
        gsap.from(".p3-meals__spine", { scaleY: 0, transformOrigin: "top center", duration: 1.2, ease: "expo.out" });
      }),
    { scope: root, dependencies: [dayIndex, week, trainingDay], revertOnUpdate: true },
  );

  return (
    <section className="p3-food" ref={root} aria-labelledby="food-title" data-reveal="scroll">
      <div className="p3-food__goals">
        <p className="p3-eyebrow">{trainingDay ? "Día de entrenamiento" : "Día de descanso"}</p>
        <h2 id="food-title" className="p3-food__title">
          Alimentación
        </h2>
        <p className="p3-food__lead">
          {trainingDay
            ? "Más carbohidrato para rendir y recuperarte."
            : "Algo menos de energía, la misma proteína para reparar el músculo."}
        </p>

        <div className="p3-kcal">
          <span className="p3-kcal__value tabular">
            <Odometer value={targets.kcal} stagger={50} />
          </span>
          <span className="p3-kcal__unit">kcal meta</span>
          <span className="p3-kcal__fit tabular">
            El menú suma {total.kcal} kcal · {kcalFit}% de la meta
          </span>
        </div>

        {isToday && (
          <div className="p3-intake" aria-live="polite">
            <div className="p3-intake__row">
              <span>Hoy llevas</span>
              <strong className="tabular">
                {eatenKcal} <small>kcal</small>
              </strong>
              <strong className="tabular">
                {eatenProtein} <small>g prot.</small>
              </strong>
              <span className="tabular">
                {doneMeals.length}/{day.meals.length} comidas
              </span>
            </div>
            <div className="p3-intake__meter" aria-hidden="true">
              <span style={{ width: `${Math.min(100, (eatenKcal / Math.max(1, targets.kcal)) * 100)}%` }} />
            </div>
          </div>
        )}

        <div className="p3-macrobar" role="img" aria-label={macros.map((m) => `${m.label} ${Math.round(m.share * 100)} por ciento de la energía`).join(", ")}>
          {macros.map((macro) => (
            <span key={macro.key} className={`is-${macro.key}`} style={{ flexGrow: macro.share } as CSSProperties} />
          ))}
        </div>

        <ul className="p3-macros" aria-label="Metas del día">
          {macros.map((macro) => (
            <li key={macro.key}>
              <i className={`is-${macro.key}`} aria-hidden="true" />
              <span className="p3-macros__label">{macro.label}</span>
              <strong className="tabular">
                <Odometer value={macro.value} suffix=" g" stagger={50} />
              </strong>
              <small className="tabular">menú {macro.got} g</small>
            </li>
          ))}
        </ul>

        <div className="p3-water">
          <p className="p3-water__head">
            <Droplets size={16} aria-hidden="true" /> Agua: <strong>{targets.waterL} litros</strong>
            {isToday && (
              <span className="tabular">
                {Math.min(log.water, glasses)}/{glasses} vasos
              </span>
            )}
          </p>
          {isToday ? (
            <div className="p3-water__glasses" role="group" aria-label="Vasos de agua de 250 ml">
              {Array.from({ length: glasses }, (_, index) => {
                const full = log.water > index;
                return (
                  <button
                    key={index}
                    type="button"
                    className={`p3-glass${full ? " is-full" : ""}`}
                    aria-pressed={full}
                    aria-label={`Vaso ${index + 1}`}
                    onClick={() => setLog(setWater(today, full && log.water === index + 1 ? index : index + 1, userId))}
                  >
                    <GlassWater size={16} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="p3-water__hint">Unos {glasses} vasos de 250 ml repartidos en el día.</p>
          )}
        </div>

        <div className="p3-food__tips">
          {trainingDay && (
            <p>
              <Flame size={16} aria-hidden="true" /> {postWorkoutTip(profile.goal)}
            </p>
          )}
          {targets.notes.map((note) => (
            <p key={note} className="is-muted">
              {note}
            </p>
          ))}
        </div>
      </div>

      <div className="p3-meals">
        <span className="p3-meals__spine" aria-hidden="true" />
        <ol className="p3-meals__list">
          {day.meals.map((meal, index) => {
            const eaten = isToday && log.meals.includes(meal.slot);
            return (
            <li key={meal.slot} className={`p3-meal${eaten ? " is-done" : ""}`}>
              <span className="p3-meal__dot tabular" aria-hidden="true">
                {eaten ? <Check size={16} /> : pad(index + 1)}
              </span>
              <div className="p3-meal__head">
                <h3>{meal.title}</h3>
                <span className="tabular">
                  {meal.kcal} kcal · {meal.proteinG} g prot.
                </span>
                {isToday && (
                  <button
                    type="button"
                    className={`p3-meal__check${eaten ? " is-on" : ""}`}
                    aria-pressed={eaten}
                    onClick={() => setLog(toggleMeal(today, meal.slot, userId))}
                  >
                    <Check size={14} aria-hidden="true" /> {eaten ? "Hecha" : "Marcar hecha"}
                  </button>
                )}
              </div>
              <p className="p3-meal__dish">{meal.dish}</p>
              <ul className="p3-meal__items">
                {meal.items.map((item) => (
                  <li key={item.name}>
                    <strong className="tabular">{item.amount}</strong>
                    <span>{item.label}</span>
                    {item.swaps.length > 0 && (
                      <details className="p3-swaps">
                        <summary>Cambiar por</summary>
                        <ul>
                          {item.swaps.map((swap) => (
                            <li key={swap}>{swap}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </li>
            );
          })}
        </ol>
        <p className="p3-food__legal">
          Orientación general, no sustituye a un profesional de la salud. Ajusta las porciones según tu apetito y tu progreso.
        </p>
      </div>
    </section>
  );
}
