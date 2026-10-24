import type { ExerciseId, Level } from "../types";
import type { BodyProfile, FitnessGoal } from "./profile";
import { nutritionTargets } from "./nutrition";

/**
 * Rutina semanal personalizada. Usa los cinco ejercicios que la cámara sabe medir, reparte los días según los
 * que la persona puede entrenar y sube la carga semana a semana (tres semanas de progresión y una de descarga).
 */

export interface PlanItem {
  exercise: ExerciseId;
  sets: number;
  /** Repeticiones, o segundos si el ejercicio es una plancha. */
  target: number;
  unit: "reps" | "seconds";
  restSec: number;
  note: string;
}

export interface DayPlan {
  /** 0 = lunes … 6 = domingo. */
  index: number;
  name: string;
  kind: "train" | "rest";
  title: string;
  focus: string;
  items: PlanItem[];
  minutes: number;
}

export interface WeekPlan {
  week: number;
  /** Cuarta semana de cada bloque: menos volumen para recuperar. */
  deload: boolean;
  theme: string;
  days: DayPlan[];
}

export const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
export const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

type Session = "legs" | "push" | "full" | "circuit";

const SESSIONS: Record<Session, { title: string; focus: string; exercises: ExerciseId[] }> = {
  legs: { title: "Piernas y core", focus: "Sentadilla, zancada y peso muerto para la parte baja, con plancha para el centro.", exercises: ["squat", "lunge", "deadlift", "plank"] },
  push: { title: "Empuje y core", focus: "Flexiones para pecho, hombros y brazos, con zancadas y plancha.", exercises: ["push_up", "lunge", "plank", "squat"] },
  full: { title: "Cuerpo completo", focus: "Un ejercicio por cada gran patrón de movimiento.", exercises: ["squat", "push_up", "deadlift", "plank"] },
  circuit: { title: "Circuito de resistencia", focus: "Pasa de un ejercicio al siguiente con poca pausa para subir el pulso.", exercises: ["squat", "push_up", "lunge", "plank"] },
};

const TRAIN_DAYS: Record<3 | 4 | 5 | 6, number[]> = {
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

const SESSION_ORDER: Record<3 | 4 | 5 | 6, Session[]> = {
  3: ["full", "legs", "push"],
  4: ["legs", "push", "full", "circuit"],
  5: ["legs", "push", "full", "circuit", "legs"],
  6: ["legs", "push", "full", "legs", "push", "circuit"],
};

interface GoalStyle {
  reps: number;
  rest: number;
  plank: number;
  tip: string;
}

const GOAL_STYLE: Record<FitnessGoal, GoalStyle> = {
  lose_fat: { reps: 15, rest: 40, plank: 40, tip: "Descansa poco entre series: mantener el pulso alto ayuda a gastar más energía." },
  build_muscle: { reps: 10, rest: 90, plank: 45, tip: "Baja en tres segundos y sube con fuerza; las últimas repeticiones deben costar." },
  tone: { reps: 12, rest: 60, plank: 40, tip: "Controla cada repetición y no rebotes abajo: tonifica quien mantiene la tensión." },
  endurance: { reps: 18, rest: 30, plank: 60, tip: "Mantén un ritmo constante y respira al subir; la pausa es corta a propósito." },
  health: { reps: 10, rest: 60, plank: 30, tip: "Prioriza la técnica y sal con energía: la constancia pesa más que la intensidad." },
};

const LEVEL_SETS: Record<Level, number> = { BEGINNER: 2, INTERMEDIATE: 3, ADVANCED: 4 };
const LEVEL_REPS: Record<Level, number> = { BEGINNER: 0.8, INTERMEDIATE: 1, ADVANCED: 1.1 };

const EXERCISE_FACTOR: Partial<Record<ExerciseId, number>> = { deadlift: 0.8, push_up: 0.85, lunge: 0.8 };

const BLOCK_THEMES = ["Construyes la base", "Subes el volumen", "Semana de más exigencia", "Descarga: recuperas para progresar"];

const round = (value: number) => Math.round(value);

function itemFor(exercise: ExerciseId, goal: FitnessGoal, level: Level, week: number): PlanItem {
  const style = GOAL_STYLE[goal];
  const position = (week - 1) % 4;
  const block = Math.floor((week - 1) / 4);
  const deload = position === 3;
  const sets = Math.max(2, LEVEL_SETS[level] - (deload ? 1 : 0));

  if (exercise === "plank") {
    const seconds = style.plank + (level === "ADVANCED" ? 15 : level === "INTERMEDIATE" ? 5 : 0) + position * 5 + block * 10;
    const target = deload ? round(seconds * 0.7) : seconds;
    return {
      exercise,
      sets,
      target: Math.min(target, 150),
      unit: "seconds",
      restSec: style.rest,
      note: "Abdomen y glúteos firmes; cuerpo en línea recta de cabeza a talones.",
    };
  }

  const base = style.reps * LEVEL_REPS[level] * (EXERCISE_FACTOR[exercise] ?? 1);
  const progressed = base + Math.min(position, 2) + block;
  const target = Math.max(5, round(deload ? progressed * 0.7 : progressed));
  const note =
    exercise === "deadlift"
      ? "Con una mochila cargada o una mancuerna. Espalda neutra y cadera atrás."
      : exercise === "push_up" && level === "BEGINNER"
        ? "Si no puedes con el cuerpo completo, apoya las rodillas sin perder la línea."
        : style.tip;
  return { exercise, sets, target, unit: "reps", restSec: style.rest, note };
}

function minutesFor(items: PlanItem[]): number {
  const seconds = items.reduce((acc, item) => {
    const work = item.unit === "seconds" ? item.target : item.target * 3.5;
    return acc + item.sets * (work + item.restSec);
  }, 0);
  return Math.round(seconds / 60) + 6;
}

/** Rutina de la semana `week` (1 es la primera) para la persona y su nivel. */
export function buildWeekPlan(profile: BodyProfile, level: Level, week: number): WeekPlan {
  const position = (week - 1) % 4;
  const days = TRAIN_DAYS[profile.daysPerWeek];
  const order = SESSION_ORDER[profile.daysPerWeek];

  const plan: DayPlan[] = DAY_NAMES.map((name, index) => {
    const slot = days.indexOf(index);
    if (slot === -1) {
      return {
        index,
        name,
        kind: "rest",
        title: "Descanso activo",
        focus: "Camina 20 a 30 minutos y haz algo de movilidad. El músculo crece y la técnica se asienta mientras descansas.",
        items: [],
        minutes: 0,
      };
    }
    const session = SESSIONS[order[slot]];
    const items = session.exercises.map((exercise) => itemFor(exercise, profile.goal, level, week));
    return { index, name, kind: "train", title: session.title, focus: session.focus, items, minutes: minutesFor(items) };
  });

  return { week, deload: position === 3, theme: BLOCK_THEMES[position], days: plan };
}

/** Índice de hoy con lunes = 0. */
export function todayIndex(now = new Date()): number {
  return (now.getDay() + 6) % 7;
}

/** Peso que debería marcar la báscula al final de la semana `week` si sigues el plan. */
export function expectedWeightKg(profile: BodyProfile, week: number): number {
  const change = nutritionTargets(profile).weeklyChangeKg;
  const reached = Math.min(week, profile.weeks);
  const value = profile.weightKg + change * reached;
  if (profile.targetWeightKg === null) return Math.round(value * 10) / 10;
  const low = Math.min(profile.weightKg, profile.targetWeightKg);
  const high = Math.max(profile.weightKg, profile.targetWeightKg);
  return Math.round(Math.min(high, Math.max(low, value)) * 10) / 10;
}
