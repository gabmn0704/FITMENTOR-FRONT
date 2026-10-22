import { API_URL } from "./config";
import { LRUCache } from "../structures";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
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

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
    throw new ApiError(
      response.status,
      text || `El servidor respondió ${response.status}.`,
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
