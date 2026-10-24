import { describe, expect, it } from "vitest";
import { analyzePose, coachingCue, POSE } from "./pose";
import type { Point } from "../types";

const pt = (x: number, y: number, visibility = 1): Point => ({ x, y, visibility });

/** 33 landmarks invisibles; solo se activan los que se indican. */
function skeleton(set: Record<number, Point>): Point[] {
  const points = Array.from({ length: 33 }, () => pt(0.5, 0.5, 0));
  for (const [index, point] of Object.entries(set)) points[Number(index)] = point;
  return points;
}

/** Cuerpo de perfil, tumbado, con cabeza a la derecha: hombro, cadera y tobillo en el lado izquierdo. */
function plank(hipY: number): Point[] {
  return skeleton({
    [POSE.leftShoulder]: pt(0.8, 0.5),
    [POSE.leftElbow]: pt(0.8, 0.62),
    [POSE.leftWrist]: pt(0.86, 0.62),
    [POSE.leftHip]: pt(0.55, hipY),
    [POSE.leftKnee]: pt(0.38, 0.58),
    [POSE.leftAnkle]: pt(0.2, 0.6),
  });
}

describe("plancha de perfil", () => {
  it("una línea recta puntúa alto y no genera correcciones", () => {
    const metrics = analyzePose(plank(0.5417), "plank")!;
    expect(metrics.score).toBeGreaterThan(90);
    expect(metrics.issues).toEqual([]);
    expect(coachingCue("plank", metrics)).toMatch(/Buena alineación/);
  });

  it("una cadera caída se corrige con la indicación correcta", () => {
    const metrics = analyzePose(plank(0.64), "plank")!;
    expect(metrics.hipOffset!).toBeGreaterThan(0.05);
    expect(metrics.score).toBeLessThan(85);
    expect(coachingCue("plank", metrics)).toMatch(/Sube la cadera/);
  });

  it("una cadera alta pide bajarla", () => {
    const metrics = analyzePose(plank(0.4), "plank")!;
    expect(metrics.hipOffset!).toBeLessThan(-0.05);
    expect(coachingCue("plank", metrics)).toMatch(/Baja la cadera/);
  });
});

describe("sentadilla de perfil", () => {
  /** Hombro, cadera, rodilla, tobillo y punta del pie del lado izquierdo. */
  const squat = (shoulder: Point, knee: Point, toe: Point): Point[] =>
    skeleton({
      [POSE.leftShoulder]: shoulder,
      [POSE.leftHip]: pt(0.5, 0.55),
      [POSE.leftKnee]: knee,
      [POSE.leftAnkle]: pt(0.5, 0.9),
      31: toe,
    });

  it("mide con el lado que mejor se ve, aunque el otro no aparezca", () => {
    const metrics = analyzePose(squat(pt(0.5, 0.2), pt(0.62, 0.7), pt(0.62, 0.92)), "squat");
    expect(metrics).not.toBeNull();
    expect(metrics!.knee).not.toBeNull();
  });

  it("avisa cuando el torso se inclina demasiado", () => {
    const metrics = analyzePose(squat(pt(0.9, 0.45), pt(0.62, 0.7), pt(0.62, 0.92)), "squat")!;
    expect(metrics.torsoLean!).toBeGreaterThan(55);
    expect(coachingCue("squat", metrics)).toMatch(/Pecho arriba/);
  });

  it("avisa cuando la rodilla se pasa de la punta del pie", () => {
    const metrics = analyzePose(squat(pt(0.52, 0.2), pt(0.78, 0.72), pt(0.62, 0.92)), "squat")!;
    expect(metrics.issues!.join(" ")).toMatch(/rodillas se pasan/);
  });
});

describe("peso muerto", () => {
  it("detecta que la persona se está sentando en vez de llevar la cadera atrás", () => {
    const points = skeleton({
      [POSE.leftShoulder]: pt(0.62, 0.3),
      [POSE.leftHip]: pt(0.5, 0.6),
      [POSE.leftKnee]: pt(0.65, 0.68),
      [POSE.leftAnkle]: pt(0.52, 0.9),
    });
    const metrics = analyzePose(points, "deadlift")!;
    expect(metrics.knee!).toBeLessThan(105);
    expect(coachingCue("deadlift", metrics)).toMatch(/sentándote/);
  });
});

describe("vista frontal", () => {
  it("pide colocarse de perfil porque de frente los ángulos pierden fiabilidad", () => {
    const points = skeleton({
      [POSE.leftShoulder]: pt(0.35, 0.3),
      [POSE.rightShoulder]: pt(0.65, 0.3),
      [POSE.leftHip]: pt(0.4, 0.55),
      [POSE.leftKnee]: pt(0.4, 0.72),
      [POSE.leftAnkle]: pt(0.4, 0.9),
    });
    const metrics = analyzePose(points, "squat")!;
    expect(metrics.issues!.join(" ")).toMatch(/de perfil/);
  });
});
