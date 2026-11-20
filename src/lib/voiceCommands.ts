/** Comandos de voz de entrada (Web Speech API, es-CO): parser tolerante + escucha con reinicio automático. */

export type VoiceCommand =
  | "start"
  | "pause"
  | "resume"
  | "next"
  | "finish"
  | "repeat"
  | "status"
  | "undo"
  | "save"
  | "mute"
  | "unmute";

/** Minúsculas, sin tildes ni signos, espacios simples. */
export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Reglas en orden de prioridad: la más específica primero ("siguiente ejercicio" antes que "sigue"). */
const RULES: Array<[VoiceCommand, RegExp]> = [
  ["next", /\b(siguiente|proximo|otro|cambia|cambiar|cambiemos)( de)? ejercicio\b|\bsiguiente\b|\bproximo\b/],
  ["status", /\bcomo voy\b|\bcomo vamos\b|\bmi progreso\b|\bcuantas (repeticiones|reps|llevo)\b|\bcuanto llevo\b|\bcomo me va\b/],
  ["repeat", /\b(repite|repetir|repitelo|repiteme|otra vez|de nuevo|que dijiste)\b/],
  ["undo", /\b(deshacer|deshaz|borra(r)? (la )?(ultima )?(rep|repeticion)|quita(r)? (una )?(rep|repeticion))\b/],
  ["finish", /\b(terminar|termina|terminemos|finalizar|finaliza|acabar|acaba|ya termine|fin de la sesion)\b/],
  ["save", /\b(guardar|guarda|guardalo)\b/],
  ["resume", /\b(reanudar|reanuda|continuar|continua|seguir|sigue|sigamos|retomar)\b/],
  ["pause", /\b(pausa|pausar|pause|para|parar|alto|espera|detente|detener|descanso|descansar|descansemos)\b/],
  ["start", /\b(iniciar|inicia|inicio|iniciemos|empezar|empieza|empecemos|comenzar|comienza|comencemos|arrancar|arranca|vamos|listo|start|dale)\b/],
  ["mute", /\b(silencio|silenciar|callate|cayate|sin voz|mutear)\b/],
  ["unmute", /\b(activa(r)? (la )?voz|habla|hablar|con voz)\b/],
];

/** Interpreta lo que dijo el usuario. Null si no es un comando (ruido, conversación ajena). */
export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const text = normalizeTranscript(transcript);
  if (!text || text.length > 60) return null; // frases largas no son comandos
  for (const [command, pattern] of RULES) {
    if (pattern.test(text)) return command;
  }
  return null;
}

/* ---------- Escucha con SpeechRecognition ---------- */

interface RecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string; confidence: number };
}
interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<RecognitionResultLike>;
}
export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: RecognitionEventLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type RecognitionCtor = new () => RecognitionLike;

/** Constructor de SpeechRecognition del navegador (Chrome/Edge: webkit), o null si no hay soporte. */
export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type ListenState = "off" | "starting" | "listening" | "blocked" | "unsupported";

export interface CommandListenerOptions {
  onCommand: (command: VoiceCommand, heard: string) => void;
  onState: (state: ListenState) => void;
  /** Si devuelve true se ignora lo oído (p. ej. mientras el entrenador habla, para no oírse a sí mismo). */
  shouldIgnore?: () => boolean;
  lang?: string;
  ctor?: RecognitionCtor | null;
  now?: () => number;
}

const RESTART_DELAY_MS = 250;
const MAX_RESTART_DELAY_MS = 5000;
/** Mismo comando repetido dentro de esta ventana se toma como eco de un resultado parcial + final. */
const DEDUPE_MS = 1500;

/**
 * Escucha continua de comandos. Se reinicia sola cuando el navegador corta la sesión
 * (ocurre cada ~60 s o tras silencio), reacciona a resultados parciales para bajar latencia
 * y se rinde con elegancia si el permiso del micrófono está denegado.
 */
export class CommandListener {
  private recognition: RecognitionLike | null = null;
  private wanted = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;
  private lastCommand: VoiceCommand | null = null;
  private lastCommandAt = Number.NEGATIVE_INFINITY;
  private handledIndexes = new Set<number>();
  private readonly ctor: RecognitionCtor | null;
  private readonly now: () => number;

  constructor(private readonly options: CommandListenerOptions) {
    this.ctor = options.ctor === undefined ? getRecognitionCtor() : options.ctor;
    this.now = options.now ?? Date.now;
  }

  get supported(): boolean {
    return this.ctor !== null;
  }

  start(): void {
    if (!this.ctor) {
      this.options.onState("unsupported");
      return;
    }
    this.wanted = true;
    this.failures = 0;
    this.open();
  }

  stop(): void {
    this.wanted = false;
    if (this.restartTimer !== null) clearTimeout(this.restartTimer);
    this.restartTimer = null;
    const rec = this.recognition;
    this.recognition = null;
    if (rec) {
      rec.onend = rec.onerror = rec.onresult = rec.onstart = null;
      try {
        rec.abort();
      } catch {
        /* ya detenido */
      }
    }
    this.options.onState(this.ctor ? "off" : "unsupported");
  }

  private scheduleOpen(delay: number): void {
    if (this.restartTimer !== null) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      this.open();
    }, delay);
  }

  private open(): void {
    if (!this.ctor || !this.wanted || this.recognition) return;
    const rec = new this.ctor();
    rec.lang = this.options.lang ?? "es-CO";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    this.handledIndexes = new Set();
    this.options.onState("starting");
    rec.onstart = () => {
      this.failures = 0;
      this.options.onState("listening");
    };
    rec.onresult = (event) => this.handleResult(event);
    rec.onerror = (event) => {
      const code = event.error ?? "";
      if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
        this.wanted = false; // sin permiso o sin micrófono: no insistimos
        this.options.onState("blocked");
        return;
      }
      // no-speech, aborted, network...: onend vendrá después y reiniciamos con espera creciente.
      if (code !== "no-speech" && code !== "aborted") this.failures++;
    };
    rec.onend = () => {
      this.recognition = null;
      if (!this.wanted) return;
      this.options.onState("starting");
      this.scheduleOpen(Math.min(MAX_RESTART_DELAY_MS, RESTART_DELAY_MS * 2 ** Math.min(4, this.failures)));
    };
    this.recognition = rec;
    try {
      rec.start();
    } catch {
      this.recognition = null;
      this.failures++;
      this.scheduleOpen(RESTART_DELAY_MS * 4);
    }
  }

  private handleResult(event: RecognitionEventLike): void {
    if (this.options.shouldIgnore?.()) return;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]!;
      if (this.handledIndexes.has(i)) continue;
      // Prueba todas las alternativas: la 2ª o 3ª suele traer el comando bien reconocido.
      for (let a = 0; a < result.length; a++) {
        const heard = result[a]!.transcript;
        const command = parseVoiceCommand(heard);
        if (!command) continue;
        this.handledIndexes.add(i);
        const t = this.now();
        if (command === this.lastCommand && t - this.lastCommandAt < DEDUPE_MS) return;
        this.lastCommand = command;
        this.lastCommandAt = t;
        this.options.onCommand(command, heard);
        return;
      }
    }
  }
}
