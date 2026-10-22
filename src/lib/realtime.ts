import { TRACKED_JOINTS, type RepPhase } from "./pose";
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
  const points = TRACKED_JOINTS.flatMap(([index, name]) => {
    const point = landmarks[index];
    if (!point) return [];
    return [
      {
        name,
        x: point.x,
        y: point.y,
        confidence: Math.min(1, Math.max(0, point.visibility ?? 0)),
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

const REP_PHASES: readonly RepPhase[] = ["ready", "up", "down", "bottom"];

/** Fase de repetición válida enviada por el servidor, o undefined. */
export function toRepPhase(value: unknown): RepPhase | undefined {
  return typeof value === "string" && (REP_PHASES as readonly string[]).includes(value)
    ? (value as RepPhase)
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
      phase: typeof data.phase === "string" ? data.phase : undefined,
      reps: typeof data.reps === "number" ? data.reps : undefined,
      state: typeof data.state === "string" ? data.state : undefined,
    };
    return feedback;
  }
  return null;
}
