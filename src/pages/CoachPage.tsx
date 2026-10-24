import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button, Notice } from "../components/ui";
import { TypedText } from "../components/motion/TypedText";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { coachApi } from "../lib/services";
import { localCoachAnswer } from "../lib/coachLocal";
import { coachSourceLabel, LIMITS, toCoachSource } from "../lib/contract";
import { useProfile } from "../hooks/useProfile";
import { coachProfilePayload, coachSuggestions, coachWelcome } from "../lib/coachProfile";

interface Message {
  id: number;
  role: "user" | "coach";
  text: string;
  source?: string;
  /** Respuesta nueva del coach: se escribe palabra por palabra una sola vez. */
  typing?: boolean;
}

const OFFLINE_LABEL = "Guía local · sin conexión con el coach";


export function CoachPage() {
  const { token, user } = useAuth();
  const { profile } = useProfile();
  const suggestions = coachSuggestions(profile?.goal);
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 0, role: "coach", text: coachWelcome(user?.name, profile?.goal) },
  ]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const nextId = useRef(1);
  const log = useRef<HTMLDivElement>(null);

  const stickToEnd = useCallback((smooth = true) => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    stickToEnd();
  }, [messages, thinking, stickToEnd]);

  const finishTyping = useCallback((id: number) => {
    setMessages((list) => list.map((message) => (message.id === id ? { ...message, typing: false } : message)));
  }, []);

  const ask = async (question: string) => {
    const text = question.trim().slice(0, LIMITS.coachQuestion);
    if (!text || thinking) return;
    setError("");
    setDraft("");
    setMessages((list) => [...list, { id: nextId.current++, role: "user", text }]);
    setThinking(true);
    try {
      if (!token) throw new ApiError(401, "Inicia sesión para hablar con el coach.");
      // El hilo (sin el saludo ni los avisos locales) viaja con la pregunta para que la respuesta siga la conversación.
      const history = messages
        .filter((message) => message.id !== 0 && message.source !== "offline")
        .map((message) => ({ role: message.role, text: message.text }));
      const raw = await coachApi.ask(token, text, { profile: profile ? coachProfilePayload(profile) : undefined, history });
      if (!raw || typeof raw.answer !== "string" || !raw.answer.trim()) {
        throw new Error("El coach no devolvió una respuesta válida.");
      }
      setMessages((list) => [
        ...list,
        { id: nextId.current++, role: "coach", text: raw.answer, source: toCoachSource(raw.source), typing: true },
      ]);
    } catch (err) {
      // Sin red, servidor caído o sin la IA: el chat sigue respondiendo con la guía local.
      const unreachable = err instanceof ApiError && (err.status === 0 || err.status === 404 || err.status >= 500);
      if (unreachable) {
        setMessages((list) => [
          ...list,
          { id: nextId.current++, role: "coach", text: localCoachAnswer(text, profile ? coachProfilePayload(profile) : undefined), source: "offline", typing: true },
        ]);
        return;
      }
      const message =
        err instanceof ApiError && err.status === 0
          ? "Sin conexión con el coach. Intenta de nuevo cuando vuelvas a tener red."
          : err instanceof Error && err.message
            ? err.message
            : "No pude responder ahora mismo.";
      setError(message);
      // La pregunta no se perdió: vuelve al campo para reintentar.
      setDraft((current) => current || text);
    } finally {
      setThinking(false);
    }
  };

  const remaining = LIMITS.coachQuestion - draft.length;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(draft);
  };

  return (
    <div className="stack">
      <header className="page-header" data-banner="gym">
        <h1>Pregunta lo que quieras</h1>
        <p>Técnica, rutinas y alimentación según tu objetivo. Ante una molestia, consulta a un profesional.</p>
      </header>

      <section className="card stack" style={{ gap: 12 }} aria-label="Conversación con el coach">
        <div className="chat" ref={log} role="log" aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`bubble bubble--${message.role}`}>
              {message.typing ? (
                <TypedText text={message.text} onProgress={() => stickToEnd(false)} onDone={() => finishTyping(message.id)} />
              ) : (
                message.text
              )}
              {!message.typing && (message.source === "offline" || coachSourceLabel(message.source)) && (
                <div className="bubble__source">
                  {message.source === "offline" ? OFFLINE_LABEL : coachSourceLabel(message.source)}
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
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              className="chip"
              style={{ "--i": index } as CSSProperties}
              onClick={() => void ask(suggestion)} disabled={thinking}>
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
            maxLength={LIMITS.coachQuestion}
            placeholder="Escribe tu pregunta…"
            aria-describedby="coach-count"
            onChange={(event) => setDraft(event.target.value)}
          />
          <span
            id="coach-count"
            className={`chat-form__count tabular${remaining <= 50 ? " chat-form__count--warn" : ""}`}
            aria-live={remaining <= 50 ? "polite" : "off"}
          >
            {remaining <= 100 ? `${remaining} caracteres disponibles` : `${draft.length}/${LIMITS.coachQuestion}`}
          </span>
          <Button type="submit" variant="primary" disabled={!draft.trim() || thinking} icon={<Send size={16} />}>
            Enviar
          </Button>
        </form>
      </section>
    </div>
  );
}
