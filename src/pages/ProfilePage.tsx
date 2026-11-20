import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { LogOut, Plus, RotateCcw, Scale, ShieldCheck, Volume2, VolumeX, X } from "lucide-react";
import { Avatar, Button, Notice, Segmented, Switch, type SegmentOption } from "../components/ui";
import { HeroFigures, PageHero } from "../components/p2/PageHero";
import { useReveal } from "../components/p2/motion";
import { Odometer } from "../components/motion/Odometer";
import { WeightChart } from "../components/charts/WeightChart";
import { useAuth } from "../hooks/useAuth";
import { useTheme, type ThemeChoice } from "../hooks/useTheme";
import { useProfile } from "../hooks/useProfile";
import { bmi, bmiCategory, currentWeek, goalName } from "../lib/profile";
import { nutritionTargets } from "../lib/nutrition";
import { STORAGE_KEYS, storage } from "../lib/storage";
import { ApiError, clearApiCache } from "../lib/api";
import { GOALS, LEVELS, isGuest, levelLabel, toGoal } from "../lib/contract";
import { addWeight, dateKey, readWeights, removeWeight, weeklyRate, type WeightEntry } from "../lib/tracking";
import { formatShortDate } from "../lib/format";
import type { ProfilePatch } from "../lib/services";
import type { Level } from "../types";

const LEVEL_OPTIONS: SegmentOption<Level>[] = LEVELS.map((value) => ({ value, label: levelLabel(value) }));

const THEMES: SegmentOption<ThemeChoice>[] = [
  { value: "dark", label: "Oscuro" },
  { value: "light", label: "Claro" },
  { value: "system", label: "Sistema" },
];

/** Escala del IMC que se dibuja (15 a 35) y sus cortes. */
const BMI_MIN = 15;
const BMI_MAX = 35;
const bmiPos = (value: number) => Math.max(0, Math.min(100, ((value - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100));

const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)}`;

export function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { profile, reset } = useProfile();
  const [name, setName] = useState(user?.name ?? "");
  const [voice, setVoice] = useState(() => storage.getString(STORAGE_KEYS.voice) !== "off");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>(() => readWeights(user?.id));
  const [weightDraft, setWeightDraft] = useState("");
  const [weightError, setWeightError] = useState("");
  const page = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  useEffect(() => {
    setWeights(readWeights(user?.id));
  }, [user?.id]);

  useReveal(page, [Boolean(profile)]);

  const save = async (patch: ProfilePatch) => {
    setSaving(true);
    setMessage(null);
    try {
      await updateUser(patch);
      setMessage({ tone: "info", text: "Cambios guardados." });
    } catch (err) {
      const text = err instanceof ApiError && err.status !== 0 && err.message ? err.message : "No pudimos guardar los cambios. Revisa tu conexión.";
      setMessage({ tone: "error", text });
    } finally {
      setSaving(false);
    }
  };

  const onSaveName = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed) void save({ name: trimmed });
  };

  const onAddWeight = (event: FormEvent) => {
    event.preventDefault();
    const kg = Number(weightDraft.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 25 || kg > 350) {
      setWeightError("Escribe un peso entre 25 y 350 kg.");
      return;
    }
    setWeightError("");
    setWeights(addWeight(kg, dateKey(), user?.id));
    setWeightDraft("");
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

  // Lectura del cuerpo: el último pesaje manda; si no hay, el peso del plan.
  const body = useMemo(() => {
    if (!profile) return null;
    const latest = weights.length ? weights[weights.length - 1].kg : profile.weightKg;
    const targets = nutritionTargets(profile);
    const bmiNow = bmi({ weightKg: latest, heightCm: profile.heightCm });
    const actualRate = weeklyRate(weights);
    const remaining = profile.targetWeightKg === null ? null : Math.round((profile.targetWeightKg - latest) * 10) / 10;
    const onTrack =
      remaining === null || actualRate === null
        ? null
        : Math.abs(remaining) < 0.3 || Math.sign(actualRate) === Math.sign(remaining);
    const eta = remaining !== null && actualRate && onTrack && Math.abs(remaining) >= 0.3 ? Math.ceil(Math.abs(remaining / actualRate)) : null;
    const week = Math.min(currentWeek(profile), profile.weeks);
    return { latest, targets, bmiNow, actualRate, remaining, onTrack, eta, week, change: Math.round((latest - profile.weightKg) * 10) / 10 };
  }, [profile, weights]);

  if (!user) return <Notice tone="info">Inicia sesión para ver tu perfil.</Notice>;

  return (
    <div className="p2-page" ref={page}>
      <PageHero title={["Tu espacio,", "a tu medida"]} accent={1} kicker={isGuest(user) ? "Modo invitado" : "Perfil y ajustes"} lead="Tu cuerpo, tu plan y cómo te acompaña FitMentor en cada sesión."
        aside={
          profile ? (
            <HeroFigures
              items={[
                { label: "Peso actual", value: `${profile.weightKg} kg` },
                ...(profile.targetWeightKg ? [{ label: "Meta", value: `${profile.targetWeightKg} kg` }] : []),
                { label: "Semana", value: `${currentWeek(profile)}/${profile.weeks}` },
              ]}
            />
          ) : undefined
        }
      >
        <div className="p3-who">
          <Avatar name={user.name} picture={user.picture} />
          <div>
            <strong>{user.name}</strong>
            <span>{isGuest(user) ? "Tus datos se guardan en el servidor" : user.email}</span>
          </div>
        </div>
      </PageHero>

      {profile && body ? (
        <section className="p3-body" aria-labelledby="body-title" data-reveal>
          <div className="p3-body__main">
            <div className="p3-body__head">
              <div>
                <p className="p3-eyebrow">
                  <Scale size={14} aria-hidden="true" /> Semana {body.week} de {profile.weeks}
                </p>
                <h2 id="body-title" className="p3-body__title">
                  Tu peso
                </h2>
              </div>
              <form className="p3-weigh" onSubmit={onAddWeight} noValidate>
                <label htmlFor="weigh-input" className="sr-only">
                  Peso de hoy en kilos
                </label>
                <input
                  id="weigh-input"
                  className="input"
                  inputMode="decimal"
                  placeholder={`${body.latest}`}
                  value={weightDraft}
                  onChange={(event) => setWeightDraft(event.target.value)}
                  aria-invalid={Boolean(weightError)}
                  aria-describedby={weightError ? "weigh-error" : undefined}
                />
                <span className="p3-weigh__unit" aria-hidden="true">
                  kg
                </span>
                <Button type="submit" variant="primary" icon={<Plus size={16} />}>
                  Registrar hoy
                </Button>
                {weightError && (
                  <span id="weigh-error" className="field__error" role="alert">
                    {weightError}
                  </span>
                )}
              </form>
            </div>

            <dl className="p3-body__figures">
              <div>
                <dt>Ahora</dt>
                <dd className="tabular">
                  <Odometer value={Math.round(body.latest * 10) / 10} />
                  <small>kg</small>
                </dd>
              </div>
              <div>
                <dt>Desde el inicio</dt>
                <dd className="tabular">
                  {signed(body.change)}
                  <small>kg</small>
                </dd>
              </div>
              {body.remaining !== null && (
                <div>
                  <dt>Para la meta</dt>
                  <dd className="tabular">
                    {Math.abs(body.remaining).toFixed(1)}
                    <small>kg · meta {profile.targetWeightKg}</small>
                  </dd>
                </div>
              )}
              <div>
                <dt>Ritmo real</dt>
                <dd className="tabular">
                  {body.actualRate === null ? "—" : signed(body.actualRate)}
                  <small>kg/sem · plan {signed(body.targets.weeklyChangeKg)}</small>
                </dd>
              </div>
            </dl>

            <WeightChart
              entries={weights.length ? weights : [{ date: profile.startedAt.slice(0, 10), kg: profile.weightKg }]}
              plan={{ startKg: profile.weightKg, startDate: profile.startedAt, targetKg: profile.targetWeightKg, weeks: profile.weeks }}
            />

            <p className={`p3-body__verdict${body.onTrack === false ? " is-off" : ""}`}>
              {weights.length < 2
                ? "Registra tu peso una vez por semana, a la misma hora y en ayunas: con dos pesajes calculamos tu ritmo real."
                : body.onTrack === false
                  ? "Tu peso va en dirección contraria a la meta. Revisa porciones y constancia; si sigue así dos semanas, rehaz el plan."
                  : body.eta
                    ? `A este ritmo llegas a la meta en unas ${body.eta} ${body.eta === 1 ? "semana" : "semanas"}.`
                    : "Vas en la dirección correcta. Mantén la constancia."}
            </p>

            {weights.length > 0 && (
              <ol className="p3-weighs" aria-label="Últimos pesajes">
                {weights
                  .slice(-6)
                  .reverse()
                  .map((entry) => (
                    <li key={entry.date}>
                      <span>{formatShortDate(`${entry.date}T12:00:00`)}</span>
                      <strong className="tabular">{entry.kg} kg</strong>
                      <button type="button" className="p3-weighs__del" aria-label={`Borrar el pesaje del ${formatShortDate(`${entry.date}T12:00:00`)}`} onClick={() => setWeights(removeWeight(entry.date, user.id))}>
                        <X size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
              </ol>
            )}
          </div>

          <aside className="p3-body__side" aria-label="Tu plan">
            <p className="p3-eyebrow">Tu plan</p>
            <p className="p3-body__goal">{goalName(profile.goal)}</p>
            <div className="p3-bmi">
              <div className="p3-bmi__head">
                <span>IMC</span>
                <strong className="tabular">{body.bmiNow}</strong>
                <em>{bmiCategory(body.bmiNow)}</em>
              </div>
              <div className="p3-bmi__scale" role="img" aria-label={`Índice de masa corporal ${body.bmiNow}, ${bmiCategory(body.bmiNow).toLowerCase()}`}>
                <span className="p3-bmi__marker" style={{ left: `${bmiPos(body.bmiNow)}%` }} />
              </div>
              <div className="p3-bmi__ticks" aria-hidden="true">
                <span style={{ left: `${bmiPos(18.5)}%` }}>18,5</span>
                <span style={{ left: `${bmiPos(25)}%` }}>25</span>
                <span style={{ left: `${bmiPos(30)}%` }}>30</span>
              </div>
            </div>
            <ul className="p3-facts">
              <li>
                <span>Entrenas</span>
                <strong className="tabular">{profile.daysPerWeek} días / semana</strong>
              </li>
              <li>
                <span>Energía diaria</span>
                <strong className="tabular">{body.targets.kcal} kcal</strong>
              </li>
              <li>
                <span>Proteína</span>
                <strong className="tabular">{body.targets.proteinG} g</strong>
              </li>
              <li>
                <span>Altura</span>
                <strong className="tabular">{profile.heightCm} cm</strong>
              </li>
            </ul>
            <button type="button" className="p2-chipbtn" onClick={reset}>
              <RotateCcw size={14} aria-hidden="true" /> Rehacer mi plan
            </button>
          </aside>
        </section>
      ) : (
        <section className="p3-cta" data-reveal>
          <div>
            <p className="p3-eyebrow">Sin plan todavía</p>
            <h2 className="p3-cta__title">Crea tu plan para seguir tu peso</h2>
            <p className="p3-cta__lead">Con tu objetivo y tus medidas calculamos calorías, ritmo y semanas, y aquí verás tu avance real.</p>
          </div>
          <Button variant="primary" large onClick={reset}>
            Crear mi plan
          </Button>
        </section>
      )}

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <section className="p3-settings" aria-label="Cuenta y preferencias" data-reveal="scroll">
        <div className="p3-settings__col">
          <h2 className="p3-settings__title">Cuenta</h2>
          <form className="p3-row p3-row--form" onSubmit={onSaveName}>
            <label htmlFor="profile-name" className="p3-row__label">
              Nombre
            </label>
            <div className="p3-row__control">
              <input id="profile-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
              <Button type="submit" variant="ghost" disabled={saving || !name.trim() || name.trim() === user.name} loading={saving}>
                Guardar
              </Button>
            </div>
          </form>
          <div className="p3-row">
            <span className="p3-row__label">Nivel</span>
            <div className="p3-row__control">
              <Segmented label="Nivel de entrenamiento" options={LEVEL_OPTIONS} value={user.level} onChange={(level) => void save({ level })} />
            </div>
          </div>
          <div className="p3-row">
            <label htmlFor="profile-goal" className="p3-row__label">
              Objetivo de la cuenta
            </label>
            <div className="p3-row__control">
              <select id="profile-goal" className="select" value={toGoal(user.goal)} onChange={(event) => void save({ goal: event.target.value || null })}>
                <option value="">Sin objetivo definido</option>
                {GOALS.map((goal) => (
                  <option key={goal.value} value={goal.value}>
                    {goal.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p3-settings__col">
          <h2 className="p3-settings__title">Preferencias</h2>
          <div className="p3-row">
            <span className="p3-row__icon" aria-hidden="true">
              {voice ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </span>
            <div className="p3-row__text">
              <strong>Correcciones por voz</strong>
              <small>{voice ? "Activas durante el ejercicio." : "Desactivadas."}</small>
            </div>
            <Switch checked={voice} onChange={toggleVoice} label="Correcciones por voz" />
          </div>
          <div className="p3-row p3-row--stack">
            <div className="p3-row__text">
              <strong>Tema</strong>
              <small>El sistema sigue la preferencia de tu dispositivo.</small>
            </div>
            <Segmented label="Tema de color" options={THEMES} value={theme} onChange={setTheme} />
          </div>
          <div className="p3-row" role="note">
            <span className="p3-row__icon" aria-hidden="true">
              <ShieldCheck size={16} />
            </span>
            <div className="p3-row__text">
              <strong>Privacidad</strong>
              <small>El video se procesa en tu dispositivo. Solo se envían puntos de postura al servidor, nunca imágenes. Tus pesajes se quedan en este dispositivo.</small>
            </div>
          </div>
          <div className="p3-row p3-row--end">
            <Button variant="danger" onClick={signOut} icon={<LogOut size={16} />}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
