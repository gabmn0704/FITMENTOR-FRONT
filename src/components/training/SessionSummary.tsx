import { useEffect, useRef } from "react";
import { Trophy } from "lucide-react";
import { Button, ProgressRing } from "../ui";
import { Odometer } from "../motion/Odometer";
import { Mascot } from "../mascot/Mascot";
import { fireConfetti } from "../motion/Confetti";
import { exerciseLabel } from "../../lib/exercises";
import { useProfile } from "../../hooks/useProfile";
import { postWorkoutTip } from "../../lib/nutrition";
import { formatDuration } from "../../lib/format";
import type { FinishedSession } from "../../hooks/useTrainingSession";

interface SessionSummaryProps {
  session: FinishedSession;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function SessionSummary({ session, saving, saved, onSave, onDiscard }: SessionSummaryProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { profile } = useProfile();

  useEffect(() => {
    dialogRef.current?.focus();
    const id = window.setTimeout(() => fireConfetti({ x: 0.5, y: 0.4, count: 160 }), 350);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="summary" role="presentation">
      <div
        ref={dialogRef}
        className="card summary__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-title"
        tabIndex={-1}
      >
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="chip chip--brand">
            <Trophy size={14} aria-hidden="true" /> Sesión completada
          </span>
          <span className="muted tabular">{formatDuration(session.durationSeconds)}</span>
        </div>
        <div className="summary__hero">
          <Mascot state={session.score >= 60 ? "celebrate" : "worried"} size={112} message={session.score >= 60 ? true : "Así se aprende. Intentémoslo de nuevo."} />
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
        {profile && <p className="summary__tip">{postWorkoutTip(profile.goal)}</p>}
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
