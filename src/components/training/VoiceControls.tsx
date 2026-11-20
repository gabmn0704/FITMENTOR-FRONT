import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import type { ListenState } from "../../lib/voiceCommands";

interface VoiceControlsProps {
  voiceOn: boolean;
  volume: number;
  onToggleVoice: () => void;
  onVolume: (value: number) => void;
  commandsSupported: boolean;
  commandsEnabled: boolean;
  listenState: ListenState;
  heard: string;
  onToggleCommands: () => void;
}

const LISTEN_TEXT: Record<ListenState, string> = {
  off: "Comandos de voz apagados",
  starting: "Activando micrófono…",
  listening: "Escuchando: di «iniciar», «pausa», «siguiente ejercicio», «terminar», «repite» o «cómo voy»",
  blocked: "Micrófono bloqueado: permítelo en el navegador para usar comandos de voz",
  unsupported: "Tu navegador no admite comandos de voz (usa Chrome o Edge). Los botones funcionan igual.",
};

/** Controles de voz: silencio, volumen y comandos de voz con indicador de escucha. */
export function VoiceControls({
  voiceOn,
  volume,
  onToggleVoice,
  onVolume,
  commandsSupported,
  commandsEnabled,
  listenState,
  heard,
  onToggleCommands,
}: VoiceControlsProps) {
  const listening = commandsEnabled && listenState === "listening";
  return (
    <div className="voice-controls" role="group" aria-label="Controles de voz">
      <div className="voice-controls__row">
        <button
          type="button"
          className="voice-controls__btn"
          onClick={onToggleVoice}
          aria-pressed={voiceOn}
          aria-label={voiceOn ? "Silenciar al entrenador" : "Activar la voz del entrenador"}
        >
          {voiceOn ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
          {voiceOn ? "Voz" : "Silencio"}
        </button>
        <label className="voice-controls__volume">
          <span className="sr-only">Volumen del entrenador</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(volume * 100)}
            disabled={!voiceOn}
            onChange={(event) => onVolume(Number(event.target.value) / 100)}
            aria-valuetext={`${Math.round(volume * 100)} por ciento`}
          />
        </label>
        <button
          type="button"
          className={`voice-controls__btn voice-controls__mic${listening ? " is-listening" : ""}`}
          onClick={onToggleCommands}
          disabled={!commandsSupported}
          aria-pressed={commandsEnabled}
          aria-label={commandsEnabled ? "Apagar comandos de voz" : "Activar comandos de voz"}
        >
          {commandsEnabled ? <Mic size={16} aria-hidden="true" /> : <MicOff size={16} aria-hidden="true" />}
          {listening ? "Escuchando" : "Comandos"}
          {listening && <span className="voice-controls__pulse" aria-hidden="true" />}
        </button>
      </div>
      <p className="voice-controls__hint muted" role="status">
        {commandsSupported ? LISTEN_TEXT[commandsEnabled ? listenState : "off"] : LISTEN_TEXT.unsupported}
        {commandsEnabled && heard && <span className="voice-controls__heard"> · Oí: «{heard}»</span>}
      </p>
    </div>
  );
}
