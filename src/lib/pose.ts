import type { ExerciseId, Point } from "../types";
import { CircularBuffer } from "../structures";

/** Índices de landmarks de MediaPipe Pose que usa la app. */
export const POSE = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

/** Pares de landmarks que se dibujan como esqueleto. */
export const SKELETON_EDGES: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

/** Doce landmarks que se envían al backend (máximo tres veces por segundo). */
export const TRACKED_JOINTS = [
  [11, "left_shoulder"],
  [12, "right_shoulder"],
  [13, "left_elbow"],
  [14, "right_elbow"],
  [15, "left_wrist"],
  [16, "right_wrist"],
  [23, "left_hip"],
  [24, "right_hip"],
  [25, "left_knee"],
  [26, "right_knee"],
  [27, "left_ankle"],
  [28, "right_ankle"],
] as const;

export type RepPhase = "ready" | "up" | "down" | "bottom";

export interface PoseMetrics {
  score: number;
  knee: number | null;
  movementAngle: number | null;
  alignment: number | null;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Ángulo en grados en el vértice `b` formado por a-b-c. Null si es degenerado. */
export function angle(a: Point, b: Point, c: Point): number | null {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const size = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (!size) return null;
  const cos = clamp((ab.x * cb.x + ab.y * cb.y) / size, -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

const average = (values: number[]): number | null =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

/** Calcula métricas de postura a partir de los 33 landmarks de MediaPipe. */
export function analyzePose(points: Point[], exercise: ExerciseId): PoseMetrics | null {
  const visible = (...indices: number[]) =>
    indices.every((index) => points[index] && (points[index].visibility ?? 1) > 0.55);
  const p = points;

  const knee = average(
    [
      visible(23, 25, 27) ? angle(p[23], p[25], p[27]) : null,
      visible(24, 26, 28) ? angle(p[24], p[26], p[28]) : null,
    ].filter((n): n is number => n !== null),
  );
  const elbow = average(
    [
      visible(11, 13, 15) ? angle(p[11], p[13], p[15]) : null,
      visible(12, 14, 16) ? angle(p[12], p[14], p[16]) : null,
    ].filter((n): n is number => n !== null),
  );
  const hip = average(
    [
      visible(11, 23, 25) ? angle(p[11], p[23], p[25]) : null,
      visible(12, 24, 26) ? angle(p[12], p[24], p[26]) : null,
    ].filter((n): n is number => n !== null),
  );

  const shoulderY = visible(11, 12) ? (p[11].y + p[12].y) / 2 : null;
  const hipY = visible(23, 24) ? (p[23].y + p[24].y) / 2 : null;
  const ankleY = visible(27, 28) ? (p[27].y + p[28].y) / 2 : null;
  const alignment =
    shoulderY !== null && hipY !== null && ankleY !== null
      ? Math.abs(hipY - (shoulderY + ankleY) / 2)
      : null;

  const movementAngle =
    exercise === "push_up" ? elbow : exercise === "deadlift" ? hip : knee;

  let score = movementAngle === null ? 0 : 82;
  if ((exercise === "squat" || exercise === "lunge") && knee !== null)
    score = clamp(100 - Math.abs(knee - 95) * 0.45, 45, 98);
  if (exercise === "push_up" && elbow !== null && alignment !== null)
    score = clamp(100 - Math.abs(elbow - 90) * 0.18 - alignment * 180, 35, 98);
  if (exercise === "plank" && alignment !== null)
    score = clamp(100 - alignment * 260, 35, 98);
  if (exercise === "deadlift" && hip !== null)
    score = clamp(100 - Math.abs(hip - 125) * 0.3, 45, 98);

  const hasPose = movementAngle !== null || (exercise === "plank" && alignment !== null);
  if (!hasPose) return null;
  return {
    score: Math.round(score),
    knee: knee === null ? null : Math.round(knee),
    movementAngle: movementAngle === null ? null : Math.round(movementAngle),
    alignment,
  };
}

/** Frase de corrección local (modo offline). */
export function coachingCue(exercise: ExerciseId, data: PoseMetrics | null): string {
  if (!data) return "Aléjate un poco y coloca hombros, cadera y pies dentro del encuadre.";
  if (exercise === "squat" || exercise === "lunge")
    return (data.knee ?? 180) > 125
      ? "Desciende con control; flexiona las rodillas."
      : (data.knee ?? 0) < 55
        ? "Reduce un poco la profundidad y mantén el control."
        : "Buena posición. Empuja el suelo para subir.";
  if (exercise === "push_up")
    return (data.movementAngle ?? 180) < 75
      ? "Baja hasta donde mantengas el cuerpo alineado."
      : (data.alignment ?? 0) > 0.12
        ? "Aprieta el abdomen y mantén cadera y hombros en línea."
        : "Buen control. Mantén el cuerpo firme al bajar.";
  if (exercise === "plank")
    return (data.alignment ?? 0) > 0.1
      ? "Ajusta la cadera para alinear hombros, cadera y tobillos."
      : "Buena alineación. Respira sin perder la postura.";
  return (data.movementAngle ?? 180) < 90
    ? "Lleva la cadera atrás y conserva la espalda larga."
    : "Buen patrón. Sube extendiendo la cadera con control.";
}

/** Umbrales de ángulo por ejercicio para la máquina de estados de repeticiones. */
const THRESHOLDS: Record<ExerciseId, { up: number; down: number; bottom: number; done: number }> = {
  squat: { up: 150, down: 125, bottom: 105, done: 145 },
  lunge: { up: 150, down: 125, bottom: 105, done: 145 },
  push_up: { up: 150, down: 120, bottom: 90, done: 145 },
  deadlift: { up: 155, down: 140, bottom: 115, done: 155 },
  plank: { up: 0, down: 0, bottom: 0, done: 0 },
};

/**
 * Avanza la fase de repetición con el ángulo suavizado. Devuelve la nueva
 * fase y si la repetición acaba de completarse.
 */
export function advanceRepPhase(
  phase: RepPhase,
  smoothedAngle: number,
  exercise: ExerciseId,
): { phase: RepPhase; completed: boolean } {
  if (exercise === "plank") return { phase, completed: false };
  const t = THRESHOLDS[exercise];
  let next = phase;
  if (smoothedAngle > t.up && next === "ready") next = "up";
  if (smoothedAngle < t.down && next === "up") next = "down";
  if (smoothedAngle < t.bottom && next === "down") next = "bottom";
  if (smoothedAngle > t.done && next === "bottom") return { phase: "up", completed: true };
  return { phase: next, completed: false };
}

/**
 * Suaviza el ángulo con una ventana móvil (CircularBuffer) para que el
 * conteo no reaccione a ruido de un solo frame.
 */
export class AngleSmoother {
  private readonly window = new CircularBuffer<number>(5);

  push(value: number): number {
    this.window.push(value);
    return this.window.mean() ?? value;
  }

  reset(): void {
    this.window.clear();
  }
}
