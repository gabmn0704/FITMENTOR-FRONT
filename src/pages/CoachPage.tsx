import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button, Notice } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { coachApi } from "../lib/services";
import { LRUCache, normalizeText } from "../structures";
import type { CoachAnswer } from "../types";

interface Message {
  id: number;
  role: "user" | "coach";
  text: string;
  source?: string;
}

const SUGGESTIONS = [
  "¿Cómo mejoro la profundidad de la sentadilla?",
  "¿Qué hago si me duele la rodilla al bajar?",
  "Dame una rutina corta de 15 minutos",
  "¿Cuántas repeticiones debería hacer por semana?",
];

/** Respuestas recientes del coach: evita repetir la misma pregunta al API durante 10 minutos. */
const answerCache = new LRUCache<string, CoachAnswer>(32, 10 * 60 * 1000);

const WELCOME: Message = {
  id: 0,
  role: "coach",
  text: "Soy tu coach de técnica. Pregúntame sobre postura, progresión o cómo recuperarte.",
};

export function CoachPage() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const nextId = useRef(1);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || thinking) return;
    setError("");
    setDraft("");
    setMessages((list) => [...list, { id: nextId.current++, role: "user", text }]);
    setThinking(true);
    try {
      const key = normalizeText(text);
      let answer = answerCache.get(key);
      if (!answer) {
        if (!token) throw new ApiError(401, "Inicia sesión para hablar con el coach.");
        answer = await coachApi.ask(token, text);
        answerCache.set(key, answer);
      }
      setMessages((list) => [...list, { id: nextId.current++, role: "coach", text: answer!.answer, source: answer!.source }]);
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 0
          ? "Sin conexión con el coach. Intenta de nuevo cuando vuelvas a tener red."
          : err instanceof Error && err.message
            ? err.message
            : "No pude responder ahora mismo.";
      setError(message);
    } finally {
      setThinking(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(draft);
  };

  return (
    <div className="stack">
      <header className="page-header">
        <p className="eyebrow">Coach IA</p>
        <h1>Pregunta lo que quieras</h1>
        <p>Respuestas de técnica y progresión. Ante una molestia, consulta a un profesional.</p>
      </header>

      <section className="card stack" style={{ gap: 12 }} aria-label="Conversación con el coach">
        <div className="chat" ref={log} role="log" aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`bubble bubble--${message.role}`}>
              {message.text}
              {message.source && (
                <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                  Fuente: {message.source}
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <div className="bubble bubble--coach bubble--typing" aria-label="El coach está escribiendo">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="suggestions" aria-label="Sugerencias">
          {SUGGESTIONS.map((suggestion) => (
            <button key={suggestion} type="button" className="chip" onClick={() => void ask(suggestion)} disabled={thinking}>
              <Sparkles size={13} aria-hidden="true" /> {suggestion}
            </button>
          ))}
        </div>

        <form className="chat-form" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="coach-input">
            Escribe tu pregunta
          </label>
          <input
            id="coach-input"
            className="input"
            value={draft}
            maxLength={500}
            placeholder="Escribe tu pregunta…"
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" variant="primary" disabled={!draft.trim() || thinking} icon={<Send size={16} />}>
            Enviar
          </Button>
        </form>
      </section>
    </div>
  );
}
