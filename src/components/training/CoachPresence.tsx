import { Mic, Volume2 } from "lucide-react";

export type CoachPresenceState = "idle" | "listening" | "speaking" | "counting";

interface CoachPresenceProps {
  state: CoachPresenceState;
  /** Frase actual del entrenador (corrección o ánimo). */
  message: string;
}

/**
 * Punto de integración del entrenador en la pantalla de entrenamiento.
 * Versión simple (anillo + mensaje): se reemplaza por <Mascot state size message/> cuando
 * llegue el componente de la mascota, manteniendo estas mismas props (state y message).
 */
export function CoachPresence({ state, message }: CoachPresenceProps) {
  return (
    <div className={`coach-presence coach-presence--${state}`} data-coach-state={state}>
      <span className="coach-presence__orb" aria-hidden="true">
        {state === "listening" ? <Mic size={18} /> : <Volume2 size={18} />}
      </span>
      <p className="coach-presence__message" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
