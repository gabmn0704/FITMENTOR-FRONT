import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearApiCache, setUnauthorizedHandler } from "../lib/api";
import { normalizeUser } from "../lib/contract";
import { authApi, meApi, type ProfilePatch } from "../lib/services";
import { STORAGE_KEYS, storage } from "../lib/storage";
import type { User } from "../types";

interface AuthContextValue {
  token: string | null;
  user: User | null;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginAsGuest: (name?: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  updateUser: (patch: ProfilePatch) => Promise<void>;
  logout: () => void;
  /** Aviso para la pantalla de acceso (p. ej. sesión caducada tras un 401). */
  authNotice: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => storage.getString(STORAGE_KEYS.token));
  const [user, setUser] = useState<User | null>(() => {
    const saved = storage.getJSON<User | null>(STORAGE_KEYS.user, null);
    return saved && typeof saved === "object" && typeof saved.name === "string" ? normalizeUser(saved) : null;
  });

  const persist = useCallback((nextToken: string, rawUser: User) => {
    const nextUser = normalizeUser(rawUser);
    setAuthNotice(null);
    storage.setString(STORAGE_KEYS.token, nextToken);
    storage.setJSON(STORAGE_KEYS.user, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    storage.remove(STORAGE_KEYS.token);
    storage.remove(STORAGE_KEYS.user);
    clearApiCache();
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    setAuthNotice(null);
    clearSession();
  }, [clearSession]);

  // Un 401 con token: la sesión caducó o el usuario ya no existe.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthNotice("Tu sesión caducó o ya no es válida. Vuelve a entrar para continuar.");
      clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // Refresca el perfil con el token guardado; un 401 cerrará la sesión.
  useEffect(() => {
    if (!token) return;
    let active = true;
    meApi
      .get(token)
      .then((fresh) => {
        if (active) {
          const normalized = normalizeUser(fresh);
          setUser(normalized);
          storage.setJSON(STORAGE_KEYS.user, normalized);
        }
      })
      .catch(() => {
        /* sin red: se mantiene el usuario guardado */
      });
    return () => {
      active = false;
    };
  }, [token]);

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const response = await authApi.google(credential);
      persist(response.token, response.user);
    },
    [persist],
  );

  const loginAsGuest = useCallback(
    async (name?: string) => {
      const response = await authApi.guest(name?.trim() || undefined);
      persist(response.token, response.user);
    },
    [persist],
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email.trim(), password);
      persist(response.token, response.user);
    },
    [persist],
  );

  const registerWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      const response = await authApi.register(name.trim(), email.trim(), password);
      persist(response.token, response.user);
    },
    [persist],
  );

  const updateUser = useCallback(
    async (patch: ProfilePatch) => {
      if (!token) return;
      const fresh = normalizeUser(await meApi.update(token, patch));
      setUser(fresh);
      storage.setJSON(STORAGE_KEYS.user, fresh);
      // La rutina y las estadísticas dependen del nivel: invalidamos la caché.
      clearApiCache();
    },
    [token],
  );

  const value = useMemo(
    () => ({
      token,
      user,
      loginWithGoogle,
      loginAsGuest,
      loginWithEmail,
      registerWithEmail,
      updateUser,
      logout,
      authNotice,
    }),
    [token, user, loginWithGoogle, loginAsGuest, loginWithEmail, registerWithEmail, updateUser, logout, authNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
