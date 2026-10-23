/**
 * Configuración pública del front. Todas las variables son opcionales:
 * - VITE_API_URL: base del backend. En desarrollo por defecto localhost:8080;
 *   en producción vacía significa mismo origen.
 * - VITE_GOOGLE_CLIENT_ID: si falta, se oculta el botón de Google.
 */
const env = import.meta.env;

export const API_URL: string = (
  env.VITE_API_URL ?? (env.DEV ? "http://localhost:8080" : "")
).replace(/\/+$/, "");

export const GOOGLE_CLIENT_ID: string = env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";

export const isGoogleEnabled = GOOGLE_CLIENT_ID.length > 0;
