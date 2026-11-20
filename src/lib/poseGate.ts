import type { ExerciseId, Point } from "../types";

/**
 * Validación de encuadre y postura inicial: se ejecuta ANTES de contar o corregir.
 * Todo es local y síncrono (sin backend), pensado para correr en cada frame.
 */

export type StartPosture = "standing" | "floor";

/** Postura inicial esperada de cada ejercicio: de pie, o en el suelo en posición de plancha. */
export const START_POSTURE: Record<ExerciseId, StartPosture> = {
  squat: "standing",
  lunge: "standing",
  deadlift: "standing",
  push_up: "floor",
  plank: "floor",
};

const EXERCISE_NAME: Record<ExerciseId, string> = {
  squat: "la sentadilla",
  lunge: "la zancada",
  deadlift: "el peso muerto",
  push_up: "la flexión",
  plank: "la plancha",
};

export type FramingCode =
  | "ok"
  | "no_person"
  | "too_close"
  | "too_far"
  | "partial"
  | "low_confidence"
  | "back_turned"
  | "seated"
  | "lying"
  | "not_on_floor";

export interface FramingResult {
  code: FramingCode;
  ok: boolean;
  message: string;
}

const SHOULDERS = [11, 12] as const;
const HIPS = [23, 24] as const;
/** Cadena completa de cada lado: hombro, cadera, rodilla, tobillo. */
const SIDES = [
  [11, 23, 25, 27],
  [12, 24, 26, 28],
] as const;
const KEY = [11, 12, 23, 24, 25, 26, 27, 28] as const;

const VISIBLE = 0.5;
const WEAK = 0.25;
/** Margen fuera del cuadro a partir del cual un punto clave cuenta como cortado. */
const FRAME_MARGIN = 0.03;

const vis = (p: Point | undefined): number => (p ? (p.visibility ?? 1) : 0);
const isSeen = (p: Point | undefined) => vis(p) > VISIBLE;

const MESSAGES: Record<Exclude<FramingCode, "ok" | "seated" | "lying">, string> = {
  no_person: "No te veo: colócate frente a la cámara con el cuerpo completo.",
  too_close: "Estás muy cerca: aléjate un paso para que entres completo.",
  too_far: "Estás muy lejos: acércate un poco a la cámara.",
  partial: "No te veo completo: aléjate y deja que entren cabeza y pies.",
  low_confidence: "Veo poco: mejora la luz o limpia la lente de la cámara.",
  back_turned: "Parece que estás de espaldas: gírate hacia la cámara.",
  not_on_floor: "Ponte en el suelo en posición de plancha, de perfil a la cámara.",
};

const result = (code: FramingCode, message: string): FramingResult => ({ code, ok: code === "ok", message });

/** Lado con mejor visibilidad de hombro, cadera, rodilla y tobillo. */
function bestSide(p: Point[]): readonly [number, number, number, number] {
  const score = (side: readonly number[]) => side.reduce((sum, i) => sum + vis(p[i]), 0);
  return score(SIDES[0]) >= score(SIDES[1]) ? SIDES[0] : SIDES[1];
}

export interface FramingOptions {
  /**
   * La serie ya arrancó (el contador salió de "ready"). Las comprobaciones de postura inicial
   * (sentado, tumbado, de pie vs. suelo) se omiten: en el fondo de una sentadilla o un peso
   * muerto el cuerpo se parece a "sentado" o "inclinado" y no debe interrumpirse.
   */
  armed?: boolean;
}

/** Evalúa encuadre y postura inicial con los 33 landmarks; devuelve el problema más importante o "ok". */
export function checkFraming(points: Point[], exercise: ExerciseId, options: FramingOptions = {}): FramingResult {
  if (points.length < 29) return result("no_person", MESSAGES.no_person);

  const seenKey = KEY.filter((i) => isSeen(points[i]));
  const hasTorso = SHOULDERS.some((i) => isSeen(points[i])) && HIPS.some((i) => isSeen(points[i]));
  if (seenKey.length < 2 || !hasTorso) {
    // Algo se ve pero no el tronco: si hay puntos débiles es mala imagen, si no, no hay nadie.
    const weak = KEY.filter((i) => vis(points[i]) > WEAK).length;
    return weak >= 2 ? result("low_confidence", MESSAGES.low_confidence) : result("no_person", MESSAGES.no_person);
  }

  // Cuerpo cortado por el borde: demasiado cerca.
  const cut = KEY.some((i) => {
    const p = points[i]!;
    return vis(p) > WEAK && (p.x < -FRAME_MARGIN || p.x > 1 + FRAME_MARGIN || p.y < -FRAME_MARGIN || p.y > 1 + FRAME_MARGIN);
  });
  const xs = seenKey.map((i) => points[i]!.x);
  const ys = seenKey.map((i) => points[i]!.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  if (cut || Math.max(spanX, spanY) > 0.93) return result("too_close", MESSAGES.too_close);

  // Cadena completa de al menos un lado.
  const side = bestSide(points);
  const missing = side.filter((i) => !isSeen(points[i]));
  if (missing.length) {
    const allWeak = missing.every((i) => vis(points[i]) > WEAK);
    return allWeak ? result("low_confidence", MESSAGES.low_confidence) : result("partial", MESSAGES.partial);
  }

  if (Math.max(spanX, spanY) < 0.28) return result("too_far", MESSAGES.too_far);

  const meanVis = side.reduce((sum, i) => sum + vis(points[i]), 0) / side.length;
  if (meanVis < 0.62) return result("low_confidence", MESSAGES.low_confidence);

  // De espaldas: hombros separados de frente/espalda pero ni nariz ni orejas se ven, con la cabeza dentro del cuadro.
  const [ls, rs] = [points[11]!, points[12]!];
  const headSeen = vis(points[0]) > WEAK || vis(points[7]) > WEAK || vis(points[8]) > WEAK;
  if (!headSeen && isSeen(ls) && isSeen(rs) && Math.abs(ls.x - rs.x) > 0.12 && Math.min(ls.y, rs.y) > 0.08) {
    return result("back_turned", MESSAGES.back_turned);
  }

  if (options.armed) return result("ok", "");

  const [s, h, k] = [points[side[0]]!, points[side[1]]!, points[side[2]]!];
  const torso = Math.hypot(s.x - h.x, s.y - h.y);
  if (torso < 0.04) return result("ok", "");
  const leanDeg = (Math.atan2(Math.abs(s.x - h.x), Math.max(h.y - s.y, 1e-6)) * 180) / Math.PI;
  const name = EXERCISE_NAME[exercise];

  if (START_POSTURE[exercise] === "standing") {
    if (leanDeg > 60) return result("lying", `Estás tumbado: ponte de pie para empezar ${name}.`);
    // De pie el muslo mide casi lo mismo que el tronco en vertical; sentado se acorta mucho (de perfil y de frente).
    const thighDrop = (k.y - h.y) / torso;
    if (thighDrop < 0.55) return result("seated", `Estás sentado: ponte de pie para empezar ${name}.`);
  } else if (leanDeg < 40) {
    return result("not_on_floor", MESSAGES.not_on_floor);
  }
  return result("ok", "");
}

/** Resultado de pasar un frame por la puerta de encuadre. */
export interface GateUpdate {
  /** Hay un problema de encuadre/postura confirmado: no se cuenta ni se corrige. */
  blocked: boolean;
  /** Mensaje a mostrar (cadena vacía si todo está bien). */
  message: string;
  /** El mensaje confirmado cambió en este frame (para actualizar la UI solo entonces). */
  changed: boolean;
  /** Texto a decir ahora en voz alta, o null. */
  speak: string | null;
}

/**
 * Estabiliza el resultado frame a frame: un problema solo se confirma si dura `stableMs`
 * (y se quita tras `clearMs`), y la voz lo repite como mucho cada `cooldownMs` por tipo y
 * `gapMs` entre avisos distintos. Así no hay parpadeo ni spam.
 */
export class FramingGate {
  private shown: FramingResult = result("ok", "");
  private candidate: FramingCode = "ok";
  private candidateResult: FramingResult = result("ok", "");
  private since = 0;
  private lastSpokenAt = Number.NEGATIVE_INFINITY;
  private readonly spokenAt = new Map<FramingCode, number>();

  constructor(
    private readonly stableMs = 350,
    private readonly clearMs = 200,
    private readonly cooldownMs = 10_000,
    private readonly gapMs = 3_000,
  ) {}

  update(current: FramingResult, nowMs: number): GateUpdate {
    if (current.code !== this.candidate) {
      this.candidate = current.code;
      this.candidateResult = current;
      this.since = nowMs;
    } else {
      this.candidateResult = current;
    }
    let changed = false;
    const needed = this.candidate === "ok" ? this.clearMs : this.stableMs;
    if (this.candidate !== this.shown.code && nowMs - this.since >= needed) {
      this.shown = this.candidateResult;
      changed = true;
    }
    let speak: string | null = null;
    if (!this.shown.ok) {
      const last = this.spokenAt.get(this.shown.code) ?? Number.NEGATIVE_INFINITY;
      if (nowMs - this.lastSpokenAt >= this.gapMs && nowMs - last >= this.cooldownMs) {
        speak = this.shown.message;
        this.lastSpokenAt = nowMs;
        this.spokenAt.set(this.shown.code, nowMs);
      }
    }
    return { blocked: !this.shown.ok, message: this.shown.message, changed, speak };
  }

  /** Marca que se habló otra cosa (conteo) para respetar el hueco mínimo. */
  noteSpoken(nowMs: number): void {
    this.lastSpokenAt = nowMs;
  }

  reset(): void {
    this.shown = result("ok", "");
    this.candidate = "ok";
    this.candidateResult = this.shown;
    this.since = 0;
    this.lastSpokenAt = Number.NEGATIVE_INFINITY;
    this.spokenAt.clear();
  }
}
