import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "../lib/config";
import {
  buildCommandMessage,
  buildPoseMessage,
  buildWsUrl,
  parseServerMessage,
  POSE_INTERVAL_MS,
} from "../lib/realtime";
import type { CommandName, ExerciseId, FeedbackMessage, Point } from "../types";

export type RealtimeStatus = "offline" | "connecting" | "open" | "closed";

const MAX_BACKOFF_MS = 10_000;

/**
 * Conexión WebSocket nativa con el servicio de pose. Reintenta con backoff
 * exponencial. Sin token o sin conexión, la app sigue en modo local.
 */
export function useRealtime(token: string | null) {
  const [status, setStatus] = useState<RealtimeStatus>(token ? "connecting" : "offline");
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [serverState, setServerState] = useState<string | null>(null);
  const [serverExercise, setServerExercise] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!token) {
      setStatus("offline");
      setFeedback(null);
      return;
    }

    let disposed = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (disposed) return;
      setStatus("connecting");
      const socket = new WebSocket(buildWsUrl(API_URL, token, window.location.origin));
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setStatus("open");
      };
      socket.onmessage = (event) => {
        const message = parseServerMessage(String(event.data));
        if (!message) return;
        if (message.type === "feedback") setFeedback(message);
        else if (message.type === "state") {
          setServerState(message.state);
          if (message.exercise) setServerExercise(message.exercise);
        }
        // Los mensajes "error" del canal (frame inválido) no interrumpen la sesión.
      };
      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (disposed) return;
        setStatus("closed");
        setFeedback(null);
        const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt);
        attempt++;
        timer = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, [token]);

  /** Envía landmarks si hay conexión abierta y pasó el intervalo mínimo. */
  const sendPose = useCallback(
    (
      exercise: ExerciseId,
      landmarks: Point[],
      frameWidth: number,
      frameHeight: number,
      sessionId?: string,
    ): boolean => {
      const socket = socketRef.current;
      const now = Date.now();
      if (!socket || socket.readyState !== WebSocket.OPEN) return false;
      if (now - lastSentRef.current < POSE_INTERVAL_MS) return false;
      const payload = buildPoseMessage(exercise, landmarks, frameWidth, frameHeight, sessionId);
      if (!payload) return false;
      lastSentRef.current = now;
      socket.send(JSON.stringify(payload));
      return true;
    },
    [],
  );

  const sendCommand = useCallback((name: CommandName): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(buildCommandMessage(name)));
    return true;
  }, []);

  return {
    status,
    connected: status === "open",
    feedback,
    serverState,
    serverExercise,
    sendPose,
    sendCommand,
  };
}
