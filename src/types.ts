export type ExerciseId = "squat" | "push_up" | "plank" | "deadlift" | "lunge";

export type Point = { x: number; y: number; visibility?: number };

export interface User {
  id?: string;
  name: string;
  email?: string;
  picture?: string;
  level?: string;
  goal?: string;
  guest?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface WeeklyPoint {
  date: string;
  reps: number;
  accuracy: number;
}

export interface ExerciseStat {
  exercise: string;
  reps: number;
  accuracy: number;
}

export interface Stats {
  totalSessions: number;
  totalReps: number;
  totalCalories: number;
  avgAccuracy: number;
  streakDays: number;
  weekly: WeeklyPoint[];
  byExercise: ExerciseStat[];
  level: string;
}

export interface RoutineItem {
  exercise: string;
  sets: number;
  reps: number;
  note: string;
}

export interface Routine {
  level: string;
  restSeconds: number;
  items: RoutineItem[];
  reason: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  /** Progreso normalizado entre 0 y 1. */
  progress: number;
}

export interface ExerciseInfo {
  id: string;
  label: string;
  muscle: string;
  difficulty: string;
}

export interface SessionPayload {
  exercise: ExerciseId;
  reps: number;
  accuracy: number;
  durationSeconds: number;
  avgAngles?: Record<string, number>;
}

export interface SessionRecord extends SessionPayload {
  /** Identificador local único (uuid o timestamp). */
  localId: string;
  /** ISO 8601. */
  date: string;
  synced: boolean;
}

export interface CoachAnswer {
  answer: string;
  source: string;
}

export interface FeedbackMessage {
  type: "feedback";
  score: number;
  message: string;
  feedback: string[];
  phase?: string;
  reps?: number;
  state?: string;
}

export interface StateMessage {
  type: "state";
  state: string;
}

export type ServerMessage = FeedbackMessage | StateMessage;

export type CommandName = "pause" | "resume" | "skip" | "finish" | "undo";
