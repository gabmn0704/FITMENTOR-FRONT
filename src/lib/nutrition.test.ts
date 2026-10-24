import { describe, expect, it } from "vitest";
import { mealPlanForDay } from "./meals";
import { bmr, nutritionTargets, tdee } from "./nutrition";
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
            expect(day.total.proteinG).toBeGreaterThan(day.targets.proteinG * 0.75);
            expect(day.total.proteinG).toBeLessThan(day.targets.proteinG * 1.28);
            expect(Math.abs(day.total.fatG - day.targets.fatG) / day.targets.fatG).toBeLessThan(0.45);
            expect(Math.abs(day.total.carbsG - day.targets.carbsG) / day.targets.carbsG).toBeLessThan(0.45);
          }
        }
      });
    }
  }
});

describe("variedad, exclusiones y alternativas", () => {
  const dishes = (profile: BodyProfile, slot: "almuerzo" | "cena", days = 14) =>
    Array.from({ length: days }, (_, day) => mealPlanForDay(profile, true, day).meals.find((meal) => meal.slot === slot)!);

  it("cada comida lleva el nombre de un plato", () => {
    for (const meal of mealPlanForDay(base, true, 2).meals) expect(meal.dish.length).toBeGreaterThan(5);
  });

  it("los almuerzos y cenas de dos semanas no se repiten a diario y el pescado es la excepción", () => {
    const meals = [...dishes(base, "almuerzo"), ...dishes(base, "cena")];
    const names = meals.map((meal) => meal.dish);
    expect(new Set(names).size).toBeGreaterThanOrEqual(18);
    const fish = names.filter((name) => /pescado|atún|camarones|sardinas/i.test(name)).length;
    expect(fish).toBeLessThanOrEqual(5);
    for (let i = 1; i < names.length; i += 1) expect(names[i]).not.toEqual(names[i - 1]);
  });

  it("la semana siguiente no repite los menús de la anterior", () => {
    const week1 = Array.from({ length: 7 }, (_, d) => mealPlanForDay(base, true, d).meals.map((m) => m.dish).join("|"));
    const week2 = Array.from({ length: 7 }, (_, d) => mealPlanForDay(base, true, d + 7).meals.map((m) => m.dish).join("|"));
    expect(week2.filter((menu) => week1.includes(menu))).toHaveLength(0);
  });

  it("quien no come pescado, lácteos, huevo, gluten o cerdo no los recibe nunca", () => {
    const banned: Record<string, RegExp> = {
      fish: /pescado|atún|camaron|sardina/i,
      dairy: /yogur|cottage|queso|leche/i,
      eggs: /huevo|claras/i,
      gluten: /pan integral|pasta|avena/i,
      pork: /cerdo/i,
    };
    for (const [avoid, pattern] of Object.entries(banned)) {
      const profile = { ...base, avoid: [avoid as "fish"] };
      for (let day = 0; day < 14; day += 1) {
        for (const training of [true, false]) {
          const text = JSON.stringify(mealPlanForDay(profile, training, day).meals);
          expect(text).not.toMatch(pattern);
        }
      }
    }
  });

  it("una persona vegetariana que además evita lácteos y huevo igual recibe menús completos", () => {
    const profile: BodyProfile = { ...base, diet: "vegetarian", avoid: ["dairy", "eggs", "gluten"] };
    for (let day = 0; day < 7; day += 1) {
      const plan = mealPlanForDay(profile, true, day);
      expect(plan.meals).toHaveLength(5);
      for (const meal of plan.meals) expect(meal.items.length).toBeGreaterThan(0);
      expect(plan.total.proteinG).toBeGreaterThan(plan.targets.proteinG * 0.6);
    }
  });

  it("ofrece alternativas con la misma proteína o los mismos carbohidratos, de otro alimento", () => {
    const lunch = mealPlanForDay(base, true, 2).meals.find((meal) => meal.slot === "almuerzo")!;
    const withSwaps = lunch.items.filter((item) => item.swaps.length > 0);
    expect(withSwaps.length).toBeGreaterThanOrEqual(2);
    for (const item of withSwaps) {
      expect(item.swaps.length).toBeLessThanOrEqual(3);
      expect(new Set(item.swaps).size).toBe(item.swaps.length);
      for (const swap of item.swaps) expect(swap.toLowerCase()).not.toContain(item.name.toLowerCase());
    }
  });

  it("solo usa alimentos de la mesa colombiana: nada de tofu, pita, tempeh, soya, cuscús, quinua ni cottage", () => {
    for (const diet of ["omnivore", "vegetarian"] as const) {
      for (const goal of ["lose_fat", "build_muscle", "tone", "endurance", "health"] as const) {
        const profile: BodyProfile = { ...base, diet, goal, targetWeightKg: goal === "lose_fat" ? 74 : goal === "build_muscle" ? 84 : null };
        for (let day = 0; day < 14; day += 1) {
          const text = JSON.stringify(mealPlanForDay(profile, true, day).meals);
          expect(text).not.toMatch(/tofu|tempeh|soya|pita|cuscús|quinoa|quinua|cottage|camarones|pavo|nueces|chía|kiwi/i);
        }
      }
    }
  });

  it("la mesa colombiana aparece de verdad: arepa, frijoles, papa criolla, plátano, aguacate, guayaba", () => {
    const text = Array.from({ length: 28 }, (_, day) => JSON.stringify(mealPlanForDay(base, true, day).meals)).join(" ").toLowerCase();
    for (const word of ["arepa", "frijoles", "papa criolla", "plátano maduro", "aguacate", "guayaba", "queso campesino"]) {
      expect(text).toContain(word);
    }
  });

  it("las cantidades se leen natural: sin repetir el alimento después de «2 huevos»", () => {
    for (let day = 0; day < 14; day += 1) {
      for (const meal of mealPlanForDay(base, true, day).meals) {
        for (const item of meal.items) {
          const phrase = `${item.amount} ${item.label}`.toLowerCase();
          expect(phrase).not.toMatch(/huevos?.*de huevo/);
          expect(phrase).not.toMatch(/arepas? .*de arepa/);
          for (const swap of item.swaps) expect(swap.toLowerCase()).not.toMatch(/huevos?.*de huevo|arepas? .*de arepa|banano.*de banano/);
        }
      }
    }
  });
});
