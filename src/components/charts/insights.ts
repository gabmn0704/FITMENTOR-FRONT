/** Lecturas del historial para la página de progreso: mapa de constancia, comparativa semanal y tendencia. */

export interface DatedSession {
  reps: number;
  accuracy: number;
  durationSeconds: number;
  /** ISO 8601. */
  date: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Lunes de la semana de `date`, a medianoche local. */
function mondayOf(date: Date): Date {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - offset);
}

export interface HeatCell {
  key: string;
  date: Date;
  reps: number;
  sessions: number;
  /** 0 sin sesión, 1 a 4 según las repeticiones del día respecto al mejor día del periodo. */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/** Semanas completas (lunes a domingo) que terminan en la semana actual; cada columna es una semana. */
export function heatmap(sessions: DatedSession[], weeks = 18, now = new Date()): HeatCell[][] {
  const byDay = new Map<string, { reps: number; sessions: number }>();
  for (const s of sessions) {
    const key = dayKey(new Date(s.date));
    const entry = byDay.get(key) ?? { reps: 0, sessions: 0 };
    entry.reps += s.reps;
    entry.sessions += 1;
    byDay.set(key, entry);
  }
  const first = mondayOf(new Date(mondayOf(now).getTime() - (weeks - 1) * 7 * DAY_MS));
  const today = startOfDay(now).getTime();
  const columns: Omit<HeatCell, "level">[][] = [];
  let peak = 1;
  for (let w = 0; w < weeks; w++) {
    const column: Omit<HeatCell, "level">[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + w * 7 + d);
      const key = dayKey(date);
      const entry = byDay.get(key) ?? { reps: 0, sessions: 0 };
      peak = Math.max(peak, entry.reps);
      column.push({ key, date, reps: entry.reps, sessions: entry.sessions, future: date.getTime() > today });
    }
    columns.push(column);
  }
  return columns.map((column) =>
    column.map((cell) => ({
      ...cell,
      level: cell.reps === 0 ? 0 : (Math.min(4, Math.max(1, Math.ceil((cell.reps / peak) * 4))) as HeatCell["level"]),
    })),
  );
}

export interface WeekSummary {
  reps: number;
  sessions: number;
  accuracy: number;
  minutes: number;
  activeDays: number;
}

function summarize(sessions: DatedSession[]): WeekSummary {
  const reps = sessions.reduce((sum, s) => sum + s.reps, 0);
  const accuracy = sessions.length ? Math.round(sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length) : 0;
  const minutes = Math.round(sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60);
  const activeDays = new Set(sessions.map((s) => dayKey(new Date(s.date)))).size;
  return { reps, sessions: sessions.length, accuracy, minutes, activeDays };
}

/** Últimos siete días frente a los siete anteriores. */
export function compareWeeks(sessions: DatedSession[], now = new Date()): { current: WeekSummary; previous: WeekSummary } {
  const end = startOfDay(now).getTime() + DAY_MS;
  const inRange = (from: number, to: number) => sessions.filter((s) => {
    const t = new Date(s.date).getTime();
    return t >= from && t < to;
  });
  return {
    current: summarize(inRange(end - 7 * DAY_MS, end)),
    previous: summarize(inRange(end - 14 * DAY_MS, end - 7 * DAY_MS)),
  };
}

/** Repeticiones por semana (de la más antigua a la actual) para la tendencia. */
export function weeklyReps(sessions: DatedSession[], weeks = 8, now = new Date()): number[] {
  const thisMonday = mondayOf(now).getTime();
  const totals = Array.from({ length: weeks }, () => 0);
  for (const s of sessions) {
    const diff = Math.floor((thisMonday - mondayOf(new Date(s.date)).getTime()) / (7 * DAY_MS));
    const slot = weeks - 1 - diff;
    if (slot >= 0 && slot < weeks) totals[slot] += s.reps;
  }
  return totals;
}

/** Cambio porcentual redondeado; null si no hay base para comparar. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}
