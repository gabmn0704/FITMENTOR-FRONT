/** Guion hablado del entrenador: números en palabras, ánimo y control de repetición de avisos. */

const UNITS = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez",
  "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis",
  "veintisiete", "veintiocho", "veintinueve", "treinta",
];

/** Número en palabras (hasta 30); más allá se deja en cifras, que el sintetizador lee bien. */
export function spanishNumber(n: number): string {
  return Number.isInteger(n) && n >= 0 && n <= 30 ? UNITS[n]! : String(n);
}

const PRAISE = ["Muy bien", "Así se hace", "Buen ritmo", "Excelente", "Sigue así", "Vas fuerte"];

/** Qué decir al completar una repetición: el número, y la serie completa al llegar a la meta. */
export function repCallout(total: number, target: number, unit: "reps" | "seconds" = "reps"): string {
  if (unit === "reps" && target > 0) {
    if (total === target) return `${spanishNumber(total)}. ¡Serie completa!`;
    if (total === target - 1 && target > 3) return `${spanishNumber(total)}. Una más.`;
  }
  return spanishNumber(total);
}

/** Aviso de descanso al terminar una serie. */
export function restCallout(seconds: number): string {
  return `Descansa ${spanishNumber(seconds)} segundos. Respira profundo.`;
}

/** Ánimo cada cierto número de repeticiones (no en la última, que ya tiene su aviso). */
export function praiseForRep(total: number, target: number, every = 4): string | null {
  if (total <= 0 || total % every !== 0 || total >= target - 1) return null;
  return PRAISE[(total / every) % PRAISE.length]!;
}

/**
 * Puerta de avisos de postura: solo habla una corrección cuando se mantiene un rato
 * (no por un frame ruidoso), no repite la misma antes de un enfriamiento y deja un
 * hueco mínimo entre avisos para no saturar.
 */
export class CueGate {
  private candidate = "";
  private since = 0;
  private lastSpokenAt = Number.NEGATIVE_INFINITY;
  private readonly spokenAt = new Map<string, number>();

  constructor(
    private readonly stableMs = 500,
    private readonly perCueCooldownMs = 9000,
    private readonly globalGapMs = 3500,
  ) {}

  /** Devuelve el texto a decir ahora, o null. `issue` es la corrección actual (null si la técnica es buena). */
  consider(issue: string | null, nowMs: number): string | null {
    if (!issue) {
      this.candidate = "";
      return null;
    }
    if (issue !== this.candidate) {
      this.candidate = issue;
      this.since = nowMs;
      return null;
    }
    if (nowMs - this.since < this.stableMs) return null;
    if (nowMs - this.lastSpokenAt < this.globalGapMs) return null;
    const last = this.spokenAt.get(issue) ?? Number.NEGATIVE_INFINITY;
    if (nowMs - last < this.perCueCooldownMs) return null;
    this.lastSpokenAt = nowMs;
    this.spokenAt.set(issue, nowMs);
    return issue;
  }

  /** Registra que se habló otra cosa (conteo, ánimo): también respeta el hueco mínimo. */
  noteSpoken(nowMs: number): void {
    this.lastSpokenAt = nowMs;
  }

  reset(): void {
    this.candidate = "";
    this.since = 0;
    this.lastSpokenAt = Number.NEGATIVE_INFINITY;
    this.spokenAt.clear();
  }
}

/** Primera frase del mensaje del servidor, recortada: el audio largo llega tarde y se pisa con el conteo. */
export function briefSpoken(message: string, maxChars = 80): string {
  const first = message.trim().split(/(?<=[.!?¡¿])\s+/)[0] ?? "";
  if (first.length <= maxChars) return first;
  const cut = first.slice(0, maxChars);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 20)).trim();
}

/** Resumen hablado para el comando "cómo voy". */
export function statusReport(reps: number, target: number, score: number, seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const time = mins > 0 ? `${mins} minuto${mins === 1 ? "" : "s"} y ${secs} segundos` : `${secs} segundos`;
  const repsText = reps === 1 ? "1 repetición" : `${reps} repeticiones`;
  return `Llevas ${repsText} de ${target}, precisión ${score} por ciento, ${time}.`;
}
