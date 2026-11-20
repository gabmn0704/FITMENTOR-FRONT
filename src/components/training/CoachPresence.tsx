import { Mic } from "lucide-react";
import { Mascot } from "../mascot/Mascot";
import type { MascotState } from "../../lib/mascot";

export type CoachPresenceState = "idle" | "listening" | "speaking" | "counting";

interface CoachPresenceProps {
  state: CoachPresenceState;
  /** Frase actual del entrenador (corrección o ánimo). */
  message: string;
  /** Repeticiones hechas; se muestran en la mascota mientras cuenta. */
  count?: number;
}

const MASCOT_BY_STATE: Record<CoachPresenceState, MascotState> = {
  idle: "idle",
  listening: "wave",
  speaking: "cheer",
  counting: "count",
};

/** Entrenador en la pantalla de entrenamiento: Rep reacciona a la voz y al conteo. */
export function CoachPresence({ state, message, count }: CoachPresenceProps) {
  return (
    <div className={`coach-presence coach-presence--${state}`} data-coach-state={state}>
      <Mascot state={MASCOT_BY_STATE[state]} size={96} message={message} count={count} placement="right" />
      {state === "listening" && (
        <span className="coach-presence__orb" role="status" aria-label="Escuchando comandos de voz">
          <Mic size={16} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
