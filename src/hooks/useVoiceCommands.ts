import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEYS, storage } from "../lib/storage";
import { CommandListener, getRecognitionCtor, type ListenState, type VoiceCommand } from "../lib/voiceCommands";

interface Options {
  onCommand: (command: VoiceCommand, heard: string) => void;
  /** Devuelve true mientras el entrenador habla: lo oído en ese momento se ignora. */
  shouldIgnore?: () => boolean;
}

/** Comandos de voz de entrada: activación persistente, estado de escucha y último comando oído. */
export function useVoiceCommands({ onCommand, shouldIgnore }: Options) {
  const supported = useMemo(() => getRecognitionCtor() !== null, []);
  const [enabled, setEnabled] = useState(() => supported && storage.getString(STORAGE_KEYS.voiceCommands) === "on");
  const [state, setState] = useState<ListenState>(supported ? "off" : "unsupported");
  const [heard, setHeard] = useState("");

  const handlers = useRef({ onCommand, shouldIgnore });
  handlers.current = { onCommand, shouldIgnore };
  const listener = useRef<CommandListener | null>(null);

  useEffect(() => {
    if (!supported) return;
    const instance = new CommandListener({
      onCommand: (command, text) => {
        setHeard(text);
        handlers.current.onCommand(command, text);
      },
      onState: (next) => {
        setState(next);
        // Permiso denegado: dejamos de intentar y la preferencia queda apagada.
        if (next === "blocked") {
          setEnabled(false);
          storage.setString(STORAGE_KEYS.voiceCommands, "off");
        }
      },
      shouldIgnore: () => handlers.current.shouldIgnore?.() ?? false,
    });
    listener.current = instance;
    return () => {
      instance.stop();
      listener.current = null;
    };
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    if (enabled) listener.current?.start();
    else listener.current?.stop();
  }, [enabled, supported]);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      storage.setString(STORAGE_KEYS.voiceCommands, next ? "on" : "off");
      if (next) setHeard("");
      return next;
    });
  }, []);

  return { supported, enabled, state, heard, toggle };
}
