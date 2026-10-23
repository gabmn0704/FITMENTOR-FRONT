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
