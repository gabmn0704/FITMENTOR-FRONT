import type { ExerciseId } from "../types";
import type { CatalogId } from "./catalog";
import { isCatalogId } from "./catalog";
import { isExerciseId } from "./exercises";

/**
 * Ejercicio elegido en el plan para entrenar con la cámara. Viaja por sessionStorage de la rutina a la pantalla
 * de entrenar, que lo toma una sola vez: `engine` es el ejercicio que mide la cámara y `variant` el del plan.
 */
const KEY = "fitmentor.pendingExercise";

export interface PendingExercise {
  engine: ExerciseId;
  variant: CatalogId;
}

export function setPendingExercise(pending: PendingExercise): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    /* sin almacenamiento: se entrena el ejercicio por defecto */
  }
}

export function takePendingExercise(): PendingExercise | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingExercise>;
    if (typeof parsed.engine === "string" && isExerciseId(parsed.engine) && typeof parsed.variant === "string" && isCatalogId(parsed.variant)) {
      return { engine: parsed.engine, variant: parsed.variant };
    }
  } catch {
    /* valor corrupto: se ignora */
  }
  return null;
}
