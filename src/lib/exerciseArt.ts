import { CATALOG, type CatalogId, type Muscle } from "./catalog";
import type { ExerciseId } from "../types";

/** Foto de fondo para cada ejercicio de la cámara (selector de Entrenar). */
export const EXERCISE_ART: Record<ExerciseId, string> = {
  squat: "/img/gym.jpg",
  push_up: "/img/ropes.jpg",
  plank: "/img/core.jpg",
  deadlift: "/img/deadlift.jpg",
  lunge: "/img/studio.jpg",
};

const MUSCLE_ART: Record<Muscle, string> = {
  piernas: "/img/gym.jpg",
  glúteos: "/img/studio.jpg",
  pecho: "/img/ropes.jpg",
  hombros: "/img/ropes.jpg",
  tríceps: "/img/ropes.jpg",
  espalda: "/img/deadlift.jpg",
  bíceps: "/img/deadlift.jpg",
  core: "/img/core.jpg",
  cardio: "/img/ropes.jpg",
};

/** Foto para cualquier ejercicio del catálogo: la del ejercicio de cámara si lo hay, si no la del músculo. */
export function catalogArt(id: CatalogId): string {
  const entry = CATALOG[id];
  if (entry.engine && entry.engine === id) return EXERCISE_ART[entry.engine];
  return MUSCLE_ART[entry.muscle];
}
