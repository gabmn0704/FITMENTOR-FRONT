import { describe, expect, it } from "vitest";
import { bmr, mealPlanForDay, nutritionTargets, tdee } from "./nutrition";
import type { BodyProfile } from "./profile";

const base: BodyProfile = {
  goal: "lose_fat",
  weightKg: 80,
  heightCm: 175,
  age: 30,
  sex: "male",
  targetWeightKg: 74,
  weeks: 12,
  daysPerWeek: 4,
  diet: "omnivore",
  startedAt: "2026-10-01T00:00:00.000Z",
};

describe("calorías", () => {
  it("calcula el metabolismo basal con Mifflin-St Jeor", () => {
    expect(bmr(base)).toBe(1749);
    expect(bmr({ ...base, sex: "female" })).toBe(1583);
  });

  it("el gasto total crece con los días de entrenamiento", () => {
    expect(tdee({ ...base, daysPerWeek: 6 })).toBeGreaterThan(tdee({ ...base, daysPerWeek: 3 }));
  });

  it("bajar de peso resta calorías y nunca baja del mínimo seguro", () => {
    const targets = nutritionTargets(base);
    expect(targets.kcal).toBeLessThan(targets.tdee);
    expect(targets.kcal).toBeGreaterThanOrEqual(1500);
    expect(targets.weeklyChangeKg).toBeLessThan(0);

    const extreme = nutritionTargets({ ...base, weightKg: 60, sex: "female", targetWeightKg: 45, weeks: 4 });
    expect(extreme.kcal).toBeGreaterThanOrEqual(1200);
    expect(extreme.notes.join(" ")).toMatch(/demasiado rápido/);
  });

  it("ganar masa suma calorías con un superávit moderado", () => {
    const targets = nutritionTargets({ ...base, goal: "build_muscle", targetWeightKg: 84, weeks: 16 });
    expect(targets.kcal).toBeGreaterThan(targets.tdee);
    expect(targets.kcal).toBeLessThanOrEqual(targets.tdee * 1.25);
  });

  it("los macros suman las calorías (±2 %)", () => {
    const t = nutritionTargets(base);
    const fromMacros = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
    expect(Math.abs(fromMacros - t.kcal) / t.kcal).toBeLessThan(0.02);
    expect(t.proteinG).toBe(160);
  });

  it("el día de descanso lleva menos energía", () => {
    expect(nutritionTargets(base, false).kcal).toBeLessThan(nutritionTargets(base, true).kcal);
  });
});

describe("plan de comidas", () => {
  it("se acerca a las calorías y la proteína del día", () => {
    const day = mealPlanForDay(base, true, 2);
    expect(day.meals).toHaveLength(5);
    expect(Math.abs(day.total.kcal - day.targets.kcal) / day.targets.kcal).toBeLessThan(0.12);
    expect(Math.abs(day.total.proteinG - day.targets.proteinG) / day.targets.proteinG).toBeLessThan(0.12);
  });

  it("el día de descanso no incluye comida post-entreno", () => {
    expect(mealPlanForDay(base, false).meals.map((m) => m.slot)).not.toContain("post");
  });

  it("la dieta vegetariana no incluye carne ni pescado", () => {
    const text = JSON.stringify(mealPlanForDay({ ...base, diet: "vegetarian" }, true, 3).meals).toLowerCase();
    for (const word of ["pollo", "pescado", "atún", "res "]) expect(text).not.toContain(word);
  });

  it("cambia de menú entre días", () => {
    const a = JSON.stringify(mealPlanForDay(base, true, 0).meals);
    const b = JSON.stringify(mealPlanForDay(base, true, 1).meals);
    expect(a).not.toEqual(b);
  });
});

describe("precisión del plan en muchos perfiles", () => {
  const goals = ["lose_fat", "build_muscle", "tone", "endurance", "health"] as const;
  for (const goal of goals) {
    for (const diet of ["omnivore", "vegetarian"] as const) {
      it(`${goal} / ${diet}: cada día queda cerca de la meta`, () => {
        const profile: BodyProfile = {
          ...base,
          goal,
          diet,
          targetWeightKg: goal === "lose_fat" ? 74 : goal === "build_muscle" ? 84 : null,
          weeks: 16,
        };
        for (const training of [true, false]) {
          for (let seed = 0; seed < 7; seed += 1) {
            const day = mealPlanForDay(profile, training, seed);
            expect(Math.abs(day.total.kcal - day.targets.kcal) / day.targets.kcal).toBeLessThan(0.14);
            expect(day.total.proteinG).toBeGreaterThan(day.targets.proteinG * 0.82);
            expect(day.total.proteinG).toBeLessThan(day.targets.proteinG * 1.22);
            expect(Math.abs(day.total.fatG - day.targets.fatG) / day.targets.fatG).toBeLessThan(0.3);
            expect(Math.abs(day.total.carbsG - day.targets.carbsG) / day.targets.carbsG).toBeLessThan(0.3);
          }
        }
      });
    }
  }
});
