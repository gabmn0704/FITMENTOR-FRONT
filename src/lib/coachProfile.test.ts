import { describe, expect, it } from "vitest";
import { coachProfilePayload, coachSuggestions, coachWelcome } from "./coachProfile";
import type { BodyProfile } from "./profile";

const profile: BodyProfile = {
  goal: "lose_fat",
  weightKg: 78,
  heightCm: 168,
  age: 29,
  sex: "female",
  targetWeightKg: 68,
  weeks: 16,
  daysPerWeek: 4,
  diet: "omnivore",
  startedAt: "2026-10-05T00:00:00.000Z",
};

describe("perfil para el coach", () => {
  it("lleva solo enumeraciones y números, con las metas calculadas", () => {
    const payload = coachProfilePayload(profile, new Date("2026-10-13T10:00:00Z"));
    expect(payload).toMatchObject({ goal: "lose_fat", weightKg: 78, week: 2, weeks: 16, daysPerWeek: 4, diet: "omnivore", sex: "female" });
    expect(payload.kcal).toBeGreaterThan(1200);
    expect(payload.proteinG).toBe(156);
    expect(Object.values(payload).every((value) => typeof value === "number" || ["lose_fat", "female", "omnivore"].includes(value as string))).toBe(true);
  });

  it("omite lo que la persona no quiso decir", () => {
    const payload = coachProfilePayload({ ...profile, age: null, sex: null, targetWeightKg: null });
    expect(payload).not.toHaveProperty("age");
    expect(payload).not.toHaveProperty("sex");
    expect(payload).not.toHaveProperty("targetWeightKg");
  });

  it("las sugerencias y el saludo siguen el objetivo", () => {
    expect(coachSuggestions("lose_fat")[0]).toMatch(/cen/);
    expect(coachSuggestions(undefined)).toHaveLength(4);
    expect(coachWelcome("Valeria Montoya", "build_muscle")).toMatch(/^Hola, Valeria\..*masa muscular/);
    expect(coachWelcome(undefined, undefined)).toMatch(/^Hola\./);
  });
});
