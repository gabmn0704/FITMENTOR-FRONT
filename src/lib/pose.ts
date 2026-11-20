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
  /** Desvío vertical de la cadera respecto a la línea hombro-tobillo, en fracción del alto (valor absoluto). */
  alignment: number | null;
  /** Igual que `alignment` pero con signo: positivo = cadera caída, negativo = cadera alta. */
  hipOffset?: number | null;
  /** Inclinación del torso respecto a la vertical, en grados (0 = erguido). */
  torsoLean?: number | null;
  /** Correcciones detectadas, de la más importante a la menos. Vacío si la técnica es buena. */
  issues?: string[];
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

const VISIBLE = 0.55;

const seen = (...points: Array<Point | undefined>): boolean =>
  points.every((point) => point !== undefined && (point.visibility ?? 1) > VISIBLE);

interface BodySide {
  shoulder: Point;
  elbow: Point;
  wrist: Point;
  hip: Point;
  knee: Point;
  ankle: Point;
  toe: Point | undefined;
  /** Visibilidad media de hombro, cadera, rodilla y tobillo: decide qué lado mide mejor. */
  visibility: number;
}

function bodySides(p: Point[]): BodySide[] {
  const make = (s: number, e: number, w: number, h: number, k: number, a: number, toe: number): BodySide => ({
    shoulder: p[s],
    elbow: p[e],
    wrist: p[w],
    hip: p[h],
    knee: p[k],
    ankle: p[a],
    toe: p[toe],
    visibility: [s, h, k, a].reduce((sum, index) => sum + (p[index]?.visibility ?? 0), 0) / 4,
  });
  return [make(11, 13, 15, 23, 25, 27, 31), make(12, 14, 16, 24, 26, 28, 32)];
}

/** Inclinación del segmento cadera-hombro respecto a la vertical (0 = erguido, 90 = horizontal). */
function lean(hip: Point, shoulder: Point): number {
  const dx = shoulder.x - hip.x;
  const dy = hip.y - shoulder.y;
  return (Math.atan2(Math.abs(dx), Math.max(dy, 1e-6)) * 180) / Math.PI;
}

/**
 * Desvío vertical de la cadera respecto a la línea hombro-tobillo, con signo (positivo = cadera caída en la
 * imagen). Solo es fiable de perfil: si el cuerpo no está horizontal en la imagen devuelve null.
 */
function hipOffsetFrom(side: BodySide): number | null {
  const span = side.ankle.x - side.shoulder.x;
  if (Math.abs(span) < 0.25) return null;
  const onLine = side.shoulder.y + ((side.ankle.y - side.shoulder.y) * (side.hip.x - side.shoulder.x)) / span;
  return side.hip.y - onLine;
}

/** Calcula métricas y correcciones de postura a partir de los 33 landmarks de MediaPipe, midiendo el lado mejor visto. */
export function analyzePose(points: Point[], exercise: ExerciseId): PoseMetrics | null {
  const sides = bodySides(points);
  const full = sides.filter((side) => seen(side.shoulder, side.hip, side.knee, side.ankle));
  const best = [...sides].sort((a, b) => b.visibility - a.visibility)[0];
  const side = full.length ? full.sort((a, b) => b.visibility - a.visibility)[0] : best;

  const kneeOf = (s: BodySide) => (seen(s.hip, s.knee, s.ankle) ? angle(s.hip, s.knee, s.ankle) : null);
  const kneeAngles = sides.map(kneeOf).filter((value): value is number => value !== null);
  const knee = kneeAngles.length ? (exercise === "lunge" ? Math.min(...kneeAngles) : kneeOf(side) ?? kneeAngles[0]) : null;
  const elbow = seen(side.shoulder, side.elbow, side.wrist) ? angle(side.shoulder, side.elbow, side.wrist) : null;
  const hip = seen(side.shoulder, side.hip, side.knee) ? angle(side.shoulder, side.hip, side.knee) : null;
  const torsoLean = seen(side.shoulder, side.hip) ? lean(side.hip, side.shoulder) : null;
  const hipOffset = seen(side.shoulder, side.hip, side.ankle) ? hipOffsetFrom(side) : null;
  const alignment = hipOffset === null ? null : Math.abs(hipOffset);

  const movementAngle = exercise === "push_up" ? elbow : exercise === "deadlift" ? hip : knee;
  const hasPose = movementAngle !== null || (exercise === "plank" && alignment !== null);
  if (!hasPose) return null;

  const issues: string[] = [];
  let score = movementAngle === null ? 0 : 82;

  if ((exercise === "squat" || exercise === "lunge") && knee !== null) {
    score = clamp(100 - Math.abs(knee - 95) * 0.45, 45, 98);
    const limit = exercise === "squat" ? 55 : 28;
    if (torsoLean !== null && torsoLean > limit) {
      score -= Math.min(15, (torsoLean - limit) * 0.4);
      issues.push(exercise === "squat" ? "Pecho arriba, no te inclines tanto." : "Torso erguido al bajar.");
    }
    // Rodilla por delante de la punta del pie: solo se evalúa cuando se ve el pie.
    const toe = side.toe;
    if (toe && seen(side.knee, toe, side.ankle)) {
      const facing = Math.sign(toe.x - side.ankle.x) || 1;
      if ((side.knee.x - toe.x) * facing > 0.02 && knee < 130) {
        score -= 6;
        issues.push("Cadera atrás: las rodillas se pasan de los pies.");
      }
    }
    if (knee > 125) issues.push("Desciende más, flexiona las rodillas.");
    else if (knee < 55) issues.push("Menos profundidad, con control.");
  }

  if (exercise === "push_up" && elbow !== null) {
    score = clamp(100 - Math.abs(elbow - 90) * 0.18 - (alignment ?? 0) * 180, 35, 98);
    if (hipOffset !== null && hipOffset > 0.06) issues.push("Cadera caída: aprieta abdomen y glúteos.");
    if (hipOffset !== null && hipOffset < -0.06) issues.push("Baja la cadera, en línea con hombros y talones.");
    if (elbow < 75) issues.push("Baja solo hasta mantener el cuerpo alineado.");
  }

  if (exercise === "plank" && alignment !== null && hipOffset !== null) {
    score = clamp(100 - alignment * 260, 35, 98);
    if (hipOffset > 0.05) issues.push("Sube la cadera, se está hundiendo.");
    if (hipOffset < -0.05) issues.push("Baja la cadera, en línea con hombros y tobillos.");
  }

  if (exercise === "deadlift" && hip !== null) {
    score = clamp(100 - Math.abs(hip - 125) * 0.3, 45, 98);
    if (knee !== null && knee < 105) {
      score -= 8;
      issues.push("Estás sentándote: menos rodilla, cadera atrás.");
    }
    if (hip < 90) issues.push("Cadera atrás y espalda larga.");
  }

  const front = seen(points[11], points[12]) && Math.abs(points[11].x - points[12].x) > 0.18;
  // De frente los ángulos se aplanan y la medición pierde fiabilidad: es lo primero que se corrige.
  if (front) issues.unshift("Colócate de perfil a la cámara.");

  return {
    score: Math.round(clamp(score, 30, 98)),
    knee: knee === null ? null : Math.round(knee),
    movementAngle: movementAngle === null ? null : Math.round(movementAngle),
    alignment,
    hipOffset,
    torsoLean: torsoLean === null ? null : Math.round(torsoLean),
    issues,
  };
}

/** Frase de corrección local (modo offline): la corrección más importante, o un refuerzo si la técnica es buena. */
export function coachingCue(exercise: ExerciseId, data: PoseMetrics | null): string {
  if (!data) return "Aléjate un poco y coloca hombros, cadera y pies dentro del encuadre.";
  if (data.issues && data.issues.length) return data.issues[0];
  if (exercise === "squat" || exercise === "lunge")
    return (data.knee ?? 180) > 125
      ? "Desciende más, flexiona las rodillas."
      : (data.knee ?? 0) < 55
        ? "Menos profundidad, con control."
        : "Buena posición. Empuja el suelo para subir.";
  if (exercise === "push_up")
    return (data.movementAngle ?? 180) < 75
      ? "Baja solo hasta mantener el cuerpo alineado."
      : (data.alignment ?? 0) > 0.12
        ? "Aprieta el abdomen y mantén cadera y hombros en línea."
        : "Buen control. Mantén el cuerpo firme al bajar.";
  if (exercise === "plank")
    return (data.alignment ?? 0) > 0.1
      ? "Ajusta la cadera para alinear hombros, cadera y tobillos."
      : "Buena alineación. Respira sin perder la postura.";
  return (data.movementAngle ?? 180) < 90
    ? "Cadera atrás y espalda larga."
    : "Buen patrón. Sube extendiendo la cadera con control.";
}

/** Duración mínima de una repetición real: más rápido suele ser ruido de la detección, no un movimiento. */
export const MIN_REP_MS = 500;

/**
 * Umbrales de ángulo por ejercicio. Histéresis: se arma por encima de `up`, baja por `down`,
 * llega a `bottom` y cuenta al volver por encima de `done`. `done` < `up` para contar a tiempo
 * (antes de extender del todo) sin poder contar dos veces: hay que volver a bajar de `down`.
 */
export const THRESHOLDS: Record<ExerciseId, { up: number; down: number; bottom: number; done: number }> = {
  squat: { up: 150, down: 125, bottom: 105, done: 140 },
  lunge: { up: 150, down: 125, bottom: 105, done: 140 },
  push_up: { up: 150, down: 120, bottom: 95, done: 140 },
  deadlift: { up: 155, down: 140, bottom: 118, done: 148 },
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
  // Se arma al estar casi extendido (done), no solo del todo (up): quien arranca con la rodilla en 148° también cuenta.
  if (smoothedAngle > t.done && next === "ready") next = "up";
  if (smoothedAngle < t.down && next === "up") next = "down";
  if (smoothedAngle < t.bottom && next === "down") next = "bottom";
  // Bajada a medias: volvió arriba sin llegar al fondo, no cuenta y se reinicia.
  if (smoothedAngle > t.done && next === "down") return { phase: "up", completed: false };
  if (smoothedAngle > t.done && next === "bottom") return { phase: "up", completed: true };
  return { phase: next, completed: false };
}

export interface RepUpdate {
  phase: RepPhase;
  completed: boolean;
  /** Se completó el ciclo pero fue demasiado rápido para ser real. */
  rejected: boolean;
  /** La fase cambió en esta actualización. */
  changed: boolean;
}

/** Contador de repeticiones por ángulo: fases con histéresis y filtro de duración mínima. */
export class RepCounter {
  phase: RepPhase = "ready";
  private startedAt: number | null = null;

  constructor(private readonly exercise: ExerciseId, private readonly minRepMs: number = MIN_REP_MS) {}

  update(smoothedAngle: number, nowMs: number): RepUpdate {
    const next = advanceRepPhase(this.phase, smoothedAngle, this.exercise);
    const changed = next.phase !== this.phase;
    if (next.phase === "down" && this.phase !== "down") this.startedAt = nowMs;
    if (next.phase === "up" && this.phase === "down") this.startedAt = null;
    this.phase = next.phase;
    let completed = false;
    let rejected = false;
    if (next.completed) {
      const took = this.startedAt === null ? Infinity : nowMs - this.startedAt;
      this.startedAt = null;
      if (took >= this.minRepMs) completed = true;
      else rejected = true;
    }
    return { phase: this.phase, completed, rejected, changed };
  }

  reset(): void {
    this.phase = "ready";
    this.startedAt = null;
  }
}

/**
 * Suaviza el ángulo con una ventana móvil corta (CircularBuffer): quita el ruido de un frame
 * sin añadir más de ~2 frames de retraso.
 */
export class AngleSmoother {
  private readonly window = new CircularBuffer<number>(3);

  push(value: number): number {
    this.window.push(value);
    return this.window.mean() ?? value;
  }

  reset(): void {
    this.window.clear();
  }
}

/**
 * Suavizado adaptativo de landmarks (estilo One Euro simplificado): con poco movimiento filtra
 * el temblor; con movimiento rápido casi no añade retraso.
 */
export class LandmarkSmoother {
  private prev: Point[] | null = null;

  smooth(points: Point[]): Point[] {
    if (!points.length) {
      this.prev = null;
      return points;
    }
    const prev = this.prev;
    if (!prev || prev.length !== points.length) {
      this.prev = points.map((p) => ({ ...p }));
      return points;
    }
    const out = points.map((p, i) => {
      const q = prev[i]!;
      const speed = Math.hypot(p.x - q.x, p.y - q.y);
      const alpha = Math.min(1, 0.35 + speed * 10);
      return {
        ...p,
        x: q.x + (p.x - q.x) * alpha,
        y: q.y + (p.y - q.y) * alpha,
      };
    });
    this.prev = out;
    return out;
  }

  reset(): void {
    this.prev = null;
  }
}
