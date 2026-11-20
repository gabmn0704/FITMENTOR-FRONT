import { describe, expect, it } from "vitest";
import { LandmarkSmoother, RepCounter } from "./pose";
import type { Point } from "../types";

/** Alimenta ángulos a 25 Hz y devuelve cuántas repeticiones se contaron. */
function run(counter: RepCounter, angles: number[], startMs = 0, stepMs = 40): number {
  let reps = 0;
  angles.forEach((angle, i) => {
    if (counter.update(angle, startMs + i * stepMs).completed) reps++;
  });
  return reps;
}

/** Rampa lineal de `from` a `to` en `n` pasos (sin incluir `from`). */
const ramp = (from: number, to: number, n: number) => Array.from({ length: n }, (_, i) => from + ((to - from) * (i + 1)) / n);

describe("RepCounter (sentadilla)", () => {
  it("cuenta una repetición completa", () => {
    const counter = new RepCounter("squat");
    const angles = [170, ...ramp(170, 90, 15), ...ramp(90, 170, 15)];
    expect(run(counter, angles)).toBe(1);
    expect(counter.phase).toBe("up");
  });

  it("cuenta varias repeticiones seguidas, una por ciclo", () => {
    const counter = new RepCounter("squat");
    const cycle = [...ramp(170, 90, 15), ...ramp(90, 170, 15)];
    expect(run(counter, [170, ...cycle, ...cycle, ...cycle])).toBe(3);
  });

  it("no cuenta doble con ruido alrededor del umbral de salida", () => {
    const counter = new RepCounter("squat");
    // Sube y oscila entre 135 y 150 (zona de histéresis): no debe volver a contar.
    const jitter = [141, 138, 144, 136, 146, 139, 148, 137, 150, 140];
    expect(run(counter, [170, ...ramp(170, 90, 15), ...ramp(90, 142, 10), ...jitter])).toBe(1);
  });

  it("cuenta antes de extender del todo (a tiempo)", () => {
    const counter = new RepCounter("squat");
    let completedAtAngle = 0;
    const angles = [170, ...ramp(170, 90, 15), ...ramp(90, 175, 20)];
    angles.forEach((a, i) => {
      if (counter.update(a, i * 40).completed) completedAtAngle = a;
    });
    expect(completedAtAngle).toBeGreaterThan(139);
    expect(completedAtAngle).toBeLessThan(160);
  });

  it("ignora una bajada a medias que no llega al fondo", () => {
    const counter = new RepCounter("squat");
    expect(run(counter, [170, ...ramp(170, 118, 10), ...ramp(118, 170, 10)])).toBe(0);
    // Y la siguiente repetición completa sí cuenta.
    expect(run(counter, [...ramp(170, 90, 15), ...ramp(90, 170, 15)], 2000)).toBe(1);
  });

  it("rechaza ciclos más rápidos que la duración mínima (ruido)", () => {
    const counter = new RepCounter("squat", 500);
    const updates = [170, 120, 100, 150].map((a, i) => counter.update(a, i * 20));
    expect(updates.some((u) => u.completed)).toBe(false);
    expect(updates.some((u) => u.rejected)).toBe(true);
  });

  it("arranca a contar aunque la persona empiece algo flexionada (145°)", () => {
    const counter = new RepCounter("squat");
    expect(run(counter, [145, 146, ...ramp(146, 90, 15), ...ramp(90, 170, 15)])).toBe(1);
  });

  it("reset vuelve a la fase inicial", () => {
    const counter = new RepCounter("squat");
    run(counter, [170, 120]);
    counter.reset();
    expect(counter.phase).toBe("ready");
  });
});

describe("RepCounter (flexión y plancha)", () => {
  it("cuenta una flexión por codo", () => {
    const counter = new RepCounter("push_up");
    expect(run(counter, [165, ...ramp(165, 80, 14), ...ramp(80, 165, 14)])).toBe(1);
  });

  it("la plancha nunca cuenta repeticiones", () => {
    const counter = new RepCounter("plank");
    expect(run(counter, [170, 90, 170, 90, 170])).toBe(0);
  });
});

describe("LandmarkSmoother", () => {
  const pts = (x: number, y: number): Point[] => [{ x, y, visibility: 1 }];

  it("devuelve la primera muestra sin cambios", () => {
    expect(new LandmarkSmoother().smooth(pts(0.5, 0.5))[0]).toMatchObject({ x: 0.5, y: 0.5 });
  });

  it("amortigua el temblor pequeño", () => {
    const smoother = new LandmarkSmoother();
    smoother.smooth(pts(0.5, 0.5));
    const out = smoother.smooth(pts(0.504, 0.5))[0]!;
    expect(out.x).toBeGreaterThan(0.5);
    expect(out.x).toBeLessThan(0.504);
  });

  it("sigue casi sin retraso un movimiento rápido", () => {
    const smoother = new LandmarkSmoother();
    smoother.smooth(pts(0.2, 0.5));
    const out = smoother.smooth(pts(0.5, 0.5))[0]!;
    expect(out.x).toBeCloseTo(0.5, 2);
  });

  it("reinicia ante una detección vacía", () => {
    const smoother = new LandmarkSmoother();
    smoother.smooth(pts(0.2, 0.2));
    expect(smoother.smooth([])).toEqual([]);
    expect(smoother.smooth(pts(0.9, 0.9))[0]).toMatchObject({ x: 0.9 });
  });
});
