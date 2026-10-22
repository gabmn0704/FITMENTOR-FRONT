import { API_URL } from "./config";
import { LRUCache } from "../structures";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Código estable del backend (`rate_limited`, `validation_error`...), en minúsculas. */
    readonly code = "",
    /** Segundos indicados por `Retry-After` en un 429. */
    readonly retryAfter: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** El AuthProvider registra aquí cómo cerrar sesión cuando el token caduca. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

export function buildApiUrl(path: string, base = API_URL): string {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Código `error` del cuerpo JSON del backend, normalizado a minúsculas. */
export function errorCodeOf(body = ""): string {
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    return typeof parsed.error === "string" ? parsed.error.trim().toLowerCase() : "";
  } catch {
    return "";
  }
}

/** Segundos de `Retry-After` (entero o fecha HTTP). Null si falta o no es válido. */
export function parseRetryAfter(value: string | null | undefined, now = Date.now()): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Math.max(1, Number(trimmed));
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return null;
  return Math.max(1, Math.ceil((date - now) / 1000));
}

function waitText(seconds: number | null): string {
  if (!seconds) return "Espera un momento y vuelve a intentarlo.";
  if (seconds < 60) return `Vuelve a intentarlo en ${seconds} s.`;
  const minutes = Math.ceil(seconds / 60);
  return `Vuelve a intentarlo en ${minutes} min.`;
}

/**
 * Mensaje legible en español. El backend responde `{ error, message }` con
 * códigos estables en minúsculas; no mostramos su texto técnico al usuario.
 * `authenticated` indica si la petición llevaba token: un 401 sin token
 * (p. ej. Google rechazó la credencial) no es una sesión caducada.
 */
export function errorMessageFor(
  status: number,
  body = "",
  options: { retryAfter?: number | null; authenticated?: boolean } = {},
): string {
  const code = errorCodeOf(body);
  const { retryAfter = null, authenticated = true } = options;
  switch (code) {
    case "invalid_google_token":
    case "invalid_credential":
      return "No pudimos verificar tu cuenta de Google. Inténtalo de nuevo.";
    case "unverified_google_email":
      return "Tu correo de Google no está verificado. Verifícalo o entra como invitado.";
    case "google_not_configured":
    case "google_unavailable":
      return "El acceso con Google no está disponible ahora. Puedes entrar como invitado.";
    case "rate_limited":
      return `Has hecho demasiadas solicitudes seguidas. ${waitText(retryAfter)}`;
    case "unknown_exercise":
      return "Ese ejercicio no existe en el catálogo.";
    case "validation_error":
    case "bad_request":
      return "Algunos datos no son válidos. Revísalos e inténtalo de nuevo.";
    default:
      break;
  }
  if (status === 401) {
    return authenticated ? "Tu sesión caducó. Vuelve a iniciar sesión." : "No pudimos iniciar sesión. Inténtalo de nuevo.";
  }
  if (status === 403) return "No tienes permiso para esta acción.";
  if (status === 404) return "No encontramos lo que buscabas.";
  if (status === 429) return `Has hecho demasiadas solicitudes seguidas. ${waitText(retryAfter)}`;
  if (status === 400 || status === 422) return "Algunos datos no son válidos. Revísalos e inténtalo de nuevo.";
  if (status === 503) return "El servicio no está disponible ahora. Inténtalo de nuevo en unos minutos.";
  if (status >= 500) return "El servidor tuvo un problema. Inténtalo de nuevo en unos minutos.";
  return `El servidor respondió ${status}.`;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

/** GET idénticos en vuelo (misma ruta y token) comparten una sola petición. */
const inFlightGets = new Map<string, Promise<unknown>>();
const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);
const RETRY_DELAY_MS = 400;

/**
 * Petición al API. Los GET son idempotentes: se deduplican mientras están en
 * vuelo (p. ej. Inicio y Logros pidiendo lo mismo, o el doble efecto de
 * StrictMode) y se reintentan una vez ante un 5xx transitorio.
 */
export function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  if (method !== "GET" || options.signal) return send<T>(path, options);
  const key = `${options.token ?? ""}|${path}`;
  const pending = inFlightGets.get(key);
  if (pending) return pending as Promise<T>;
  const request = sendWithRetry<T>(path, options).finally(() => inFlightGets.delete(key));
  inFlightGets.set(key, request);
  return request;
}

async function sendWithRetry<T>(path: string, options: RequestOptions): Promise<T> {
  try {
    return await send<T>(path, options);
  } catch (error) {
    if (!(error instanceof ApiError) || !RETRYABLE_STATUS.has(error.status)) throw error;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return send<T>(path, options);
  }
}

async function send<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, signal } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(0, "No se pudo conectar con el servidor.");
  }

  if (response.status === 401 && token) onUnauthorized?.();
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const retryAfter = response.status === 429 ? parseRetryAfter(response.headers.get("Retry-After")) : null;
    throw new ApiError(
      response.status,
      errorMessageFor(response.status, text, { retryAfter, authenticated: Boolean(token) }),
      errorCodeOf(text),
      retryAfter,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Caché de lectura para búsquedas y respuestas repetidas (LRU con TTL de 5 min). */
const readCache = new LRUCache<string, unknown>(64, 5 * 60 * 1000);

export async function cachedGet<T>(path: string, token?: string | null): Promise<T> {
  const key = `${token ?? ""}|${path}`;
  return readCache.getOrLoad(key, () => apiRequest<T>(path, { token })) as Promise<T>;
}

export function clearApiCache(): void {
  readCache.clear();
}
