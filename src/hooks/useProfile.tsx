import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./useAuth";
import { loadProfile, saveProfile, type BodyProfile } from "../lib/profile";

interface ProfileContextValue {
  profile: BodyProfile | null;
  save: (profile: BodyProfile) => void;
  /** Verdadero mientras se muestra el asistente "Hagamos tu plan". */
  wizardOpen: boolean;
  /** Abre el asistente (crear el plan o rehacerlo). */
  openWizard: () => void;
  /** Cierra el asistente sin guardar. */
  closeWizard: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * Perfil físico de la persona que inició sesión, guardado en este dispositivo y separado por usuario.
 * El asistente se abre solo justo después de iniciar sesión (o registrarse, o entrar como invitado) cuando aún
 * no hay perfil; con una sesión ya guardada se entra directo y el plan se crea desde sus botones.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<BodyProfile | null>(() => loadProfile(userId));
  const [wizardOpen, setWizardOpen] = useState(false);
  // La sesión con la que se cargó la página no cuenta como inicio de sesión: solo el que ocurra después.
  const lastToken = useRef(token);

  useEffect(() => {
    const saved = loadProfile(userId);
    setProfile(saved);
    const signedInNow = !lastToken.current && Boolean(token);
    if (signedInNow && !saved) setWizardOpen(true);
    if (!token) setWizardOpen(false);
    lastToken.current = token;
  }, [userId, token]);

  const save = useCallback(
    (next: BodyProfile) => {
      if (userId) saveProfile(userId, next);
      setProfile(next);
      setWizardOpen(false);
    },
    [userId],
  );
  const openWizard = useCallback(() => setWizardOpen(true), []);
  const closeWizard = useCallback(() => setWizardOpen(false), []);

  const value = useMemo(
    () => ({ profile, save, wizardOpen, openWizard, closeWizard }),
    [profile, save, wizardOpen, openWizard, closeWizard],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile debe usarse dentro de ProfileProvider");
  return context;
}
