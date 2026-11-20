import { beforeEach, describe, expect, it } from "vitest";
import {
  BADGES,
  challengeProgress,
  clampGoal,
  dailyChallenges,
  levelFromXp,
  quoteOfTheDay,
  readEngagement,
  sessionsThisWeek,
  syncEngagement,
  unlockedBadgeIds,
  weekDays,
  weeklyGoalProgress,
} from "./engagement";
import { MASCOT_PHRASES, MASCOT_STATES, mascotPhrase } from "./mascot";
import type { SessionRecord } from "../types";

// Miércoles 18 de noviembre de 2026, mediodía local.
const NOW = new Date(2026, 10, 18, 12, 0, 0);

function session(daysAgo: number, reps = 10, accuracy = 80, exercise = "squat"): SessionRecord {
  const date = new Date(NOW.getTime() - daysAgo * 86_400_000);
  return { exercise, reps, accuracy, durationSeconds: 60, date: date.toISOString(), localId: `${daysAgo}-${reps}-${exercise}`, synced: true } as SessionRecord;
}

describe("meta semanal", () => {
  it("cuenta solo las sesiones desde el lunes", () => {
    // Hoy (mié) y ayer (mar) cuentan; hace 3 días fue domingo de la semana anterior.
    expect(sessionsThisWeek([session(0), session(1), session(3)], NOW)).toBe(2);
  });

  it("calcula porcentaje y tope", () => {
    const sessions = [session(0), session(1), session(2)];
    expect(weeklyGoalProgress(sessions, 4, NOW)).toMatchObject({ done: 3, percent: 75, reached: false });
    expect(weeklyGoalProgress(sessions, 2, NOW)).toMatchObject({ percent: 100, reached: true });
  });

  it("limita la meta a 1-7", () => {
    expect(clampGoal(0)).toBe(1);
    expect(clampGoal(12)).toBe(7);
  });

  it("marca los días activos de lunes a domingo", () => {
    const days = weekDays([session(0), session(2)], NOW);
    expect(days.map((d) => d.label).join("")).toBe("LMXJVSD");
    expect(days.filter((d) => d.active)).toHaveLength(2);
    expect(days[2].today).toBe(true);
    expect(days[3].future).toBe(true);
  });
});

describe("retos diarios", () => {
  it("son tres, distintos y estables en el mismo día", () => {
    const first = dailyChallenges(NOW);
    expect(first).toHaveLength(3);
    expect(new Set(first.map((c) => c.id)).size).toBe(3);
    expect(dailyChallenges(NOW)).toEqual(first);
  });

  it("miden el avance con las sesiones de hoy", () => {
    const challenge = { id: "t", title: "t", metric: "reps" as const, target: 20, xp: 10 };
    expect(challengeProgress(challenge, [session(0, 8)])).toMatchObject({ value: 8, done: false, percent: 40 });
    expect(challengeProgress(challenge, [session(0, 12), session(0, 12)])).toMatchObject({ value: 20, done: true });
  });
});

describe("nivel y medallas", () => {
  it("sube de nivel con la experiencia", () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, percent: 0 });
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(450).level).toBe(3);
  });

  it("desbloquea medallas según el contexto", () => {
    expect(unlockedBadgeIds({ sessions: [], streakDays: 0, challengesDone: 0 })).toEqual([]);
    const ids = unlockedBadgeIds({ sessions: [session(0, 120, 95)], streakDays: 3, challengesDone: 0 });
    expect(ids).toEqual(expect.arrayContaining(["first-rep", "streak-3", "reps-100", "precision"]));
    expect(ids).not.toContain("streak-7");
    expect(BADGES.length).toBeGreaterThanOrEqual(8);
  });
});

describe("sincronización por usuario", () => {
  beforeEach(() => window.localStorage.clear());

  it("celebra una sola vez cada logro y lo guarda", () => {
    const sessions = [session(0, 60, 95)];
    const first = syncEngagement("u1", sessions, 1, NOW);
    expect(first.newBadges.map((b) => b.id)).toContain("first-rep");
    const second = syncEngagement("u1", sessions, 1, NOW);
    expect(second.newBadges).toHaveLength(0);
    expect(second.newlyCompleted).toHaveLength(0);
    expect(readEngagement("u1").unlocked["first-rep"]).toBeTruthy();
  });

  it("no mezcla usuarios", () => {
    syncEngagement("u1", [session(0)], 1, NOW);
    expect(readEngagement("u2").unlocked).toEqual({});
  });
});

describe("frases", () => {
  it("la frase del día es estable por día y usuario", () => {
    expect(quoteOfTheDay(NOW, "a")).toBe(quoteOfTheDay(NOW, "a"));
  });

  it("la mascota tiene frases para cada estado", () => {
    for (const state of MASCOT_STATES) {
      expect(MASCOT_PHRASES[state].length).toBeGreaterThanOrEqual(3);
      expect(mascotPhrase(state, 1)).toBe(MASCOT_PHRASES[state][1]);
    }
  });
});
