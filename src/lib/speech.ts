import { Queue } from "../structures";

const MAX_PENDING = 3;
const REPEAT_WINDOW_MS = 4500;

export interface SpeechSynthesisLike {
  speak(utterance: SpeechSynthesisUtteranceLike): void;
  cancel(): void;
}

export interface SpeechSynthesisUtteranceLike {
  text: string;
  lang: string;
  rate: number;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export type UtteranceFactory = (text: string) => SpeechSynthesisUtteranceLike;

/**
 * Cola de voz: reproduce las correcciones una detrás de otra para que nunca
 * se solapen. Descarta mensajes repetidos en una ventana corta y limita la
 * cola para no hablar con retraso.
 */
export class VoiceCoach {
  private readonly queue = new Queue<{ text: string; force: boolean }>();
  private speaking = false;
  private lastText = "";
  private lastAt = Number.NEGATIVE_INFINITY;
  enabled = true;

  constructor(
    private readonly synth: SpeechSynthesisLike | null,
    private readonly createUtterance: UtteranceFactory,
    private readonly now: () => number = Date.now,
  ) {}

  say(text: string, force = false): boolean {
    const message = text.trim();
    if (!this.enabled || !this.synth || !message) return false;
    const now = this.now();
    if (!force && (message === this.lastText || now - this.lastAt < REPEAT_WINDOW_MS)) {
      return false;
    }
    if (this.queue.size >= MAX_PENDING) this.queue.dequeue();
    this.queue.enqueue({ text: message, force });
    this.lastText = message;
    this.lastAt = now;
    if (!this.speaking) this.drain();
    return true;
  }

  /** Detiene la voz y vacía la cola. */
  cancel(): void {
    this.queue.clear();
    this.speaking = false;
    this.lastText = "";
    this.lastAt = Number.NEGATIVE_INFINITY;
    this.synth?.cancel();
  }

  private drain(): void {
    const next = this.queue.dequeue();
    if (!next || !this.synth) {
      this.speaking = false;
      return;
    }
    this.speaking = true;
    const utterance = this.createUtterance(next.text);
    const done = () => {
      this.speaking = false;
      this.drain();
    };
    utterance.onend = done;
    utterance.onerror = done;
    this.synth.speak(utterance);
  }
}

/** Crea un VoiceCoach enlazado al navegador, o uno inerte si no hay soporte. */
export function createBrowserVoice(): VoiceCoach {
  const hasSpeech = typeof window !== "undefined" && "speechSynthesis" in window;
  return new VoiceCoach(
    hasSpeech ? (window.speechSynthesis as unknown as SpeechSynthesisLike) : null,
    (text) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      utterance.rate = 0.95;
      return utterance as unknown as SpeechSynthesisUtteranceLike;
    },
  );
}
