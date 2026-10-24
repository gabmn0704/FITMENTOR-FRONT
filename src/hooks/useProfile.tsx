import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./useAuth";
import { clearProfile, loadProfile, saveProfile, type BodyProfile } from "../lib/profile";

interface ProfileContextValue {
  profile: BodyProfile | null;
  save: (profile: BodyProfile) => void;
  reset: () => void;
  /** Verdadero si la persona eligió omitir el asistente en esta sesión. */
  skipped: boolean;
  skip: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/** Perfil físico de la persona que inició sesión, guardado en este dispositivo y separado por usuario. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<BodyProfile | null>(() => loadProfile(userId));
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    setProfile(loadProfile(userId));
    setSkipped(false);
  }, [userId]);

  const save = useCallback(
    (next: BodyProfile) => {
      if (userId) saveProfile(userId, next);
      setProfile(next);
    },
    [userId],
  );

  const reset = useCallback(() => {
    if (userId) clearProfile(userId);
    setProfile(null);
    setSkipped(false);
  }, [userId]);

  const skip = useCallback(() => setSkipped(true), []);

  const value = useMemo(() => ({ profile, save, reset, skipped, skip }), [profile, save, reset, skipped, skip]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile debe usarse dentro de ProfileProvider");
  return context;
}
