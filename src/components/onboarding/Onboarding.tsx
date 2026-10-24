import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Logo } from "../../brand/Logo";
import { Button, Notice, Segmented, type SegmentOption } from "../ui";
import { Odometer } from "../motion/Odometer";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import { nutritionTargets } from "../../lib/nutrition";
import {
  GOAL_OPTIONS,
  bmi,
  bmiCategory,
  goalUsesTargetWeight,
  validateProfile,
  type BodyProfile,
  type Diet,
  type FitnessGoal,
  type ProfileErrors,
  type Sex,
} from "../../lib/profile";
import { LEVELS, levelLabel } from "../../lib/contract";
import { AVOID_OPTIONS, type Avoid } from "../../lib/foods";
import type { Level } from "../../types";

const STEPS = ["Tu meta", "Tu cuerpo", "Plazo y ritmo", "Tu plan"] as const;

const SEX_OPTIONS: SegmentOption<Sex | "none">[] = [
  { value: "female", label: "Mujer" },
  { value: "male", label: "Hombre" },
  { value: "none", label: "Prefiero no decir" },
];

const DAYS_OPTIONS: SegmentOption<"3" | "4" | "5" | "6">[] = [
  { value: "3", label: "3 días" },
  { value: "4", label: "4 días" },
  { value: "5", label: "5 días" },
  { value: "6", label: "6 días" },
];

const DIET_OPTIONS: SegmentOption<Diet>[] = [
  { value: "omnivore", label: "Como de todo" },
  { value: "vegetarian", label: "Vegetariana" },
];

const LEVEL_OPTIONS: SegmentOption<Level>[] = LEVELS.map((value) => ({ value, label: levelLabel(value) }));

const WEEK_CHIPS = [8, 12, 16, 24];

/** Objetivo del backend (texto estable) más cercano a la meta elegida. */
const BACKEND_GOAL: Record<FitnessGoal, string> = {
  lose_fat: "toning",
  build_muscle: "strength",
  tone: "toning",
  endurance: "endurance",
  health: "mobility",
};

const toNumber = (text: string): number => (text.trim() === "" ? NaN : Number(text.replace(",", ".")));

/** Asistente de primer uso: meta, cuerpo, plazo y un resumen con las cifras reales antes de empezar. */
export function Onboarding() {
  const { user, updateUser } = useAuth();
  const { save, skip } = useProfile();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<FitnessGoal>("lose_fat");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex | "none">("none");
  const [target, setTarget] = useState("");
  const [weeks, setWeeks] = useState("12");
  const [days, setDays] = useState<"3" | "4" | "5" | "6">("4");
  const [diet, setDiet] = useState<Diet>("omnivore");
  const [level, setLevel] = useState<Level>(user?.level ?? "BEGINNER");
  const [avoid, setAvoid] = useState<Avoid[]>([]);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saving, setSaving] = useState(false);

  const draft: Partial<BodyProfile> = useMemo(
    () => ({
      goal,
      weightKg: toNumber(weight),
      heightCm: toNumber(height),
      age: age.trim() === "" ? null : toNumber(age),
      sex: sex === "none" ? null : sex,
      targetWeightKg: goalUsesTargetWeight(goal) ? toNumber(target) : null,
      weeks: toNumber(weeks),
      daysPerWeek: Number(days) as 3 | 4 | 5 | 6,
      diet,
      avoid,
    }),
    [goal, weight, height, age, sex, target, weeks, days, diet, avoid],
  );

  const stepErrors = (index: number): ProfileErrors => {
    const all = validateProfile(draft);
    if (index === 1) return { weightKg: all.weightKg, heightCm: all.heightCm, age: all.age };
    if (index === 2) return { targetWeightKg: all.targetWeightKg, weeks: all.weeks };
    return {};
  };

  const next = () => {
    const found = Object.fromEntries(Object.entries(stepErrors(step)).filter(([, message]) => message)) as ProfileErrors;
    setErrors(found);
    if (Object.keys(found).length === 0) setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const complete = useMemo((): BodyProfile | null => {
    if (Object.values(validateProfile(draft)).some(Boolean)) return null;
    return { ...(draft as BodyProfile), startedAt: new Date().toISOString() };
  }, [draft]);

  const summary = useMemo(() => (complete ? nutritionTargets(complete) : null), [complete]);

  const finish = async (event: FormEvent) => {
    event.preventDefault();
    if (!complete) return;
    setSaving(true);
    save(complete);
    // El nivel y un objetivo estable se guardan también en la cuenta; si no hay red, el plan igual funciona.
    try {
      await updateUser({ level, goal: BACKEND_GOAL[complete.goal] });
    } catch {
      /* el perfil ya está guardado en este dispositivo */
    }
    setSaving(false);
  };

  return (
    <div className="onboard">
      <div className="onboard__field">
        <Logo size={40} tone="inverse" />
        <div className="onboard__lead">
          <h1>
            <span className="mask">
              <span>Hagamos</span>
            </span>
            <span className="mask">
              <span className="access__accent">tu plan.</span>
            </span>
          </h1>
          <p>Cuatro preguntas rápidas y FitMentor arma tu rutina semanal, tu alimentación y las correcciones de técnica para tu objetivo.</p>
        </div>
      </div>

      <main className="onboard__panel" id="main">
        <form className="bib-form" onSubmit={finish} noValidate>
          <div className="bib-form__band" aria-hidden="true">
            <span>Paso {step + 1} de {STEPS.length}</span>
            <span>{STEPS[step]}</span>
          </div>
          <div className="bib-form__body">
            <ol className="steps" aria-label="Progreso del asistente">
              {STEPS.map((label, index) => (
                <li key={label} className={index === step ? "is-current" : index < step ? "is-done" : ""} aria-current={index === step ? "step" : undefined}>
                  <span>{index < step ? <Check size={14} aria-hidden="true" /> : index + 1}</span>
                  {label}
                </li>
              ))}
            </ol>

            {step === 0 && (
              <fieldset className="choices">
                <legend>¿Qué quieres lograr?</legend>
                {GOAL_OPTIONS.map((option) => (
                  <label key={option.value} className={`choice${goal === option.value ? " is-on" : ""}`}>
                    <input type="radio" name="goal" checked={goal === option.value} onChange={() => setGoal(option.value)} />
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </label>
                ))}
              </fieldset>
            )}

            {step === 1 && (
              <div className="stack">
                <h2>Tu cuerpo</h2>
                <div className="two">
                  <Field id="ob-weight" label="Peso (kg)" value={weight} onChange={setWeight} error={errors.weightKg} placeholder="72" />
                  <Field id="ob-height" label="Altura (cm)" value={height} onChange={setHeight} error={errors.heightCm} placeholder="170" />
                </div>
                <Field id="ob-age" label="Edad (opcional, afina las calorías)" value={age} onChange={setAge} error={errors.age} placeholder="28" />
                <div className="field">
                  <span className="field__label">Sexo (opcional, afina las calorías)</span>
                  <Segmented label="Sexo" options={SEX_OPTIONS} value={sex} onChange={setSex} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="stack">
                <h2>Plazo y ritmo</h2>
                {goalUsesTargetWeight(goal) && (
                  <Field
                    id="ob-target"
                    label="¿Qué peso quieres alcanzar? (kg)"
                    value={target}
                    onChange={setTarget}
                    error={errors.targetWeightKg}
                    placeholder={goal === "lose_fat" ? "65" : "78"}
                  />
                )}
                <div className="field">
                  <label htmlFor="ob-weeks">¿En cuántas semanas?</label>
                  <div className="chips-row">
                    {WEEK_CHIPS.map((value) => (
                      <button key={value} type="button" className={`chip-button${weeks === String(value) ? " is-on" : ""}`} onClick={() => setWeeks(String(value))}>
                        {value} sem.
                      </button>
                    ))}
                  </div>
                  <input
                    id="ob-weeks"
                    className="input"
                    inputMode="numeric"
                    value={weeks}
                    onChange={(event) => setWeeks(event.target.value)}
                    aria-invalid={Boolean(errors.weeks)}
                  />
                  {errors.weeks && <span className="field__error">{errors.weeks}</span>}
                </div>
                <div className="field">
                  <span className="field__label">Días que puedes entrenar por semana</span>
                  <Segmented label="Días por semana" options={DAYS_OPTIONS} value={days} onChange={setDays} />
                </div>
                <div className="field">
                  <span className="field__label">Tu experiencia</span>
                  <Segmented label="Nivel" options={LEVEL_OPTIONS} value={level} onChange={setLevel} />
                </div>
                <div className="field">
                  <span className="field__label">Alimentación</span>
                  <Segmented label="Tipo de alimentación" options={DIET_OPTIONS} value={diet} onChange={setDiet} />
                </div>
                <div className="field">
                  <span className="field__label">¿Algo que no comas? (opcional)</span>
                  <div className="chips-row" role="group" aria-label="Alimentos que evitas">
                    {AVOID_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`chip-button${avoid.includes(option.value) ? " is-on" : ""}`}
                        aria-pressed={avoid.includes(option.value)}
                        onClick={() => setAvoid((current) => (current.includes(option.value) ? current.filter((value) => value !== option.value) : [...current, option.value]))}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && summary && complete && (
              <div className="stack">
                <h2>Tu plan</h2>
                <div className="summary-grid">
                  <div>
                    <span className="summary-grid__label">Calorías al día</span>
                    <strong className="summary-grid__value">
                      <Odometer value={summary.kcal} stagger={70} />
                    </strong>
                  </div>
                  <div>
                    <span className="summary-grid__label">Proteína</span>
                    <strong className="summary-grid__value">
                      <Odometer value={summary.proteinG} suffix=" g" stagger={70} />
                    </strong>
                  </div>
                </div>
                <ul className="facts">
                  <li>
                    Tu índice de masa corporal es <strong>{bmi(complete)}</strong> ({bmiCategory(bmi(complete)).toLowerCase()}).
                  </li>
                  <li>
                    Entrenarás <strong>{complete.daysPerWeek} días por semana</strong>, con descarga cada cuarta semana.
                  </li>
                  {summary.weeklyChangeKg !== 0 && (
                    <li>
                      Ritmo previsto: <strong>{Math.abs(summary.weeklyChangeKg).toFixed(2)} kg por semana</strong> {summary.weeklyChangeKg < 0 ? "menos" : "más"}.
                    </li>
                  )}
                  <li>
                    Bebe unos <strong>{summary.waterL} litros</strong> de agua al día.
                  </li>
                </ul>
                {summary.notes.map((note) => (
                  <Notice key={note} tone="info">
                    {note}
                  </Notice>
                ))}
                <p className="muted small">Orientación general, no sustituye a un profesional de la salud. Si tienes una condición médica, consúltalo antes de empezar.</p>
              </div>
            )}

            <div className="onboard__actions">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep(step - 1)} icon={<ArrowLeft size={16} />}>
                  Atrás
                </Button>
              ) : (
                <button type="button" className="link-button" onClick={skip}>
                  Ahora no
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <Button key="next" variant="primary" large onClick={next} icon={<ArrowRight size={18} />}>
                  Continuar
                </Button>
              ) : (
                <Button key="finish" type="submit" variant="primary" large loading={saving} disabled={!complete}>
                  Empezar mi plan
                </Button>
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

function Field({ id, label, value, onChange, error, placeholder }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <span id={`${id}-error`} className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

