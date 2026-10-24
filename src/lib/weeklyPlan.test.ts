import { describe, expect, it } from "vitest";
import { buildWeekPlan, expectedWeightKg, todayIndex } from "./weeklyPlan";
import { currentWeek, validateProfile, type BodyProfile, type FitnessGoal } from "./profile";
import { CATALOG, CATALOG_LIST } from "./catalog";

const profile: BodyProfile = {
  goal: "build_muscle",
  weightKg: 70,
  heightCm: 172,
  age: 25,
  sex: "female",
  targetWeightKg: 74,
  weeks: 16,
  daysPerWeek: 4,
  diet: "omnivore",
  startedAt: "2026-10-05T00:00:00.000Z",
};

describe("rutina semanal", () => {
  it("reparte exactamente los días de entrenamiento elegidos", () => {
    for (const days of [3, 4, 5, 6] as const) {
      const plan = buildWeekPlan({ ...profile, daysPerWeek: days }, "INTERMEDIATE", 1);
      expect(plan.days).toHaveLength(7);
      expect(plan.days.filter((d) => d.kind === "train")).toHaveLength(days);
      expect(plan.days.filter((d) => d.kind === "rest").every((d) => d.items.length === 0)).toBe(true);
    }
  });

  it("sube la carga semana a semana y descarga en la 4", () => {
    // Las variantes alternan cada semana, así que se comparan semanas con la misma variante (1 y 3, 2 y 4, 1 y 5).
    const volume = (week: number) =>
      buildWeekPlan(profile, "INTERMEDIATE", week).days.flatMap((d) => d.items).reduce((sum, item) => sum + item.sets * item.target, 0);
    expect(volume(3)).toBeGreaterThan(volume(1));
    expect(volume(4)).toBeLessThan(volume(2));
    expect(volume(5)).toBeGreaterThan(volume(1));
    expect(buildWeekPlan(profile, "INTERMEDIATE", 4).deload).toBe(true);
  });

  it("el nivel cambia las series", () => {
    const sets = (level: "BEGINNER" | "ADVANCED") => buildWeekPlan(profile, level, 1).days.find((d) => d.kind === "train")!.items[0].sets;
    expect(sets("ADVANCED")).toBeGreaterThan(sets("BEGINNER"));
  });

  it("bajar de peso descansa menos que ganar masa", () => {
    const rest = (goal: BodyProfile["goal"]) =>
      buildWeekPlan({ ...profile, goal, targetWeightKg: null }, "INTERMEDIATE", 1).days.find((d) => d.kind === "train")!.items[0].restSec;
    expect(rest("lose_fat")).toBeLessThan(rest("build_muscle"));
  });

  it("cada ejercicio usa la unidad de su catálogo", () => {
    for (const day of buildWeekPlan(profile, "INTERMEDIATE", 1).days) {
      for (const item of day.items) expect(item.unit).toBe(CATALOG[item.exercise].unit);
    }
  });
});

describe("semana y peso esperado", () => {
  it("cuenta la semana desde el inicio del plan", () => {
    expect(currentWeek(profile, new Date("2026-10-05T10:00:00Z"))).toBe(1);
    expect(currentWeek(profile, new Date("2026-10-12T10:00:00Z"))).toBe(2);
    expect(currentWeek(profile, new Date("2026-12-31T10:00:00Z"))).toBeGreaterThan(8);
  });

  it("el peso esperado avanza hacia la meta sin pasarse", () => {
    expect(expectedWeightKg(profile, 1)).toBeGreaterThan(70);
    expect(expectedWeightKg(profile, 52)).toBeLessThanOrEqual(74);
  });

  it("lunes es 0 y domingo es 6", () => {
    expect(todayIndex(new Date("2026-10-26T12:00:00"))).toBe(0);
    expect(todayIndex(new Date("2026-11-01T12:00:00"))).toBe(6);
  });
});

describe("validación del perfil", () => {
  it("acepta un perfil correcto y rechaza metas incoherentes", () => {
    expect(validateProfile(profile)).toEqual({});
    expect(validateProfile({ ...profile, goal: "lose_fat", targetWeightKg: 80 }).targetWeightKg).toBeDefined();
    expect(validateProfile({ ...profile, weightKg: 10 }).weightKg).toBeDefined();
    expect(validateProfile({ ...profile, weeks: 1 }).weeks).toBeDefined();
  });
});

describe("variedad de ejercicios", () => {
  const goals: FitnessGoal[] = ["lose_fat", "build_muscle", "tone", "endurance", "health"];
  const used = (goal: FitnessGoal, level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" = "INTERMEDIATE") => {
    const ids = new Set<string>();
    for (let week = 1; week <= 4; week += 1) {
      for (const day of buildWeekPlan({ ...profile, goal, daysPerWeek: 5, targetWeightKg: null }, level, week).days) {
        day.items.forEach((item) => ids.add(item.exercise));
      }
    }
    return ids;
  };

  it("cada objetivo usa un repertorio amplio y distinto", () => {
    for (const goal of goals) expect(used(goal).size).toBeGreaterThanOrEqual(12);
    const lose = [...used("lose_fat")].sort().join();
    const build = [...used("build_muscle")].sort().join();
    const endurance = [...used("endurance")].sort().join();
    expect(lose).not.toEqual(build);
    expect(build).not.toEqual(endurance);
    expect(used("build_muscle").has("bulgarian_split_squat")).toBe(true);
    expect(used("lose_fat").has("burpee")).toBe(true);
    expect(used("build_muscle").has("burpee")).toBe(false);
  });

  it("alterna la sesión entre semanas y dentro de la misma semana", () => {
    const names = (week: number) => buildWeekPlan({ ...profile, daysPerWeek: 5 }, "INTERMEDIATE", week).days.filter((d) => d.kind === "train").map((d) => d.items.map((i) => i.exercise).join());
    expect(names(1)).not.toEqual(names(2));
    const week1 = names(1);
    expect(week1[0]).not.toEqual(week1[4]);
  });

  it("no repite un ejercicio dentro de una sesión y todos existen en el catálogo", () => {
    for (const goal of goals) {
      for (const level of ["BEGINNER", "ADVANCED"] as const) {
        for (let week = 1; week <= 4; week += 1) {
          for (const day of buildWeekPlan({ ...profile, goal, daysPerWeek: 6, targetWeightKg: null }, level, week).days) {
            const ids = day.items.map((item) => item.exercise);
            expect(new Set(ids).size).toBe(ids.length);
            ids.forEach((id) => expect(CATALOG[id]).toBeDefined());
          }
        }
      }
    }
  });

  it("quien empieza no recibe burpees ni flexiones diamante", () => {
    for (const goal of goals) {
      const ids = used(goal, "BEGINNER");
      expect(ids.has("burpee")).toBe(false);
      expect(ids.has("diamond_push_up")).toBe(false);
    }
  });

  it("los ejercicios con cámara apuntan a un detector real y los demás se marcan por series", () => {
    expect(CATALOG_LIST.length).toBeGreaterThanOrEqual(28);
    for (const entry of CATALOG_LIST) {
      if (entry.engine) expect(["squat", "push_up", "plank", "deadlift", "lunge"]).toContain(entry.engine);
    }
    const items = buildWeekPlan(profile, "INTERMEDIATE", 1).days.flatMap((d) => d.items);
    expect(items.some((item) => item.engine)).toBe(true);
    expect(items.some((item) => !item.engine)).toBe(true);
  });
});
