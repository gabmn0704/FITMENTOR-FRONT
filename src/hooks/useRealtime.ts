import { useCallback, useEffect, useRef, useState } from "react";
import { Client, type StompSubscription } from "@stomp/stompjs";
import { API_URL } from "../lib/config";
import {
  buildBrokerUrl,
  buildCommandMessage,
  buildConnectHeaders,
  buildPoseMessage,
  COMMAND_DESTINATION,
  feedbackTopic,
  fitsStompFrame,
  isValidSessionId,
  parseServerMessage,
  POSE_DESTINATION,
  POSE_INTERVAL_MS,
  stateTopic,
} from "../lib/realtime";
import type { CommandName, ExerciseId, FeedbackMessage, Point } from "../types";

export type RealtimeStatus = "offline" | "connecting" | "open" | "closed";

/** Reconexión automática: primer reintento a los 2 s, luego con espera creciente hasta 30 s. */
const RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
/** Latido en ambos sentidos para detectar conexiones muertas. */
const HEARTBEAT_MS = 10_000;

/**
 * Canal STOMP con el backend Java. Con token se envía en el CONNECT
 * (Authorization: Bearer). La sesión de entrenamiento se suscribe a sus
 * topics (`/topic/feedback.{id}` y `/topic/state.{id}`). Sin conexión, la
 * app sigue con el análisis local (modo offline).
 */
export function useRealtime(token: string | null) {
  const [status, setStatus] = useState<RealtimeStatus>(token ? "connecting" : "offline");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [serverState, setServerState] = useState<string | null>(null);
  const [serverExercise, setServerExercise] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);
  const subsRef = useRef<StompSubscription[]>([]);
  const sessionRef = useRef<string | null>(null);
  const lastSentRef = useRef(0);
  const failuresRef = useRef(0);

  const handleMessage = useCallback((body: string) => {
    const message = parseServerMessage(body);
    if (!message) return;
    if (message.type === "feedback") {
      setFeedback(message);
      if (message.state) setServerState(message.state);
    }
    else if (message.type === "state") {
      setServerState(message.state);
      if (message.exercise) setServerExercise(message.exercise);
    }
    // Los mensajes "error" del canal (frame inválido) no interrumpen la sesión.
  }, []);

  const dropSubscriptions = useCallback(() => {
    subsRef.current.forEach((subscription) => subscription.unsubscribe());
    subsRef.current = [];
  }, []);

  const subscribeSession = useCallback(
    (client: Client, id: string) => {
      dropSubscriptions();
      subsRef.current = [
        client.subscribe(feedbackTopic(id), (message) => handleMessage(message.body)),
        client.subscribe(stateTopic(id), (message) => handleMessage(message.body)),
      ];
    },
    [dropSubscriptions, handleMessage],
  );

  useEffect(() => {
    if (!token) {
      setStatus("offline");
      setFeedback(null);
      return;
    }

    setStatus("connecting");
    const client = new Client({
      brokerURL: buildBrokerUrl(API_URL, window.location.origin),
      connectHeaders: buildConnectHeaders(token),
      reconnectDelay: RECONNECT_DELAY_MS,
      heartbeatIncoming: HEARTBEAT_MS,
      heartbeatOutgoing: HEARTBEAT_MS,
    });

    client.onConnect = () => {
      failuresRef.current = 0;
      client.reconnectDelay = RECONNECT_DELAY_MS;
      // Tras una reconexión las suscripciones se pierden: las restauramos.
      if (sessionRef.current) subscribeSession(client, sessionRef.current);
      setStatus("open");
    };
    const onDown = () => {
      // Espera exponencial: un backend caído o un token rechazado no se reintentan cada 2 s.
      failuresRef.current += 1;
      client.reconnectDelay = Math.min(
        MAX_RECONNECT_DELAY_MS,
        RECONNECT_DELAY_MS * 2 ** Math.min(4, failuresRef.current - 1),
      );
      dropSubscriptions();
      setStatus("closed");
      setFeedback(null);
      setServerState(null);
    };
    client.onWebSocketClose = onDown;
    client.onStompError = () => {
      // El servidor rechazó el CONNECT o un frame (ERROR STOMP); la conexión se cerrará.
      setStatus("closed");
    };
    client.onWebSocketError = () => setStatus("closed");

    clientRef.current = client;
    client.activate();

    return () => {
      dropSubscriptions();
      clientRef.current = null;
      void client.deactivate();
    };
  }, [token, dropSubscriptions, subscribeSession]);

  /** Inicia una sesión de entrenamiento: su id identifica topics y envíos. */
  const startSession = useCallback(
    (id: string) => {
      if (!isValidSessionId(id)) return;
      sessionRef.current = id;
      setSessionId(id);
      setFeedback(null);
      setServerState(null);
      setServerExercise(null);
      const client = clientRef.current;
      if (client?.connected) subscribeSession(client, id);
    },
    [subscribeSession],
  );

  /** Cierra la sesión actual en el servidor-cliente: deja de escuchar sus topics. */
  const endSession = useCallback(() => {
    dropSubscriptions();
    sessionRef.current = null;
    setSessionId(null);
    setFeedback(null);
  }, [dropSubscriptions]);

  /** Publica landmarks si hay sesión activa y pasó el intervalo mínimo. */
  const sendPose = useCallback(
    (exercise: ExerciseId, landmarks: Point[], frameWidth: number, frameHeight: number): boolean => {
      const client = clientRef.current;
      const id = sessionRef.current;
      if (!client?.connected || !id) return false;
      const now = Date.now();
      if (now - lastSentRef.current < POSE_INTERVAL_MS) return false;
      const payload = buildPoseMessage(exercise, landmarks, frameWidth, frameHeight, id);
      if (!payload) return false;
      const body = JSON.stringify(payload);
      // Un frame de más de 8 KB haría que el servidor cierre la conexión.
      if (!fitsStompFrame(body)) return false;
      lastSentRef.current = now;
      client.publish({ destination: POSE_DESTINATION, body });
      return true;
    },
    [],
  );

  const sendCommand = useCallback((name: CommandName): boolean => {
    const client = clientRef.current;
    const id = sessionRef.current;
    if (!client?.connected || !id) return false;
    client.publish({ destination: COMMAND_DESTINATION, body: JSON.stringify(buildCommandMessage(name, id)) });
    return true;
  }, []);

  const connected = status === "open";

  return {
    status,
    connected,
    /** Hay token pero el canal cayó: STOMP está reintentando en segundo plano. */
    reconnecting: Boolean(token) && status === "closed",
    /** Verdadero cuando el servidor cuenta las repeticiones de la sesión activa. */
    serverCounting: connected && sessionId !== null,
    sessionId,
    feedback,
    serverState,
    serverExercise,
    startSession,
    endSession,
    sendPose,
    sendCommand,
  };
}
