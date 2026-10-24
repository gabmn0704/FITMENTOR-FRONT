import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Trophy } from "lucide-react";
import { Button, ProgressRing } from "../ui";
import { Odometer } from "../motion/Odometer";
import { exerciseLabel } from "../../lib/exercises";
import { formatDuration } from "../../lib/format";
import type { FinishedSession } from "../../hooks/useTrainingSession";

const CONFETTI_COLORS = ["#1b3bff", "#ff3d1f", "#ffc400", "#f6f8ff"];
const CONFETTI_COUNT = 36;

/** Confeti ligero en CSS: piezas posicionadas al azar una sola vez por resumen. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 9) * 90}ms`,
        fall: `${2200 + (i % 5) * 260}ms`,
        drift: `${((i * 53) % 160) - 80}px`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    [],
  );
  return (
    <>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          aria-hidden="true"
          className="confetti"
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            background: piece.color,
            "--fall": piece.fall,
            "--drift": piece.drift,
          } as CSSProperties}
        />
      ))}
    </>
  );
}

interface SessionSummaryProps {
  session: FinishedSession;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function SessionSummary({ session, saving, saved, onSave, onDiscard }: SessionSummaryProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div className="summary" role="presentation">
      {!reduceMotion && <Confetti />}
      <div
        ref={dialogRef}
        className="card summary__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-title"
        tabIndex={-1}
      >
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="chip chip--cobalt">
            <Trophy size={14} aria-hidden="true" /> Sesión completada
          </span>
          <span className="muted tabular">{formatDuration(session.durationSeconds)}</span>
        </div>
        <div>
          <h2 id="summary-title" style={{ fontSize: 34 }}>
            {exerciseLabel(session.exercise)}
          </h2>
          <p className="muted">Revisa tu resultado antes de guardarlo en tu historial.</p>
        </div>
        <div className="row" style={{ justifyContent: "space-around", gap: 24 }}>
          <ProgressRing value={session.score} size={150} label={`Precisión media ${session.score} por ciento`}>
            <strong>
              <Odometer value={session.score} />
            </strong>
            <span>precisión</span>
          </ProgressRing>
          <div className="stack" style={{ gap: 14 }}>
            <div className="stat">
              <span className="stat__value tabular">
                <Odometer value={session.reps} stagger={120} />
              </span>
              <span className="stat__label">repeticiones</span>
            </div>
            {session.avgAngles?.knee !== undefined && (
              <div className="stat">
                <span className="stat__value tabular">
                  <Odometer value={session.avgAngles.knee} suffix="°" stagger={120} />
                </span>
                <span className="stat__label">ángulo medio de rodilla</span>
              </div>
            )}
          </div>
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onDiscard} disabled={saving}>
            Descartar
          </Button>
          <Button variant="primary" onClick={onSave} loading={saving} disabled={saved}>
            {saved ? "Guardada" : "Guardar sesión"}
          </Button>
        </div>
      </div>
    </div>
  );
}
