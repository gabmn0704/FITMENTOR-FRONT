import { describe, expect, it } from "vitest";
import {
  buildBrokerUrl,
  buildCommandMessage,
  buildConnectHeaders,
  buildPoseMessage,
  feedbackTopic,
  fitsStompFrame,
  isValidSessionId,
  parseServerMessage,
  stateTopic,
  toRepPhase,
} from "./realtime";
import type { Point } from "../types";

describe("buildBrokerUrl", () => {
  it("convierte http a ws y añade /ws", () => {
    expect(buildBrokerUrl("http://localhost:8080", "http://localhost:5173")).toBe("ws://localhost:8080/ws");
  });

  it("usa wss con https y no pone el token en la URL", () => {
    expect(buildBrokerUrl("https://api.example.com/", "https://app.example.com")).toBe(
      "wss://api.example.com/ws",
    );
  });

  it("usa el mismo origen cuando no hay API configurada", () => {
    expect(buildBrokerUrl("", "https://fit.example.com")).toBe("wss://fit.example.com/ws");
  });
});

describe("buildConnectHeaders", () => {
  it("envía Bearer solo cuando hay token", () => {
    expect(buildConnectHeaders("abc")).toEqual({ Authorization: "Bearer abc" });
    expect(buildConnectHeaders(null)).toEqual({});
  });
});

describe("destinos STOMP", () => {
  it("usa los topics por sesión del protocolo", () => {
    expect(feedbackTopic("s-1")).toBe("/topic/feedback.s-1");
    expect(stateTopic("s-1")).toBe("/topic/state.s-1");
  });
});

describe("buildPoseMessage", () => {
  it("envía los 12 landmarks con confianza acotada y session_id", () => {
    const landmarks: Point[] = Array.from({ length: 33 }, (_, i) => ({
      x: i / 33,
      y: 0.5,
      visibility: i === 11 ? 1.4 : 0.8,
    }));
    const message = buildPoseMessage("squat", landmarks, 640.4, 480, "s-1");
    expect(message).not.toBeNull();
    expect(message).not.toHaveProperty("type");
    expect(message?.exercise).toBe("squat");
    expect(message?.points).toHaveLength(12);
    expect(message?.points[0]).toMatchObject({ name: "left_shoulder", confidence: 1 });
    expect(message?.points[1]).toMatchObject({ name: "right_shoulder", confidence: 0.8 });
    expect(message?.frame_width).toBe(640);
    expect(message?.session_id).toBe("s-1");
  });

  it("devuelve null sin landmarks", () => {
    expect(buildPoseMessage("squat", [], 640, 480, "s-1")).toBeNull();
  });

  it("construye comandos con session_id", () => {
    expect(buildCommandMessage("undo", "s-1")).toEqual({ session_id: "s-1", name: "undo" });
  });
});

describe("toRepPhase", () => {
  it("acepta solo fases conocidas", () => {
    expect(toRepPhase("down")).toBe("down");
    expect(toRepPhase("hold")).toBe("hold");
    expect(toRepPhase(null)).toBeUndefined();
    expect(toRepPhase("sideways")).toBeUndefined();
    expect(toRepPhase(3)).toBeUndefined();
  });
});

describe("parseServerMessage", () => {
  it("normaliza feedback con lista de consejos", () => {
    const parsed = parseServerMessage(
      JSON.stringify({ type: "feedback", score: 87.4, feedback: ["Baja más", "Espalda recta"], phase: "down", reps: 3 }),
    );
    expect(parsed).toEqual({
      type: "feedback",
      score: 87,
      message: "Baja más Espalda recta",
      feedback: ["Baja más", "Espalda recta"],
      phase: "down",
      reps: 3,
      state: undefined,
    });
  });

  it("acepta estado del servidor con ejercicio", () => {
    expect(parseServerMessage('{"type":"state","state":"ACTIVE_SET","exercise":"squat"}')).toEqual({
      type: "state",
      state: "ACTIVE_SET",
      exercise: "squat",
    });
  });

  it("acepta mensajes de error del canal", () => {
    expect(parseServerMessage('{"type":"error","message":"frame inválido"}')).toEqual({
      type: "error",
      message: "frame inválido",
    });
  });

  it("descarta mensajes inválidos", () => {
    expect(parseServerMessage("no json")).toBeNull();
    expect(parseServerMessage('{"type":"feedback"}')).toBeNull();
    expect(parseServerMessage('{"type":"state"}')).toBeNull();
    expect(parseServerMessage('{"type":"unknown"}')).toBeNull();
    expect(parseServerMessage("null")).toBeNull();
  });
});

describe("límites del canal STOMP", () => {
  it("valida session_id como el backend", () => {
    expect(isValidSessionId("0fad0176-1724-4888-acbd-71cd2a61e975")).toBe(true);
    expect(isValidSessionId("a_b-C9")).toBe(true);
    expect(isValidSessionId("")).toBe(false);
    expect(isValidSessionId("x".repeat(101))).toBe(false);
    expect(isValidSessionId("abc.def")).toBe(false);
    expect(isValidSessionId("*")).toBe(false);
    expect(isValidSessionId(42)).toBe(false);
  });

  it("no construye poses con un session_id inválido", () => {
    const landmarks: Point[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
    expect(buildPoseMessage("squat", landmarks, 640, 480, "id.con.puntos")).toBeNull();
  });

  it("acota coordenadas fuera de [-0.5, 1.5] y descarta puntos no finitos", () => {
    const landmarks: Point[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
    landmarks[11] = { x: -2, y: 3, visibility: 0.9 };
    landmarks[12] = { x: Number.NaN, y: 0.5, visibility: 0.9 };
    const message = buildPoseMessage("squat", landmarks, 640, 480, "s-1");
    expect(message?.points).toHaveLength(11);
    expect(message?.points[0]).toMatchObject({ name: "left_shoulder", x: -0.5, y: 1.5 });
  });

  it("respeta el máximo de 8 KB por mensaje", () => {
    expect(fitsStompFrame("x".repeat(2000))).toBe(true);
    expect(fitsStompFrame("x".repeat(8 * 1024))).toBe(false);
  });

  it("feedback con phase null (IA caída) no trae fase y conserva reps", () => {
    const parsed = parseServerMessage(
      JSON.stringify({ type: "feedback", score: 70, message: "Mantén la espalda recta.", feedback: [], phase: null, reps: 4, state: "ACTIVE_SET", exercise: "squat" }),
    );
    expect(parsed).toMatchObject({ type: "feedback", reps: 4, state: "ACTIVE_SET", exercise: "squat" });
    expect(parsed && "phase" in parsed ? parsed.phase : undefined).toBeUndefined();
  });
});
