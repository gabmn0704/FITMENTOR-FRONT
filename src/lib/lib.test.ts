import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { advanceRepPhase, analyzePose, AngleSmoother, angle, coachingCue, POSE, type RepPhase } from "./pose";
import { VoiceCoach, type SpeechSynthesisLike, type SpeechSynthesisUtteranceLike } from "./speech";
import { storage } from "./storage";
import { buildApiUrl } from "./api";
import { formatDuration, normalizeProgress } from "./format";
import { exerciseLabel } from "./exercises";
import type { Point } from "../types";

const pt = (x: number, y: number, visibility = 1): Point => ({ x, y, visibility });

describe("pose", () => {
  it("calcula ángulos en grados", () => {
    expect(angle(pt(1, 0), pt(0, 0), pt(0, 1))).toBeCloseTo(90);
    expect(angle(pt(1, 0), pt(0, 0), pt(-1, 0))).toBeCloseTo(180);
    expect(angle(pt(0, 0), pt(0, 0), pt(1, 1))).toBeNull();
  });

  it("devuelve null sin pose visible y métricas con pose completa", () => {
    const empty = Array.from({ length: 33 }, () => pt(0.5, 0.5, 0));
    expect(analyzePose(empty, "squat")).toBeNull();

    const points = Array.from({ length: 33 }, () => pt(0.5, 0.5));
    // Rodilla recta: cadera-rodilla-tobillo alineados.
    points[POSE.leftHip] = pt(0.5, 0.4);
    points[POSE.leftKnee] = pt(0.5, 0.6);
    points[POSE.leftAnkle] = pt(0.5, 0.8);
    points[POSE.rightHip] = pt(0.5, 0.4);
    points[POSE.rightKnee] = pt(0.5, 0.6);
    points[POSE.rightAnkle] = pt(0.5, 0.8);
    const metrics = analyzePose(points, "squat");
    expect(metrics?.knee).toBe(180);
    expect(metrics?.score).toBeGreaterThanOrEqual(45);
  });

  it("da una frase de corrección para cada caso", () => {
    expect(coachingCue("squat", null)).toMatch(/encuadre/);
    expect(coachingCue("squat", { score: 90, knee: 180, movementAngle: 180, alignment: 0 })).toMatch(/Desciende/);
    expect(coachingCue("plank", { score: 90, knee: null, movementAngle: null, alignment: 0.01 })).toMatch(/Buena alineación/);
  });

  it("avanza las fases de una sentadilla y cuenta una repetición", () => {
    let phase: RepPhase = "ready";
    let reps = 0;
    for (const a of [160, 120, 100, 150]) {
      const result = advanceRepPhase(phase, a, "squat");
      phase = result.phase;
      if (result.completed) reps++;
    }
    expect(reps).toBe(1);
    expect(phase).toBe("up");
  });

  it("la plancha no cuenta repeticiones", () => {
    expect(advanceRepPhase("ready", 40, "plank")).toEqual({ phase: "ready", completed: false });
  });

  it("suaviza el ángulo con una ventana móvil", () => {
    const smoother = new AngleSmoother();
    expect(smoother.push(100)).toBe(100);
    expect(smoother.push(200)).toBe(150);
    smoother.reset();
    expect(smoother.push(50)).toBe(50);
  });
});

describe("VoiceCoach", () => {
  let spoken: string[];
  let synth: SpeechSynthesisLike & { finish: () => void };
  let pending: SpeechSynthesisUtteranceLike[];
  let time: number;

  beforeEach(() => {
    spoken = [];
    pending = [];
    time = 0;
    synth = {
      speak(utterance) {
        spoken.push(utterance.text);
        pending.push(utterance);
      },
      cancel: vi.fn(),
      finish() {
        const current = pending.shift();
        current?.onend?.();
      },
    };
  });

  const make = () =>
    new VoiceCoach(synth, (text) => ({ text, lang: "es-ES", rate: 1, onend: null, onerror: null }), () => time);

  it("no solapa mensajes: el siguiente empieza al terminar el anterior", () => {
    const voice = make();
    voice.say("uno", true);
    voice.say("dos", true);
    expect(spoken).toEqual(["uno"]);
    synth.finish();
    expect(spoken).toEqual(["uno", "dos"]);
  });

  it("descarta repeticiones dentro de la ventana de 4.5 s", () => {
    const voice = make();
    expect(voice.say("corrige la cadera")).toBe(true);
    time = 1000;
    expect(voice.say("corrige la cadera")).toBe(false);
    time = 5000;
    expect(voice.say("otra frase")).toBe(true);
  });

  it("no habla cuando está desactivado o no hay soporte", () => {
    const voice = make();
    voice.enabled = false;
    expect(voice.say("hola", true)).toBe(false);
    expect(new VoiceCoach(null, (t) => ({ text: t, lang: "", rate: 1, onend: null, onerror: null })).say("x", true)).toBe(false);
  });
});

describe("storage", () => {
  afterEach(() => window.localStorage.clear());

  it("lee JSON corrupto sin lanzar error", () => {
    window.localStorage.setItem("broken", "{no json");
    expect(storage.getJSON("broken", [] as string[])).toEqual([]);
  });

  it("guarda y recupera valores", () => {
    storage.setJSON("k", { a: 1 });
    expect(storage.getJSON("k", null)).toEqual({ a: 1 });
    storage.remove("k");
    expect(storage.getString("k")).toBeNull();
  });
});

describe("api helpers", () => {
  it("construye URLs sin barras duplicadas", () => {
    expect(buildApiUrl("/api/me", "http://localhost:8080")).toBe("http://localhost:8080/api/me");
    expect(buildApiUrl("api/me", "")).toBe("/api/me");
  });
});

describe("format", () => {
  it("formatea duraciones y normaliza progreso", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(normalizeProgress(50)).toBe(0.5);
    expect(normalizeProgress(0.25)).toBe(0.25);
    expect(normalizeProgress(250)).toBe(1);
  });

  it("muestra etiquetas en español para ejercicios conocidos", () => {
    expect(exerciseLabel("push_up")).toBe("Flexión");
    expect(exerciseLabel("bench_press")).toBe("bench press");
  });
});
