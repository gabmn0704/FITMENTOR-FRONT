/** Claves usadas en localStorage. Todas tienen el prefijo fitmentor. */
export const STORAGE_KEYS = {
  token: "fitmentor.token",
  user: "fitmentor.user",
  sessions: "fitmentor.sessions",
  theme: "fitmentor.theme",
  voice: "fitmentor.voice",
  profile: "fitmentor.profile",
} as const;

/**
 * Lectura y escritura tolerantes a fallos: el almacenamiento puede estar
 * bloqueado (modo privado, cookies deshabilitadas) o contener JSON corrupto.
 */
export const storage = {
  getJSON<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  setJSON(key: string, value: unknown): boolean {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  getString(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setString(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* sin almacenamiento disponible: la preferencia vive solo en memoria */
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignorar */
    }
  },
};
