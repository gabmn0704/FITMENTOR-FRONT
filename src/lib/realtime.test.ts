import { describe, expect, it } from "vitest";
import {
  buildBrokerUrl,
  buildCommandMessage,
  buildConnectHeaders,
  buildPoseMessage,
  feedbackTopic,
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
