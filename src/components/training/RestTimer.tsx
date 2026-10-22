import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { Button } from "../ui";
import { formatDuration } from "../../lib/format";

/** Temporizador de descanso entre series. Se reinicia al cambiar la duración. */
export function RestTimer({ seconds = 60 }: { seconds?: number }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    const id = window.setTimeout(() => setRemaining((value) => (value === null ? null : value - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [remaining]);

  const running = remaining !== null && remaining > 0;
  const done = remaining === 0;

  return (
    <div className="row" style={{ justifyContent: "space-between" }}>
      <div className="row" aria-live="polite">
        <Timer size={18} aria-hidden="true" />
        <span className="tabular" style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>
          {running ? formatDuration(remaining ?? 0) : done ? "¡Listo!" : formatDuration(seconds)}
        </span>
        <span className="muted" style={{ fontSize: 13 }}>
          descanso
        </span>
      </div>
      {running ? (
        <Button variant="ghost" onClick={() => setRemaining(null)}>
          Saltar
        </Button>
      ) : (
        <Button variant="ghost" onClick={() => setRemaining(seconds)}>
          Iniciar
        </Button>
      )}
    </div>
  );
}
