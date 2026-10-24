import type { RefObject } from "react";
import { Camera, Volume2, VolumeX } from "lucide-react";
import type { TrainingStatus } from "../../hooks/useTrainingSession";
import { Odometer } from "../motion/Odometer";

interface CameraStageProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  status: TrainingStatus;
  countdown: number | null;
  elapsed: number;
  voiceOn: boolean;
  onToggleVoice: () => void;
  formatTime: (seconds: number) => string;
  /** Repeticiones y precisión en vivo, mostradas sobre la imagen en pantallas estrechas. */
  reps?: number;
  target?: number;
  score?: number;
}

const STATUS_LABEL: Record<TrainingStatus, string> = {
  idle: "En espera",
  loading: "Iniciando IA",
  countdown: "Prepárate",
  running: "En vivo",
  paused: "En pausa",
};

/** Vista de cámara con esqueleto neón, cuenta regresiva y HUD superior. */
export function CameraStage({
  videoRef,
  canvasRef,
  status,
  countdown,
  elapsed,
  voiceOn,
  onToggleVoice,
  formatTime,
  reps,
  target,
  score,
}: CameraStageProps) {
  const active = status === "running" || status === "countdown" || status === "paused";
  return (
    <div className="camera" aria-live="off">
      <video ref={videoRef} autoPlay playsInline muted aria-label="Vista de la cámara" style={{ display: active ? "block" : "none" }} />
      <canvas ref={canvasRef} aria-hidden="true" />

      {!active && (
        <div className="camera__idle">
          <Camera size={34} aria-hidden="true" />
          <strong>Coloca tu cuerpo completo frente a la cámara</strong>
          <span className="muted" style={{ fontSize: 13 }}>
            Buena luz, cámara estable y espacio libre. El video no sale de tu dispositivo.
          </span>
        </div>
      )}

      {active && reps !== undefined && (
        <div className="camera__counter" aria-hidden="true">
          <span className="camera__counter-reps">
            <Odometer value={reps} stagger={0} />
            {target !== undefined && <small>/{target}</small>}
          </span>
          {score !== undefined && (
            <span className="camera__counter-score">
              <Odometer value={score} stagger={0} suffix="%" />
            </span>
          )}
        </div>
      )}

      <div className="camera__hud">
        <span className="hud-pill" role="status">
          {status === "running" && <span className="live-dot" aria-hidden="true" />}
          {STATUS_LABEL[status]}
          {active && status !== "countdown" && <span className="tabular">· {formatTime(elapsed)}</span>}
        </span>
        <button
          type="button"
          className="hud-pill"
          onClick={onToggleVoice}
          aria-pressed={voiceOn}
          aria-label={voiceOn ? "Desactivar correcciones por voz" : "Activar correcciones por voz"}
          style={{ pointerEvents: "auto" }}
        >
          {voiceOn ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
          Voz {voiceOn ? "on" : "off"}
        </button>
      </div>

      {status === "countdown" && countdown !== null && (
        <div className="countdown" key={countdown} aria-live="assertive" aria-label={`Empieza en ${countdown}`}>
          {countdown}
        </div>
      )}
    </div>
  );
}
