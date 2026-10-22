import { describe, expect, it } from "vitest";
import { computeLocalStats, weeklyProgress, WEEKLY_GOAL_REPS } from "./stats";
import type { SessionRecord } from "../types";

const now = new Date(2026, 9, 21, 12, 0, 0);
const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

const session = (exercise: string, reps: number, accuracy: number, daysAgo: number): SessionRecord => ({
  localId: `${exercise}-${daysAgo}`,
  exercise: exercise as SessionRecord["exercise"],
  reps,
  accuracy,
  durationSeconds: 60,
  date: at(daysAgo),
  synced: false,
});

describe("computeLocalStats", () => {
  it("agrega totales, precisión media y reparto por ejercicio", () => {
    const stats = computeLocalStats(
      [session("squat", 10, 80, 0), session("squat", 20, 90, 1), session("plank", 30, 70, 2)],
      now,
    );
    expect(stats.totalSessions).toBe(3);
    expect(stats.totalReps).toBe(60);
    expect(stats.avgAccuracy).toBe(80);
    expect(stats.byExercise).toEqual([
      { exercise: "squat", reps: 30, accuracy: 85 },
      { exercise: "plank", reps: 30, accuracy: 70 },
    ]);
    expect(stats.weekly).toHaveLength(7);
    expect(stats.weekly[6].reps).toBe(10);
  });

  it("calcula la racha de días consecutivos hasta hoy", () => {
    const stats = computeLocalStats(
      [session("squat", 5, 80, 0), session("squat", 5, 80, 1), session("squat", 5, 80, 3)],
      now,
    );
    expect(stats.streakDays).toBe(2);
  });

  it("devuelve ceros sin sesiones", () => {
    const stats = computeLocalStats([], now);
    expect(stats.streakDays).toBe(0);
    expect(stats.avgAccuracy).toBe(0);
    expect(weeklyProgress(stats)).toEqual({ reps: 0, percent: 0 });
  });

  it("calcula el progreso frente a la meta semanal", () => {
    const stats = computeLocalStats([session("squat", WEEKLY_GOAL_REPS / 2, 80, 0)], now);
    expect(weeklyProgress(stats).percent).toBe(50);
  });
});
