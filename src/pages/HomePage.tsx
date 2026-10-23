import { useMemo, type CSSProperties } from "react";
import { ArrowRight, Flame, Sparkles } from "lucide-react";
import { Button, Card, EmptyState, ProgressRing } from "../components/ui";
import { CountUp } from "../components/motion/CountUp";
import { useAuth } from "../hooks/useAuth";
import { useAsync } from "../hooks/useAsync";
import { achievementsApi, routineApi, statsApi } from "../lib/services";
import { readLocalSessions } from "../lib/sessions";
import { computeLocalStats, weeklyProgress, WEEKLY_GOAL_REPS } from "../lib/stats";
import { suggestNextExercise } from "../lib/suggest";
import { exerciseLabel } from "../lib/exercises";
import { achievementText, progressPercent, routineNote, routineReason } from "../lib/contract";
import type { RouteId } from "../lib/routes";
import type { Stats } from "../types";

const MOTIVATION = [
  "Una repetición más y ya eres otro.",
  "La técnica de hoy es la fuerza de mañana.",
  "No necesitas ganas, necesitas empezar.",
  "Constancia le gana al talento.",
  "Hazlo bien, hazlo lento, hazlo hoy.",
  "Tu cuerpo sigue lo que tu cabeza repite.",
  "Cada sesión suma, aunque no lo notes.",
];

function motivationOfTheDay(date: Date): string {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000);
  return MOTIVATION[dayOfYear % MOTIVATION.length];
}

function greeting(hour: number): string {
  if (hour < 13) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

interface HomePageProps {
  onNavigate: (route: RouteId) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { token, user } = useAuth();
  const local = useMemo(() => computeLocalStats(readLocalSessions()), []);

  const stats = useAsync(() => statsApi.get(token!), [token], Boolean(token));
  const routine = useAsync(() => routineApi.get(token!), [token], Boolean(token));
  const achievements = useAsync(() => achievementsApi.list(token!), [token], Boolean(token));

  const data: Stats = stats.data ?? local;
  const goal = weeklyProgress(data);
  const suggestion = suggestNextExercise(data.byExercise);
  const name = user?.name?.split(" ")[0] ?? "";
  const topAchievements = (achievements.data ?? [])
    .slice()
    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || progressPercent(b) - progressPercent(a))
    .slice(0, 3);

  return (
    <div className="stack">
      <section className="poster-hero rise" style={{ "--i": 0 } as CSSProperties} aria-labelledby="home-title">
        <div className="poster-hero__copy">
          <p className="poster-hero__hello">
            {greeting(new Date().getHours())}
            {name ? `, ${name}` : ""}
          </p>
          <h1 id="home-title">
            Hoy se
            <br />
            entrena.
          </h1>
          <p className="poster-hero__lead">
            {data.streakDays > 0
              ? `Llevas ${data.streakDays} ${data.streakDays === 1 ? "día" : "días"} seguidos. No la rompas.`
              : "Tu racha empieza con una sesión. Te acompañamos con la técnica."}
          </p>
          <div className="row">
            <button type="button" className="poster-btn" onClick={() => onNavigate("entrenar")}>
              Entrenar ahora
              <ArrowRight size={20} aria-hidden="true" />
            </button>
            {data.streakDays > 0 && (
              <span className="poster-streak" aria-label={`Racha de ${data.streakDays} días`}>
                <Flame size={20} aria-hidden="true" /> {data.streakDays} días
              </span>
            )}
          </div>
        </div>
        <div className="poster-hero__media" aria-hidden="true">
          <img src="/img/studio.jpg" alt="" />
        </div>
        <div className="poster-hero__goal">
          <ProgressRing value={goal.percent} size={150} stroke={14} label={`Meta semanal ${goal.percent} por ciento`}>
            <strong className="tabular"><CountUp value={goal.percent} suffix="%" /></strong>
            <span>
              {goal.reps} / {WEEKLY_GOAL_REPS} reps
            </span>
          </ProgressRing>
          <p>Meta semanal</p>
        </div>
      </section>

      <section className="motivation-strip rise" style={{ "--i": 1 } as CSSProperties} aria-label="Frase del día">
        <p>{motivationOfTheDay(new Date())}</p>
      </section>

      {stats.error && (
        <p className="muted" style={{ fontSize: 13 }}>
          Mostramos tus datos guardados en este dispositivo: no pudimos actualizar el servidor.
        </p>
      )}

      <section className="stats-row" aria-label="Resumen">
        <div className="tile tile--orange rise" style={{ "--i": 2 } as CSSProperties}>
          <span className="tile__value tabular"><CountUp value={data.totalSessions} /></span>
          <span className="tile__label">sesiones</span>
        </div>
        <div className="tile tile--bone rise" style={{ "--i": 3 } as CSSProperties}>
          <span className="tile__value tabular"><CountUp value={data.totalReps} /></span>
          <span className="tile__label">repeticiones</span>
        </div>
        <div className="tile tile--lime rise" style={{ "--i": 4 } as CSSProperties}>
          <span className="tile__value tabular"><CountUp value={data.avgAccuracy} suffix="%" /></span>
          <span className="tile__label">precisión media</span>
        </div>
        <div className="tile tile--yellow rise" style={{ "--i": 5 } as CSSProperties}>
          <span className="tile__value tabular"><CountUp value={data.totalCalories} /></span>
          <span className="tile__label">kcal estimadas</span>
        </div>
      </section>

      <div className="home-split">
        <Card title="Rutina de hoy" eyebrow="Plan IA" action={<Button variant="ghost" onClick={() => onNavigate("rutina")}>Ver rutina</Button>}>
          {!token && <EmptyState title="Inicia sesión para ver tu rutina">Tu plan se adapta a tu nivel y progreso.</EmptyState>}
          {token && routine.loading && <div className="skeleton" style={{ height: 160 }} aria-label="Cargando rutina" />}
          {token && routine.error && <EmptyState title="Rutina no disponible">Vuelve a intentarlo más tarde.</EmptyState>}
          {routine.data && (
            <div className="stack" style={{ gap: 10 }}>
              {routine.data.items.slice(0, 4).map((item, index) => (
                <div className="routine-item" key={`${item.exercise}-${index}`}>
                  <span className="routine-item__index">{index + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <strong>{exerciseLabel(item.exercise)}</strong>
                    <div className="routine-item__meta">
                      {item.sets} × {item.reps} · {routineNote(item.note)}
                    </div>
                  </div>
                </div>
              ))}
              <p className="muted" style={{ fontSize: 13 }}>{routineReason(routine.data.reason, routine.data.level)}</p>
            </div>
          )}
        </Card>

        <div className="stack">
          <Card title="Siguiente ejercicio" eyebrow="Sugerencia">
            <p style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600 }}>
              {exerciseLabel(suggestion.exercise)}
            </p>
            <p className="muted" style={{ marginTop: 6 }}>
              {suggestion.reason}
            </p>
            <Button variant="ghost" block style={{ marginTop: 16 }} onClick={() => onNavigate("entrenar")} icon={<Sparkles size={16} />}>
              Probar ahora
            </Button>
          </Card>

          <Card title="Logros" eyebrow="Tu progreso" action={<Button variant="ghost" onClick={() => onNavigate("logros")}>Todos</Button>}>
            {!token && <p className="muted">Inicia sesión para ver tus logros.</p>}
            {token && achievements.loading && <div className="skeleton" style={{ height: 120 }} />}
            <div className="stack" style={{ gap: 12 }}>
              {topAchievements.map((achievement) => (
                <div key={achievement.id}>
                  <div className="row" style={{ justifyContent: "space-between", fontSize: 14 }}>
                    <strong>{achievementText(achievement).title}</strong>
                    <span className="muted tabular">{progressPercent(achievement)}%</span>
                  </div>
                  <div className="bar" style={{ marginTop: 6 }}>
                    <div className="bar__fill" style={{ width: `${progressPercent(achievement)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
