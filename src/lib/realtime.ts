import { TRACKED_JOINTS } from "./pose";
import type { CommandName, ExerciseId, FeedbackMessage, Point, ServerMessage } from "../types";

/** Intervalo mínimo entre envíos de pose: como máximo tres por segundo. */
export const POSE_INTERVAL_MS = 340;

/** URL del WebSocket nativo: `${apiUrl}/ws?token=<jwt>` con ws/wss. */
export function buildWsUrl(apiUrl: string, token: string, origin: string): string {
  const url = new URL(apiUrl || origin);
  url.protocol = url.protocol === "https:" || url.protocol === "wss:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/ws`;
  url.search = `token=${encodeURIComponent(token)}`;
  url.hash = "";
  return url.toString();
}

export interface PosePayload {
  type: "pose";
  exercise: ExerciseId;
  points: Array<{ name: string; x: number; y: number; confidence: number }>;
  frame_width: number;
  frame_height: number;
  session_id?: string;
}

export function buildPoseMessage(
  exercise: ExerciseId,
  landmarks: Point[],
  frameWidth: number,
  frameHeight: number,
  sessionId?: string,
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
    type: "pose",
    exercise,
    points,
    frame_width: Math.max(1, Math.round(frameWidth)),
    frame_height: Math.max(1, Math.round(frameHeight)),
    ...(sessionId ? { session_id: sessionId } : {}),
  };
}

export function buildCommandMessage(name: CommandName): { type: "command"; name: CommandName } {
  return { type: "command", name };
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
