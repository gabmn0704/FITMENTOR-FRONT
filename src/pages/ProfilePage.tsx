import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { LogOut, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import { Avatar, Button, Card, Notice, Segmented, Switch, type SegmentOption } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useTheme, type ThemeChoice } from "../hooks/useTheme";
import { STORAGE_KEYS, storage } from "../lib/storage";
import { clearApiCache } from "../lib/api";

const LEVELS: SegmentOption<string>[] = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

const GOALS = [
  { value: "fuerza", label: "Ganar fuerza" },
  { value: "movilidad", label: "Movilidad" },
  { value: "resistencia", label: "Resistencia" },
  { value: "tonificar", label: "Tonificar" },
];

const THEMES: SegmentOption<ThemeChoice>[] = [
  { value: "dark", label: "Oscuro" },
  { value: "light", label: "Claro" },
  { value: "system", label: "Sistema" },
];

export function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name ?? "");
  const [voice, setVoice] = useState(() => storage.getString(STORAGE_KEYS.voice) !== "off");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const save = async (patch: Partial<{ name: string; level: string; goal: string }>) => {
    setSaving(true);
    setMessage(null);
    try {
      await updateUser(patch);
      setMessage({ tone: "info", text: "Cambios guardados." });
    } catch {
      setMessage({ tone: "error", text: "No pudimos guardar los cambios. Revisa tu conexión." });
    } finally {
      setSaving(false);
    }
  };

  const onSaveName = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed) void save({ name: trimmed });
  };

  const toggleVoice = (next: boolean) => {
    setVoice(next);
    storage.setString(STORAGE_KEYS.voice, next ? "on" : "off");
  };

  const signOut = () => {
    clearApiCache();
    logout();
    window.location.hash = "";
  };

  if (!user) return <Notice tone="info">Inicia sesión para ver tu perfil.</Notice>;

  return (
    <div className="stack">
      <header className="page-header">
        <p className="eyebrow">Perfil y ajustes</p>
        <h1>Tu espacio</h1>
        <p>Ajusta cómo FitMentor te acompaña en cada sesión.</p>
      </header>

      <div className="home-split">
        <Card eyebrow="Cuenta" title={user.name}>
          <div className="row" style={{ marginBottom: 16 }}>
            <Avatar name={user.name} picture={user.picture} />
            <span className="muted">{user.guest ? "Modo invitado · tus datos se guardan en el servidor" : user.email}</span>
          </div>
          <form className="stack" onSubmit={onSaveName}>
            <div className="field">
              <label htmlFor="profile-name">Nombre</label>
              <input id="profile-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" variant="ghost" disabled={saving || !name.trim() || name.trim() === user.name} loading={saving}>
              Guardar nombre
            </Button>
          </form>
        </Card>

        <Card eyebrow="Entrenamiento" title="Objetivo y nivel">
          <div className="stack">
            <div className="field">
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Nivel</span>
              <Segmented
                label="Nivel de entrenamiento"
                options={LEVELS}
                value={user.level ?? "intermedio"}
                onChange={(level) => void save({ level })}
              />
            </div>
            <div className="field">
              <label htmlFor="profile-goal">Objetivo</label>
              <select
                id="profile-goal"
                className="select"
                value={user.goal ?? "fuerza"}
                onChange={(event) => void save({ goal: event.target.value })}
              >
                {GOALS.map((goal) => (
                  <option key={goal.value} value={goal.value}>
                    {goal.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card as="div" title="Preferencias" eyebrow="Experiencia">
        <div className="settings-list">
          <div className="setting">
            <span className="avatar" style={{ background: "var(--lime-soft)", color: "var(--lime)" } as CSSProperties} aria-hidden="true">
              {voice ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </span>
            <div className="setting__text">
              <strong id="voice-label">Correcciones por voz</strong>
              <small>{voice ? "Activas durante el ejercicio." : "Desactivadas."}</small>
            </div>
            <Switch checked={voice} onChange={toggleVoice} label="Correcciones por voz" />
          </div>

          <div className="setting">
            <div className="setting__text">
              <strong>Tema</strong>
              <small>Oscuro por defecto. El sistema sigue la preferencia de tu dispositivo.</small>
            </div>
            <Segmented label="Tema de color" options={THEMES} value={theme} onChange={setTheme} />
          </div>

          <div className="setting" role="note">
            <span className="avatar" style={{ background: "var(--lime-soft)", color: "var(--lime)" } as CSSProperties} aria-hidden="true">
              <ShieldCheck size={16} />
            </span>
            <div className="setting__text">
              <strong>Privacidad</strong>
              <small>
                El video se procesa en tu dispositivo. Solo se envían puntos de postura al servidor, nunca imágenes.
              </small>
            </div>
          </div>
        </div>
      </Card>

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Button variant="danger" onClick={signOut} icon={<LogOut size={16} />}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
