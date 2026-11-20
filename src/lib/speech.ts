const MAX_PENDING = 3;
const REPEAT_WINDOW_MS = 4500;
/** Si el navegador nunca avisa del fin de una frase (bug conocido de Chrome), seguimos igualmente. */
const WATCHDOG_BASE_MS = 4000;
const WATCHDOG_PER_CHAR_MS = 90;

/** Prioridad de un mensaje hablado: el conteo corta lo demás, la postura va antes que el ánimo. */
export const VoicePriority = { chatter: 0, form: 1, count: 2 } as const;
export type VoicePriorityLevel = (typeof VoicePriority)[keyof typeof VoicePriority];

export interface SpeechVoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
}

export interface SpeechSynthesisLike {
  speak(utterance: SpeechSynthesisUtteranceLike): void;
  cancel(): void;
}

export interface SpeechSynthesisUtteranceLike {
  text: string;
  lang: string;
  rate: number;
  volume?: number;
  pitch?: number;
  voice?: SpeechVoiceLike | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export type UtteranceFactory = (text: string) => SpeechSynthesisUtteranceLike;

/** Orden de preferencia de acentos: colombiano primero, luego latino neutro, mexicano, y por último España. */
const LANG_PREFERENCE = ["es-co", "es-419", "es-mx", "es-us", "es-ar", "es-cl", "es-pe", "es-es"];

/** Elige la mejor voz en español disponible (es-CO > es-419 > es-MX > ... > es-ES), prefiriendo voces neuronales. */
export function pickSpanishVoice<T extends SpeechVoiceLike>(voices: readonly T[]): T | null {
  let best: T | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const lang = voice.lang.toLowerCase().replace("_", "-");
    if (!lang.startsWith("es")) continue;
    const rank = LANG_PREFERENCE.indexOf(lang);
    let score = 100 - (rank === -1 ? LANG_PREFERENCE.length : rank) * 10;
    if (/natural|online|neural/i.test(voice.name)) score += 6;
    else if (/google/i.test(voice.name)) score += 4;
    if (voice.localService) score += 1;
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

interface Pending {
  text: string;
  priority: VoicePriorityLevel;
}

/**
 * Cola de voz: reproduce los avisos uno detrás de otro sin solaparse, con prioridades
 * (el conteo de repeticiones corta cualquier aviso menor), descarta repetidos en una
 * ventana corta y limita la cola para no hablar con retraso.
 */
export class VoiceCoach {
  private queue: Pending[] = [];
  private current: Pending | null = null;
  private generation = 0;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private lastText = "";
  private lastAt = Number.NEGATIVE_INFINITY;
  private lastCue = "";
  private spokenEndedAt = Number.NEGATIVE_INFINITY;
  enabled = true;
  /** Se avisa al empezar y terminar de hablar (para el indicador y para que el micrófono no se oiga a sí mismo). */
  onSpeakingChange: ((speaking: boolean) => void) | null = null;

  constructor(
    private readonly synth: SpeechSynthesisLike | null,
    private readonly createUtterance: UtteranceFactory,
    private readonly now: () => number = Date.now,
  ) {}

  get speaking(): boolean {
    return this.current !== null;
  }

  /** Milisegundos desde que dejó de hablar (0 si habla ahora). */
  msSinceSpoke(): number {
    return this.current ? 0 : this.now() - this.spokenEndedAt;
  }

  /**
   * Encola un mensaje. `options` puede ser `true` (forzar, sin filtro de repetidos) o
   * `{ force, priority }`. Devuelve si se aceptó.
   */
  say(text: string, options: boolean | { force?: boolean; priority?: VoicePriorityLevel } = false): boolean {
    const opts = typeof options === "boolean" ? { force: options } : options;
    const message = text.trim();
    if (!this.enabled || !this.synth || !message) return false;
    const force = opts.force ?? false;
    const priority = opts.priority ?? (force ? VoicePriority.form : VoicePriority.chatter);
    const now = this.now();
    if (!force && (message === this.lastText || now - this.lastAt < REPEAT_WINDOW_MS)) {
      return false;
    }
    if (priority >= VoicePriority.count) {
      // El conteo manda: descarta lo menor en cola y corta la frase actual si es menor.
      this.queue = this.queue.filter((item) => item.priority >= VoicePriority.count);
      this.queue.push({ text: message, priority });
      if (this.current && this.current.priority < VoicePriority.count) this.interrupt();
    } else {
      if (this.queue.length >= MAX_PENDING) this.dropWeakest();
      this.queue.push({ text: message, priority });
    }
    if (priority < VoicePriority.count) this.lastCue = message;
    this.lastText = message;
    this.lastAt = now;
    if (!this.current) this.drain();
    return true;
  }

  /** Repite la última corrección o frase hablada (comando "repite"). */
  repeatLast(): boolean {
    return this.lastCue ? this.say(this.lastCue, { force: true, priority: VoicePriority.form }) : false;
  }

  /** Detiene la voz y vacía la cola. */
  cancel(): void {
    this.queue = [];
    this.generation++;
    this.clearWatchdog();
    const wasSpeaking = this.current !== null;
    this.current = null;
    this.lastText = "";
    this.lastAt = Number.NEGATIVE_INFINITY;
    this.synth?.cancel();
    if (wasSpeaking) this.notify(false);
  }

  private dropWeakest(): void {
    let index = 0;
    for (let i = 1; i < this.queue.length; i++) {
      if (this.queue[i]!.priority < this.queue[index]!.priority) index = i;
    }
    this.queue.splice(index, 1);
  }

  private interrupt(): void {
    this.generation++;
    this.clearWatchdog();
    this.current = null;
    this.synth?.cancel();
  }

  private clearWatchdog(): void {
    if (this.watchdog !== null) clearTimeout(this.watchdog);
    this.watchdog = null;
  }

  private notify(speaking: boolean): void {
    this.onSpeakingChange?.(speaking);
  }

  private drain(): void {
    const next = this.queue.shift();
    if (!next || !this.synth) {
      const was = this.current !== null;
      this.current = null;
      this.spokenEndedAt = this.now();
      if (was) this.notify(false);
      return;
    }
    const wasIdle = this.current === null;
    this.current = next;
    const gen = ++this.generation;
    const utterance = this.createUtterance(next.text);
    const done = () => {
      if (gen !== this.generation) return; // callback de una frase ya cortada
      this.clearWatchdog();
      this.current = null;
      this.spokenEndedAt = this.now();
      if (this.queue.length) this.drain();
      else this.notify(false);
    };
    utterance.onend = done;
    utterance.onerror = done;
    this.watchdog = setTimeout(done, WATCHDOG_BASE_MS + next.text.length * WATCHDOG_PER_CHAR_MS);
    if (wasIdle) this.notify(true);
    try {
      this.synth.speak(utterance);
    } catch {
      done();
    }
  }
}

export interface BrowserVoice {
  coach: VoiceCoach;
  setVolume: (value: number) => void;
  getVolume: () => number;
  /** Nombre de la voz elegida (para mostrarla en la interfaz), o null si aún no hay. */
  voiceName: () => string | null;
  dispose: () => void;
}

/** Crea un VoiceCoach enlazado al navegador, o uno inerte si no hay soporte. */
export function createBrowserVoice(initialVolume = 1): BrowserVoice {
  const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  let volume = Math.min(1, Math.max(0, initialVolume));
  let voice: SpeechSynthesisVoice | null = null;
  const refresh = () => {
    voice = synth ? pickSpanishVoice(synth.getVoices()) : null;
  };
  refresh();
  // Las voces se cargan de forma asíncrona en Chrome/Edge.
  synth?.addEventListener?.("voiceschanged", refresh);

  const coach = new VoiceCoach(synth as unknown as SpeechSynthesisLike | null, (text) => {
    if (!voice) refresh();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice?.lang ?? "es-CO";
    if (voice) utterance.voice = voice;
    utterance.rate = 1.02;
    utterance.volume = volume;
    return utterance as unknown as SpeechSynthesisUtteranceLike;
  });
  return {
    coach,
    setVolume: (value) => {
      volume = Math.min(1, Math.max(0, value));
    },
    getVolume: () => volume,
    voiceName: () => voice?.name ?? null,
    dispose: () => synth?.removeEventListener?.("voiceschanged", refresh),
  };
}
