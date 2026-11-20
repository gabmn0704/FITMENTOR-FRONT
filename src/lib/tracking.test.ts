import { beforeEach, describe, expect, it } from "vitest";
import { addWeight, dateKey, glassesFor, mondayOf, readDayLog, readWeights, setWater, toggleMeal, weekToIcs, weeklyRate } from "./tracking";
import { buildWeekPlan } from "./weeklyPlan";
import type { BodyProfile } from "./profile";

const profile: BodyProfile = {
  goal: "lose_fat",
  weightKg: 80,
  heightCm: 175,
  age: 30,
  sex: "male",
  targetWeightKg: 74,
  weeks: 12,
  daysPerWeek: 4,
  diet: "omnivore",
  startedAt: "2026-11-02T00:00:00.000Z",
};

describe("registro diario", () => {
  beforeEach(() => window.localStorage.clear());

  it("marca y desmarca comidas por día y por usuario", () => {
    expect(toggleMeal("2026-11-19", "breakfast", "u1").meals).toEqual(["breakfast"]);
    expect(readDayLog("2026-11-19", "u2").meals).toEqual([]);
    expect(toggleMeal("2026-11-19", "breakfast", "u1").meals).toEqual([]);
  });

  it("acota los vasos de agua", () => {
    expect(setWater("2026-11-19", 50).water).toBe(20);
    expect(setWater("2026-11-19", -3).water).toBe(0);
    expect(glassesFor(2.5)).toBe(10);
  });

  it("guarda un pesaje por día y calcula el ritmo semanal", () => {
    addWeight(80, "2026-11-01");
    addWeight(79.4, "2026-11-08");
    addWeight(79, "2026-11-08");
    expect(readWeights()).toHaveLength(2);
    expect(weeklyRate(readWeights())).toBe(-1);
    expect(addWeight(9999, "2026-11-09")).toHaveLength(2);
  });

  it("usa la fecha local y el lunes de la semana", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(dateKey(mondayOf(new Date(2026, 10, 19)))).toBe("2026-11-16");
  });
});

describe("exportar al calendario", () => {
  it("crea un evento por cada día de entrenamiento", () => {
    const plan = buildWeekPlan(profile, "BEGINNER", 3);
    const ics = weekToIcs(plan, new Date(2026, 10, 16), (id) => String(id), 7, new Date(2026, 10, 19));
    const events = ics.match(/BEGIN:VEVENT/g) ?? [];
    expect(events).toHaveLength(plan.days.filter((d) => d.kind === "train").length);
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics).toMatch(/DTSTART:2026111[6-9]T070000|DTSTART:2026112[0-2]T070000/);
    expect(ics).toContain("TRIGGER:-PT30M");
  });
});
