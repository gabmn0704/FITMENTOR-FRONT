import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearApiCache, setUnauthorizedHandler } from "../lib/api";
import { authApi, meApi } from "../lib/services";
import { STORAGE_KEYS, storage } from "../lib/storage";
import type { User } from "../types";

interface AuthContextValue {
  token: string | null;
  user: User | null;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginAsGuest: (name?: string) => Promise<void>;
  updateUser: (patch: Partial<Pick<User, "name" | "level" | "goal">>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => storage.getString(STORAGE_KEYS.token));
  const [user, setUser] = useState<User | null>(() => storage.getJSON<User | null>(STORAGE_KEYS.user, null));

  const persist = useCallback((nextToken: string, nextUser: User) => {
    storage.setString(STORAGE_KEYS.token, nextToken);
    storage.setJSON(STORAGE_KEYS.user, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    storage.remove(STORAGE_KEYS.token);
    storage.remove(STORAGE_KEYS.user);
    clearApiCache();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Refresca el perfil con el token guardado; un 401 cerrará la sesión.
  useEffect(() => {
    if (!token) return;
    let active = true;
    meApi
      .get(token)
      .then((fresh) => {
        if (active) {
          setUser(fresh);
          storage.setJSON(STORAGE_KEYS.user, fresh);
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

  const updateUser = useCallback(
    async (patch: Partial<Pick<User, "name" | "level" | "goal">>) => {
      if (!token) return;
      const fresh = await meApi.update(token, patch);
      setUser(fresh);
      storage.setJSON(STORAGE_KEYS.user, fresh);
    },
    [token],
  );

  const value = useMemo(
    () => ({ token, user, loginWithGoogle, loginAsGuest, updateUser, logout }),
    [token, user, loginWithGoogle, loginAsGuest, updateUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
