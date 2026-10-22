import { TRACKED_JOINTS } from "./pose";
import type { CommandName, ExerciseId, FeedbackMessage, Point, ServerMessage } from "../types";

/**
 * Protocolo STOMP con el backend Spring Boot.
 * - Conexión: `ws(s)://<api>/ws` (CONNECT con cabecera Authorization: Bearer).
 * - Envíos: `/app/pose` (landmarks) y `/app/command` (pausa, reanudar, deshacer...).
 * - Recepción por sesión: `/topic/feedback.{session_id}` y `/topic/state.{session_id}`.
 */

/** Intervalo mínimo entre envíos de pose: como máximo tres por segundo. */
export const POSE_INTERVAL_MS = 340;

export const POSE_DESTINATION = "/app/pose";
export const COMMAND_DESTINATION = "/app/command";
export const feedbackTopic = (sessionId: string): string => `/topic/feedback.${sessionId}`;
export const stateTopic = (sessionId: string): string => `/topic/state.${sessionId}`;

/**
 * Formato de session_id que acepta el backend (registro y SUBSCRIBE). Un id
 * que no cumple haría que el servidor descarte los frames y rechace la
 * suscripción, así que el front lo valida antes de usarlo.
 */
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID_PATTERN.test(value);
}

/** El backend cierra la conexión con mensajes STOMP de más de 8 KB. */
export const MAX_STOMP_MESSAGE_BYTES = 8 * 1024;
/** Margen para la línea de comando y las cabeceras del frame SEND. */
const STOMP_FRAME_OVERHEAD_BYTES = 512;

/** Verdadero si el cuerpo cabe en un frame STOMP aceptado por el servidor. */
export function fitsStompFrame(body: string): boolean {
  return new TextEncoder().encode(body).length + STOMP_FRAME_OVERHEAD_BYTES <= MAX_STOMP_MESSAGE_BYTES;
}

/** Rango de coordenadas que acepta el servicio de IA (margen fuera del encuadre). */
const COORD_MIN = -0.5;
const COORD_MAX = 1.5;

function clampCoord(value: number): number {
  return Math.min(COORD_MAX, Math.max(COORD_MIN, value));
}

/**
 * URL del broker STOMP. Si no hay API configurada (mismo origen), usa el
 * origen de la página. El token no va en la URL: viaja en connectHeaders.
 */
export function buildBrokerUrl(apiUrl: string, origin: string): string {
  const url = new URL(apiUrl || origin);
  url.protocol = url.protocol === "https:" || url.protocol === "wss:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/ws`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

/** Cabeceras del CONNECT STOMP: Bearer solo si hay sesión. */
export function buildConnectHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface PosePayload {
  exercise: ExerciseId;
  points: Array<{ name: string; x: number; y: number; confidence: number }>;
  frame_width: number;
  frame_height: number;
  session_id: string;
}

export function buildPoseMessage(
  exercise: ExerciseId,
  landmarks: Point[],
  frameWidth: number,
  frameHeight: number,
  sessionId: string,
): PosePayload | null {
  if (!isValidSessionId(sessionId)) return null;
  const points = TRACKED_JOINTS.flatMap(([index, name]) => {
    const point = landmarks[index];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return [];
    const visibility = Number.isFinite(point.visibility) ? (point.visibility as number) : 0;
    return [
      {
        name,
        // MediaPipe puede devolver puntos fuera del encuadre; la IA rechaza el frame
        // entero (422) si alguno sale de [-0.5, 1.5], así que se acotan aquí.
        x: clampCoord(point.x),
        y: clampCoord(point.y),
        confidence: Math.min(1, Math.max(0, visibility)),
      },
    ];
  });
  if (!points.length) return null;
  return {
    exercise,
    points,
    frame_width: Math.max(1, Math.round(frameWidth)),
    frame_height: Math.max(1, Math.round(frameHeight)),
    session_id: sessionId,
  };
}

export interface CommandPayload {
  session_id: string;
  name: CommandName;
}

export function buildCommandMessage(name: CommandName, sessionId: string): CommandPayload {
  return { session_id: sessionId, name };
}

/** Fases que envía el servicio de IA. "hold" es la plancha (isométrico, sin reps). */
export type ServerPhase = "ready" | "up" | "down" | "bottom" | "hold";

const SERVER_PHASES: readonly ServerPhase[] = ["ready", "up", "down", "bottom", "hold"];

/** Fase de repetición válida enviada por el servidor, o undefined (p. ej. null con la IA caída). */
export function toRepPhase(value: unknown): ServerPhase | undefined {
  return typeof value === "string" && (SERVER_PHASES as readonly string[]).includes(value)
    ? (value as ServerPhase)
    : undefined;
}

/** Valida y normaliza un mensaje del servidor. Devuelve null si no es válido. */
export function parseServerMessage(raw: string): ServerMessage | null {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;

  if (data.type === "state" && typeof data.state === "string") {
    return {
      type: "state",
      state: data.state,
      ...(typeof data.exercise === "string" ? { exercise: data.exercise } : {}),
    };
  }

  if (data.type === "error" && typeof data.message === "string") {
    return { type: "error", message: data.message };
  }

  if (data.type === "feedback" && typeof data.score === "number") {
    const list = Array.isArray(data.feedback)
      ? data.feedback.filter((item): item is string => typeof item === "string")
      : [];
    const message =
      typeof data.message === "string" && data.message.trim()
        ? data.message
        : list.join(" ");
    if (!message) return null;
    const feedback: FeedbackMessage = {
      type: "feedback",
      score: Math.round(data.score),
      message,
      feedback: list,
      // null cuando la IA no respondió: el backend usó el análisis local y no avanza reps.
      phase: toRepPhase(data.phase),
      reps: typeof data.reps === "number" && Number.isFinite(data.reps) && data.reps >= 0 ? Math.floor(data.reps) : undefined,
      state: typeof data.state === "string" ? data.state : undefined,
      ...(typeof data.exercise === "string" ? { exercise: data.exercise } : {}),
    };
    return feedback;
  }
  return null;
}
