import { Activity, Mic, Volume2 } from "lucide-react";

export type CoachCueState = "idle" | "listening" | "speaking";

interface CoachCueProps {
  state: CoachCueState;
  /** Corrección o indicación actual del entrenador. */
  message: string;
}

const LABEL: Record<CoachCueState, string> = {
  idle: "Indicación actual",
  listening: "Escuchando comandos",
  speaking: "El entrenador habla",
};

/** Indicación en vivo del entrenador: texto grande, legible a distancia, con el estado de voz a un lado. */
export function CoachCue({ state, message }: CoachCueProps) {
  const Icon = state === "listening" ? Mic : state === "speaking" ? Volume2 : Activity;
  return (
    <div className={`coach-cue coach-cue--${state}`} data-coach-state={state}>
      <span className="coach-cue__icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className="coach-cue__body">
        <span className="coach-cue__label">{LABEL[state]}</span>
        <p className="coach-cue__message" aria-live="polite">
          {message}
        </p>
      </div>
    </div>
  );
}
