import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface TypedTextProps {
  text: string;
  /** Se llama en cada paso para que el contenedor siga la última línea. */
  onProgress?: () => void;
  onDone?: () => void;
}

const WORD_DELAY_MS = 22;

/** Revela la respuesta palabra por palabra, como si se estuviera escribiendo. */
export function TypedText({ text, onProgress, onDone }: TypedTextProps) {
  const reduced = useReducedMotion();
  const words = useRef(text.split(/(\s+)/));
  const [count, setCount] = useState(reduced ? words.current.length : 0);
  const callbacks = useRef({ onProgress, onDone });
  callbacks.current = { onProgress, onDone };

  useEffect(() => {
    const total = words.current.length;
    if (reduced) {
      callbacks.current.onDone?.();
      return;
    }
    const timer = window.setInterval(() => {
      setCount((current) => {
        const next = Math.min(total, current + 2);
        if (next >= total) {
          window.clearInterval(timer);
          callbacks.current.onDone?.();
        }
        return next;
      });
      callbacks.current.onProgress?.();
    }, WORD_DELAY_MS);
    return () => window.clearInterval(timer);
  }, [reduced]);

  const finished = count >= words.current.length;
  return (
    <>
      <span aria-hidden={!finished}>{words.current.slice(0, count).join("")}</span>
      {!finished && <span className="bubble__caret" aria-hidden="true" />}
      {!finished && <span className="sr-only">{text}</span>}
    </>
  );
}
