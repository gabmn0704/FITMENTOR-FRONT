import { apiRequest, cachedGet } from "./api";
import type {
  Achievement,
  AuthResponse,
  CoachAnswer,
  ExerciseInfo,
  Routine,
  SessionPayload,
  Stats,
  User,
} from "../types";

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
  update: (token: string, patch: Partial<Pick<User, "name" | "level" | "goal">>) =>
    apiRequest<User>("/api/me", { method: "PATCH", body: patch, token }),
};

export const sessionsApi = {
  create: (token: string, payload: SessionPayload) =>
    apiRequest<{ id?: string } | undefined>("/api/sessions", { method: "POST", body: payload, token }),
  list: (token: string, limit = 20) =>
    apiRequest<SessionPayload[]>(`/api/sessions?limit=${limit}`, { token }),
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
};

export const coachApi = {
  ask: (token: string, question: string, context?: Record<string, unknown>) =>
    apiRequest<CoachAnswer>("/api/coach", {
      method: "POST",
      body: context ? { question, context } : { question },
      token,
    }),
};
