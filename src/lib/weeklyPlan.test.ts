import { describe, expect, it } from "vitest";
import { buildWeekPlan, expectedWeightKg, todayIndex } from "./weeklyPlan";
import { currentWeek, validateProfile, type BodyProfile } from "./profile";

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

  it("sube la carga en las semanas 1 a 3 y descarga en la 4", () => {
    const reps = (week: number) => buildWeekPlan(profile, "INTERMEDIATE", week).days.find((d) => d.kind === "train")!.items[0].target;
    expect(reps(2)).toBeGreaterThan(reps(1));
    expect(reps(3)).toBeGreaterThanOrEqual(reps(2));
    expect(reps(4)).toBeLessThan(reps(3));
    expect(buildWeekPlan(profile, "INTERMEDIATE", 4).deload).toBe(true);
    expect(reps(5)).toBeGreaterThan(reps(1));
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

  it("la plancha se mide en segundos y el resto en repeticiones", () => {
    const items = buildWeekPlan(profile, "INTERMEDIATE", 1).days.find((d) => d.kind === "train")!.items;
    for (const item of items) expect(item.unit).toBe(item.exercise === "plank" ? "seconds" : "reps");
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
