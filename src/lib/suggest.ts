import { MinHeap } from "../structures";
import { EXERCISE_LIST } from "./exercises";
import type { ExerciseId, ExerciseStat } from "../types";

export interface Suggestion {
  exercise: ExerciseId;
  reason: string;
}

interface Candidate {
  exercise: ExerciseId;
  accuracy: number;
  reps: number;
}

/**
 * Sugiere el siguiente ejercicio con una cola de prioridad: primero el que
 * tiene menor precisión reciente y, a igualdad, el que menos repeticiones
 * acumula. Los ejercicios nunca practicados salen antes que los demás.
 */
export function suggestNextExercise(stats: ExerciseStat[]): Suggestion {
  const byId = new Map(stats.map((stat) => [stat.exercise, stat]));
  const heap = new MinHeap<Candidate>((a, b) => a.accuracy - b.accuracy || a.reps - b.reps);
  for (const meta of EXERCISE_LIST) {
    const stat = byId.get(meta.id);
    heap.push({ exercise: meta.id, accuracy: stat?.accuracy ?? 0, reps: stat?.reps ?? 0 });
  }
  const top = heap.pop()!;
  const label = EXERCISE_LIST.find((meta) => meta.id === top.exercise)?.label ?? top.exercise;
  const reason =
    top.reps === 0
      ? `Aún no lo has practicado: prueba ${label.toLowerCase()}.`
      : `Tu precisión en ${label.toLowerCase()} es la más baja (${Math.round(top.accuracy)}%).`;
  return { exercise: top.exercise, reason };
}
