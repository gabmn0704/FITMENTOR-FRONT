import { describe, expect, it } from "vitest";
import { localCoachAnswer } from "./coachLocal";

describe("localCoachAnswer", () => {
  it("prioriza el dolor sobre cualquier otro tema", () => {
    expect(localCoachAnswer("quiero una rutina pero me duele la rodilla")).toMatch(/profesional de la salud/);
  });

  it("responde rutinas, calentamiento y nutrición", () => {
    expect(localCoachAnswer("Dame una rutina corta de 15 minutos")).toMatch(/3 rondas/);
    expect(localCoachAnswer("¿Cómo caliento?")).toMatch(/5 a 8 minutos/);
    expect(localCoachAnswer("¿Cuánta proteína necesito?")).toMatch(/no es consejo médico/);
  });

  it("nunca devuelve texto vacío ante una pregunta desconocida", () => {
    expect(localCoachAnswer("¿Quién ganó el mundial?").length).toBeGreaterThan(40);
  });
});

describe("coach con perfil", () => {
  const profile = { goal: "lose_fat", weightKg: 78, heightCm: 168, weeks: 16, week: 2, daysPerWeek: 4, diet: "omnivore", kcal: 1715, proteinG: 156 } as const;

  it("abre las preguntas de alimentación con las metas de la persona", () => {
    expect(localCoachAnswer("¿Cuánta proteína necesito?", profile)).toMatch(/^Según tu plan, apunta a unas 1715 kcal y unos 156 g/);
    expect(localCoachAnswer("¿Cuánta proteína necesito?")).not.toMatch(/Según tu plan/);
  });

  it("el dolor sigue mandando aunque haya perfil", () => {
    expect(localCoachAnswer("me duele la rodilla y quiero comer menos", profile)).toMatch(/profesional de la salud/);
  });
});
