import { useRef, useState } from "react";
import { Pause, Play, RefreshCw, Square, Undo2, Wifi, WifiOff } from "lucide-react";
import { Button, Card, Notice, ProgressRing } from "../components/ui";
import { CameraStage } from "../components/training/CameraStage";
import { ExercisePicker } from "../components/training/ExercisePicker";
import { RestTimer } from "../components/training/RestTimer";
import { SessionSummary } from "../components/training/SessionSummary";
import { Sparkline } from "../components/charts/Sparkline";
import { Odometer } from "../components/motion/Odometer";
import { useAuth } from "../hooks/useAuth";
import { useRealtime } from "../hooks/useRealtime";
import { useTrainingSession, type AnalysisMode, type FinishedSession } from "../hooks/useTrainingSession";
import { EXERCISES, exerciseLabel } from "../lib/exercises";
import { formatDuration } from "../lib/format";
import { serverStateLabel } from "../lib/contract";
import { saveLocalSession, syncPendingSessions } from "../lib/sessions";
import type { RouteId } from "../lib/routes";
import type { SessionPayload } from "../types";

const PHASE_LABEL: Record<string, string> = {
  ready: "Preparado",
  up: "Arriba",
  down: "Bajando",
  bottom: "Abajo",
  hold: "Sosteniendo",
};

/** Texto de estado del canal en vivo según quién analiza la sesión. */
function channelText(mode: AnalysisMode, reconnecting: boolean, serverState: string | undefined): string {
  if (reconnecting) return "Sin conexión con el servidor. Reintentando… mientras tanto el análisis sigue en tu dispositivo.";
  const state = serverState ? ` · ${serverState}` : "";
  switch (mode) {
    case "ai":
      return `IA del servidor conectada: cuenta tus reps y corrige tu técnica${state}.`;
    case "fallback":
      return `Servidor conectado, IA no disponible: las reps se cuentan en tu dispositivo${state}.`;
    case "silent":
      return "El servidor no responde a la postura: análisis en tu dispositivo.";
    case "pending":
      return `Servidor conectado. Esperando el análisis de la IA${state}.`;
    default:
      return "Modo local: el análisis funciona sin conexión y la sesión se guarda en tu dispositivo.";
  }
}

/** Convierte el resumen de la sesión al payload que acepta el backend. */
function toPayload(summary: FinishedSession): SessionPayload {
  return {
    exercise: summary.exercise,
    reps: summary.reps,
    accuracy: summary.accuracy,
    durationSeconds: summary.durationSeconds,
    ...(summary.avgAngles ? { avgAngles: summary.avgAngles } : {}),
  };
}

interface TrainPageProps {
  onNavigate: (route: RouteId) => void;
}

export function TrainPage({ onNavigate }: TrainPageProps) {
  const { token } = useAuth();
  const realtime = useRealtime(token);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const session = useTrainingSession({ realtime, video, canvas });
  const [saving, setSaving] = useState(false);

  const meta = EXERCISES[session.exercise];
  const busy = session.status !== "idle";
  const progress = Math.min(100, Math.round((session.reps / meta.target) * 100));

  /** Guarda primero en local (nunca se pierde) y luego intenta subir al backend. */
  const save = async (summary: FinishedSession) => {
    setSaving(true);
    saveLocalSession(toPayload(summary));
    if (token) await syncPendingSessions(token);
    session.actions.dismissSummary();
    setSaving(false);
    onNavigate("progreso");
  };

  return (
    <section className="stack" aria-labelledby="train-title">
      <header className="page-header" data-banner="ropes">
        <h1 id="train-title">
          {meta.label} <span className="accent-live">en vivo</span>
        </h1>
        <p>La IA analiza tu técnica y te corrige. Solo se envían puntos de postura, nunca el video.</p>
      </header>

      <div className="train">
        <Card as="div" className="stack" title={meta.label}>
          <CameraStage
            videoRef={video}
            canvasRef={canvas}
            status={session.status}
            countdown={session.countdown}
            elapsed={session.elapsed}
            voiceOn={session.voiceOn}
            onToggleVoice={session.actions.toggleVoice}
            formatTime={formatDuration}
          />

          {session.error && <Notice tone="error">{session.error}</Notice>}

          <div className="row" role="group" aria-label="Controles de sesión">
            {session.status === "running" ? (
              <Button variant="ghost" onClick={session.actions.pause} icon={<Pause size={16} />}>
                Pausar
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => void session.actions.start()}
                loading={session.status === "loading"}
                disabled={session.status === "countdown"}
                icon={session.status === "loading" ? undefined : <Play size={16} fill="currentColor" />}
              >
                {session.status === "paused" ? "Reanudar" : "Comenzar análisis"}
              </Button>
            )}
            <Button variant="ghost" onClick={() => session.actions.undo()} disabled={!session.canUndo} icon={<Undo2 size={16} />}>
              Deshacer rep
            </Button>
            <Button variant="danger" onClick={() => session.actions.finish()} disabled={!busy} icon={<Square size={14} fill="currentColor" />}>
              Terminar
            </Button>
          </div>

          <p
            className={`channel-status channel-status--${realtime.reconnecting ? "retry" : session.analysisMode}`}
            role="status"
          >
            {realtime.reconnecting ? (
              <RefreshCw size={15} aria-hidden="true" className="spin" />
            ) : realtime.connected ? (
              <Wifi size={15} aria-hidden="true" />
            ) : (
              <WifiOff size={15} aria-hidden="true" />
            )}
            <span>{channelText(session.analysisMode, realtime.reconnecting, serverStateLabel(realtime.serverState))}</span>
          </p>
        </Card>

        <div className="stack">
          <Card as="div" className="hud-panel" title={exerciseLabel(session.exercise)}>
            <div className="metric-pair">
              <div>
                <p className="muted" style={{ fontSize: 13 }}>
                  Repeticiones
                </p>
                <div className="big-number tabular" aria-live="polite">
                  <Odometer value={session.reps} stagger={0} />
                  <small>/ {meta.target}</small>
                </div>
              </div>
              <div className="row" style={{ justifyContent: "center" }}>
                <ProgressRing value={session.score} size={112} stroke={10} label={`Precisión ${session.score} por ciento`}>
                  <strong>
                    <Odometer value={session.score} stagger={0} />
                  </strong>
                  <span>precisión</span>
                </ProgressRing>
              </div>
            </div>

            <div className="bar" aria-hidden="true">
              <div className="bar__fill" style={{ width: `${progress}%` }} />
            </div>

            <p aria-live="polite" style={{ fontWeight: 600 }}>
              {session.cue}
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              Fase: {PHASE_LABEL[session.repPhase] ?? session.repPhase}
              {session.angle !== null && ` · Ángulo: ${session.angle}°`}
            </p>

            <div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
                Precisión reciente
              </p>
              <Sparkline values={session.trend} label="Tendencia de precisión reciente" />
            </div>

            <RestTimer seconds={60} />
          </Card>

          <Card as="div" title="Ejercicio">
            <ExercisePicker value={session.exercise} disabled={busy} onChange={session.actions.selectExercise} />
            {busy && (
              <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
                Termina la sesión para cambiar de ejercicio.
              </p>
            )}
          </Card>
        </div>
      </div>

      {session.finished && (
        <SessionSummary
          session={session.finished}
          saving={saving}
          saved={false}
          onSave={() => void save(session.finished!)}
          onDiscard={session.actions.dismissSummary}
        />
      )}
    </section>
  );
}
