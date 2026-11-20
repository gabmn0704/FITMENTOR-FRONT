import { useCallback, useMemo, useState } from "react";
import {
  BADGES,
  challengeProgress,
  clampGoal,
  dailyChallenges,
  dayKey,
  levelFromXp,
  readEngagement,
  sessionsOn,
  totalXp,
  weekDays,
  weeklyGoalProgress,
  writeEngagement,
  type EngagementState,
} from "../../lib/engagement";
import { readLocalSessions } from "../../lib/sessions";
import { computeLocalStats } from "../../lib/stats";
import type { SessionRecord } from "../../types";

/**
 * Datos de constancia de la persona: meta semanal, semana, retos, nivel y medallas.
 * Las sesiones salen del almacenamiento local; `streakDays` puede venir del servidor (el mayor gana).
 */
export function useEngagement(userId: string | undefined | null, streakFromStats = 0) {
  const sessions: SessionRecord[] = useMemo(() => readLocalSessions(), []);
  const [state, setState] = useState<EngagementState>(() => readEngagement(userId));

  const setGoal = useCallback(
    (goal: number) => {
      setState((current) => {
        const next = { ...current, weeklyGoal: clampGoal(goal) };
        writeEngagement(userId, next);
        return next;
      });
    },
    [userId],
  );

  return useMemo(() => {
    const now = new Date();
    const today = sessionsOn(sessions, now);
    const done = new Set(state.completed[dayKey(now)] ?? []);
    const challenges = dailyChallenges(now).map((challenge) => {
      const progress = challengeProgress(challenge, today);
      return { ...challenge, ...progress, done: progress.done || done.has(challenge.id) };
    });
    const streak = Math.max(streakFromStats, computeLocalStats(sessions, now).streakDays);
    const challengesDone = Object.values(state.completed).flat().length;
    const level = levelFromXp(totalXp(sessions, state.completed));
    const badges = BADGES.map((badge) => ({
      ...badge,
      unlockedAt: state.unlocked[badge.id] as string | undefined,
      percent: Math.round(badge.progress({ sessions, streakDays: streak, challengesDone }) * 100),
    }));
    return {
      weeklyGoal: state.weeklyGoal,
      setGoal,
      week: weekDays(sessions, now),
      goal: weeklyGoalProgress(sessions, state.weeklyGoal, now),
      challenges,
      level,
      badges,
      hasSessions: sessions.length > 0,
    };
  }, [sessions, state, streakFromStats, setGoal]);
}
