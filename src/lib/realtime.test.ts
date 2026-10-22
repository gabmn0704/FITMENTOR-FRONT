import { describe, expect, it } from "vitest";
import { buildCommandMessage, buildPoseMessage, buildWsUrl, parseServerMessage } from "./realtime";
import type { Point } from "../types";

describe("buildWsUrl", () => {
  it("convierte http a ws y añade el token", () => {
    expect(buildWsUrl("http://localhost:8080", "abc", "http://localhost:5173")).toBe(
      "ws://localhost:8080/ws?token=abc",
    );
  });

  it("usa wss con https y codifica el token", () => {
    expect(buildWsUrl("https://api.example.com/", "a+b/c", "https://app.example.com")).toBe(
      "wss://api.example.com/ws?token=a%2Bb%2Fc",
    );
  });

  it("usa el mismo origen cuando no hay API configurada", () => {
    expect(buildWsUrl("", "t", "https://fit.example.com")).toBe("wss://fit.example.com/ws?token=t");
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
    expect(message?.type).toBe("pose");
    expect(message?.points).toHaveLength(12);
    expect(message?.points[0]).toMatchObject({ name: "left_shoulder", confidence: 1 });
    expect(message?.points[1]).toMatchObject({ name: "right_shoulder", confidence: 0.8 });
    expect(message?.frame_width).toBe(640);
    expect(message?.session_id).toBe("s-1");
  });

  it("devuelve null sin landmarks", () => {
    expect(buildPoseMessage("squat", [], 640, 480)).toBeNull();
  });

  it("construye comandos", () => {
    expect(buildCommandMessage("undo")).toEqual({ type: "command", name: "undo" });
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

  it("acepta estado del servidor", () => {
    expect(parseServerMessage('{"type":"state","state":"paused"}')).toEqual({ type: "state", state: "paused" });
  });

  it("descarta mensajes inválidos", () => {
    expect(parseServerMessage("no json")).toBeNull();
    expect(parseServerMessage('{"type":"feedback"}')).toBeNull();
    expect(parseServerMessage('{"type":"unknown"}')).toBeNull();
    expect(parseServerMessage("null")).toBeNull();
  });
});
