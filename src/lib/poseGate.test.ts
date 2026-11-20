import { describe, expect, it } from "vitest";
import { checkFraming, FramingGate, START_POSTURE } from "./poseGate";
import { POSE } from "./pose";
import type { Point } from "../types";

const pt = (x: number, y: number, visibility = 0.95): Point => ({ x, y, visibility });

/** 33 landmarks invisibles; solo se activan los indicados. */
function skeleton(set: Record<number, Point>): Point[] {
  const points = Array.from({ length: 33 }, () => pt(0.5, 0.5, 0));
  for (const [index, point] of Object.entries(set)) points[Number(index)] = point;
  return points;
}

/** Persona de pie, de perfil, con cabeza visible. */
const standing = (): Point[] =>
  skeleton({
    0: pt(0.5, 0.1),
    [POSE.leftShoulder]: pt(0.5, 0.25),
    [POSE.leftHip]: pt(0.5, 0.55),
    [POSE.leftKnee]: pt(0.5, 0.78),
    [POSE.leftAnkle]: pt(0.5, 0.95),
  });

describe("checkFraming", () => {
  it("una pose de pie correcta es válida para la sentadilla", () => {
    expect(checkFraming(standing(), "squat")).toMatchObject({ ok: true, code: "ok" });
  });

  it("detecta sentado y lo dice con el nombre del ejercicio", () => {
    const seated = skeleton({
      0: pt(0.5, 0.12),
      [POSE.leftShoulder]: pt(0.5, 0.3),
      [POSE.leftHip]: pt(0.5, 0.6),
      [POSE.leftKnee]: pt(0.72, 0.62),
      [POSE.leftAnkle]: pt(0.72, 0.92),
    });
    const r = checkFraming(seated, "squat");
    expect(r.code).toBe("seated");
    expect(r.message).toBe("Estás sentado: ponte de pie para empezar la sentadilla.");
  });

  it("no marca sentado una vez que la serie arrancó (fondo de la sentadilla)", () => {
    const bottom = skeleton({
      0: pt(0.5, 0.12),
      [POSE.leftShoulder]: pt(0.5, 0.3),
      [POSE.leftHip]: pt(0.5, 0.6),
      [POSE.leftKnee]: pt(0.72, 0.62),
      [POSE.leftAnkle]: pt(0.72, 0.92),
    });
    expect(checkFraming(bottom, "squat", { armed: true }).ok).toBe(true);
  });

  it("detecta persona no visible", () => {
    expect(checkFraming(skeleton({}), "squat").code).toBe("no_person");
    expect(checkFraming([], "squat").code).toBe("no_person");
  });

  it("detecta cuerpo parcial (sin piernas)", () => {
    const upper = skeleton({
      0: pt(0.5, 0.2),
      [POSE.leftShoulder]: pt(0.5, 0.4),
      [POSE.rightShoulder]: pt(0.6, 0.4),
      [POSE.leftHip]: pt(0.5, 0.8),
      [POSE.rightHip]: pt(0.6, 0.8),
    });
    const r = checkFraming(upper, "squat");
    expect(r.code).toBe("partial");
    expect(r.message).toContain("aléjate");
  });

  it("detecta demasiado cerca", () => {
    const close = skeleton({
      0: pt(0.5, 0.0),
      [POSE.leftShoulder]: pt(0.5, 0.02),
      [POSE.leftHip]: pt(0.5, 0.5),
      [POSE.leftKnee]: pt(0.5, 0.75),
      [POSE.leftAnkle]: pt(0.5, 0.99),
    });
    expect(checkFraming(close, "squat").code).toBe("too_close");
  });

  it("detecta demasiado lejos", () => {
    const far = skeleton({
      0: pt(0.5, 0.4),
      [POSE.leftShoulder]: pt(0.5, 0.45),
      [POSE.leftHip]: pt(0.5, 0.52),
      [POSE.leftKnee]: pt(0.5, 0.58),
      [POSE.leftAnkle]: pt(0.5, 0.64),
    });
    expect(checkFraming(far, "squat").code).toBe("too_far");
  });

  it("detecta poca confianza (poca luz)", () => {
    const dim = standing().map((p) => (p.visibility! > 0 ? { ...p, visibility: 0.4 } : p));
    expect(checkFraming(dim, "squat").code).toBe("low_confidence");
  });

  it("detecta de espaldas (sin cara visible)", () => {
    const back = standing();
    back[0] = pt(0.5, 0.1, 0.05);
    back[POSE.rightShoulder] = pt(0.64, 0.25);
    back[POSE.rightHip] = pt(0.6, 0.55);
    back[POSE.rightKnee] = pt(0.6, 0.78);
    back[POSE.rightAnkle] = pt(0.6, 0.95);
    expect(checkFraming(back, "squat").code).toBe("back_turned");
  });

  it("tumbado cuando el ejercicio es de pie", () => {
    const lying = skeleton({
      0: pt(0.9, 0.5),
      [POSE.leftShoulder]: pt(0.8, 0.5),
      [POSE.leftHip]: pt(0.5, 0.52),
      [POSE.leftKnee]: pt(0.3, 0.52),
      [POSE.leftAnkle]: pt(0.1, 0.52),
    });
    expect(checkFraming(lying, "squat").code).toBe("lying");
    // En plancha esa misma pose es la postura esperada.
    expect(checkFraming(lying, "plank").ok).toBe(true);
  });

  it("de pie cuando el ejercicio es en el suelo pide la posición de plancha", () => {
    expect(checkFraming(standing(), "push_up").code).toBe("not_on_floor");
  });

  it("cada ejercicio declara su postura inicial", () => {
    expect(START_POSTURE).toEqual({
      squat: "standing",
      lunge: "standing",
      deadlift: "standing",
      push_up: "floor",
      plank: "floor",
    });
  });
});

describe("FramingGate", () => {
  const seated = checkFraming(
    skeleton({
      0: pt(0.5, 0.12),
      [POSE.leftShoulder]: pt(0.5, 0.3),
      [POSE.leftHip]: pt(0.5, 0.6),
      [POSE.leftKnee]: pt(0.72, 0.62),
      [POSE.leftAnkle]: pt(0.72, 0.92),
    }),
    "squat",
  );
  const good = checkFraming(standing(), "squat");

  it("no repite el mensaje en cada frame", () => {
    const gate = new FramingGate();
    let spoken = 0;
    let changes = 0;
    // 6 segundos a 60 fps con el mismo problema.
    for (let t = 0; t < 6000; t += 16) {
      const u = gate.update(seated, t);
      if (u.speak) spoken++;
      if (u.changed) changes++;
    }
    expect(changes).toBe(1);
    expect(spoken).toBe(1);
  });

  it("vuelve a recordar tras el enfriamiento, pero no antes", () => {
    const gate = new FramingGate();
    let spoken = 0;
    for (let t = 0; t < 25_000; t += 16) if (gate.update(seated, t).speak) spoken++;
    expect(spoken).toBeGreaterThanOrEqual(2);
    expect(spoken).toBeLessThanOrEqual(3);
  });

  it("un frame ruidoso aislado no bloquea ni habla", () => {
    const gate = new FramingGate();
    let blocked = false;
    let spoken = 0;
    for (let t = 0; t < 2000; t += 16) {
      const u = gate.update(t === 800 ? seated : good, t);
      blocked ||= u.blocked;
      if (u.speak) spoken++;
    }
    expect(blocked).toBe(false);
    expect(spoken).toBe(0);
  });

  it("se desbloquea al corregir la postura", () => {
    const gate = new FramingGate();
    for (let t = 0; t < 1000; t += 16) gate.update(seated, t);
    expect(gate.update(seated, 1000).blocked).toBe(true);
    let last = gate.update(good, 1016);
    for (let t = 1032; t < 1400; t += 16) last = gate.update(good, t);
    expect(last.blocked).toBe(false);
    expect(last.message).toBe("");
  });
});
