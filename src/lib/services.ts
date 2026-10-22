import { apiRequest, cachedGet } from "./api";
import type {
  Achievement,
  AuthResponse,
  CoachAnswer,
  ExerciseInfo,
  Level,
  NextExercise,
  Routine,
  ServerSession,
  SessionPayload,
  Stats,
  User,
} from "../types";

export interface ProfilePatch {
  name?: string;
  level?: Level;
  goal?: string | null;
}

/** Llamadas tipadas al backend. Todas las rutas protegidas reciben el Bearer token. */

export const authApi = {
  google: (credential: string) =>
    apiRequest<AuthResponse>("/api/auth/google", { method: "POST", body: { credential } }),
  guest: (name?: string) =>
    apiRequest<AuthResponse>("/api/auth/guest", {
      method: "POST",
      body: name ? { name } : {},
    }),
};

export const meApi = {
  get: (token: string) => apiRequest<User>("/api/me", { token }),
  update: (token: string, patch: ProfilePatch) =>
    apiRequest<User>("/api/me", { method: "PATCH", body: patch, token }),
};

export const sessionsApi = {
  create: (token: string, payload: SessionPayload) =>
    apiRequest<ServerSession>("/api/sessions", { method: "POST", body: payload, token }),
  /** El backend acepta limit entre 1 y 100. */
  list: (token: string, limit = 20) =>
    apiRequest<ServerSession[]>(`/api/sessions?limit=${Math.min(100, Math.max(1, Math.round(limit)))}`, { token }),
};

export const statsApi = {
  get: (token: string) => apiRequest<Stats>("/api/stats", { token }),
};

export const routineApi = {
  get: (token: string) => apiRequest<Routine>("/api/routine", { token }),
};

export const achievementsApi = {
  list: (token: string) => apiRequest<Achievement[]>("/api/achievements", { token }),
};

export const exercisesApi = {
  /** Búsqueda remota con caché LRU; el filtrado fino se hace con el Trie en cliente. */
  search: (token: string, query = "") =>
    cachedGet<ExerciseInfo[]>(`/api/exercises?q=${encodeURIComponent(query)}`, token),
  /** Progresiones desde un ejercicio (array con `distance`). */
  next: (token: string, from: string) =>
    cachedGet<NextExercise[]>(`/api/exercises/next?from=${encodeURIComponent(from)}`, token),
};

export const coachApi = {
  /** El backend acepta `context` como texto (máx. 4000) y la pregunta hasta 1000 caracteres. */
  ask: (token: string, question: string, context?: string) =>
    apiRequest<CoachAnswer>("/api/coach", {
      method: "POST",
      body: context ? { question, context } : { question },
      token,
    }),
};
