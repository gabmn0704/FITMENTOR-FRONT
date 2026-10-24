import { Droplets, Flame, Utensils } from "lucide-react";
import { Card } from "../ui";
import { Odometer } from "../motion/Odometer";
import { mealPlanForDay, postWorkoutTip } from "../../lib/nutrition";
import type { BodyProfile } from "../../lib/profile";

interface MealPlanCardProps {
  profile: BodyProfile;
  /** Día de la semana (0 = lunes); rota los alimentos para que cada día cambie el menú. */
  dayIndex: number;
  week: number;
  trainingDay: boolean;
}

/** Plan de alimentación del día, justo después de la rutina: metas, comidas con gramos y consejo post-entreno. */
export function MealPlanCard({ profile, dayIndex, week, trainingDay }: MealPlanCardProps) {
  const day = mealPlanForDay(profile, trainingDay, dayIndex + (week - 1) * 3);
  const { targets, total } = day;
  const macros = [
    { label: "Calorías", value: targets.kcal, got: total.kcal, unit: "" },
    { label: "Proteína", value: targets.proteinG, got: total.proteinG, unit: " g" },
    { label: "Carbohidratos", value: targets.carbsG, got: total.carbsG, unit: " g" },
    { label: "Grasas", value: targets.fatG, got: total.fatG, unit: " g" },
  ];

  return (
    <Card as="section" title="Plan de alimentación" className="meal-card">
      <p className="muted meal-card__lead">
        {trainingDay
          ? "Día de entrenamiento: más carbohidrato para rendir y recuperarte."
          : "Día de descanso: algo menos de energía, la misma proteína para reparar el músculo."}
      </p>

      <ul className="macro-row" aria-label="Metas del día">
        {macros.map((macro) => (
          <li key={macro.label}>
            <span className="macro-row__label">{macro.label}</span>
            <strong className="macro-row__value">
              <Odometer value={macro.value} suffix={macro.unit} stagger={50} />
            </strong>
            <span className="macro-row__got tabular">
              Menú: {macro.got}
              {macro.unit}
            </span>
          </li>
        ))}
      </ul>

      <ol className="meals">
        {day.meals.map((meal) => (
          <li key={meal.slot} className="meal">
            <div className="meal__head">
              <h3>
                <Utensils size={15} aria-hidden="true" /> {meal.title}
              </h3>
              <span className="tabular">
                {meal.kcal} kcal · {meal.proteinG} g prot.
              </span>
            </div>
            <ul className="meal__items">
              {meal.items.map((item) => (
                <li key={item.name}>
                  <strong>{item.amount}</strong> {item.name.toLowerCase()}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="meal-card__foot">
        <p>
          <Droplets size={16} aria-hidden="true" /> Bebe unos <strong>{targets.waterL} litros</strong> de agua hoy.
        </p>
        {trainingDay && (
          <p>
            <Flame size={16} aria-hidden="true" /> {postWorkoutTip(profile.goal)}
          </p>
        )}
        {targets.notes.map((note) => (
          <p key={note} className="muted">
            {note}
          </p>
        ))}
        <p className="muted small">Orientación general, no sustituye a un profesional de la salud. Ajusta las porciones según tu apetito y tu progreso.</p>
      </div>
    </Card>
  );
}
