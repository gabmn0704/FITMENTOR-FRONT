import { useMemo, useRef, type CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, Camera, Clock, Droplets, Flame as FlameIcon, Repeat, Sparkles, Target, Timer } from "lucide-react";
import { Button, Card } from "../components/ui";
import { BarChart } from "../components/charts/BarChart";
import { Odometer } from "../components/motion/Odometer";
import { useGsap } from "../components/motion/useGsap";
import { Mascot } from "../components/mascot/Mascot";
import { ChallengesCard, GoalCard, LevelCard, MedalStrip, MentorQuote, StreakCard } from "../components/engage/Engage";
import { useEngagement } from "../components/engage/useEngagement";
import type { MascotState } from "../lib/mascot";
import { useAuth } from "../hooks/useAuth";
import { useAsync } from "../hooks/useAsync";
import { useProfile } from "../hooks/useProfile";
import { currentWeek, goalName, type BodyProfile } from "../lib/profile";
import { nutritionTargets } from "../lib/nutrition";
import { buildWeekPlan, todayIndex, type DayPlan } from "../lib/weeklyPlan";
import { achievementsApi, routineApi, statsApi } from "../lib/services";
import { readLocalSessions } from "../lib/sessions";
import { computeLocalStats, weeklyProgress, WEEKLY_GOAL_REPS } from "../lib/stats";
import { suggestNextExercise } from "../lib/suggest";
import { exerciseLabel } from "../lib/exercises";
import { weekdayLabel } from "../lib/format";
import { CATALOG, catalogLabel } from "../lib/catalog";
import { catalogArt, EXERCISE_ART } from "../lib/exerciseArt";
import { setPendingExercise } from "../lib/pendingExercise";
import { achievementText, progressPercent, routineNote, routineReason } from "../lib/contract";
import type { RouteId } from "../lib/routes";
import type { Stats } from "../types";

interface HomePageProps {
  onNavigate: (route: RouteId) => void;
}

/** Combustible del día: calorías y macros del plan de alimentación según si hoy se entrena o se descansa. */
function FuelCard({ profile, day, onNavigate }: { profile: BodyProfile; day: DayPlan; onNavigate: (route: RouteId) => void }) {
  const training = day.kind === "train";
  const targets = nutritionTargets(profile, training);
  const macros = [
    { key: "protein", label: "Proteína", grams: targets.proteinG, kcal: targets.proteinG * 4 },
    { key: "carbs", label: "Carbohidratos", grams: targets.carbsG, kcal: targets.carbsG * 4 },
    { key: "fat", label: "Grasas", grams: targets.fatG, kcal: targets.fatG * 9 },
  ];
  const total = Math.max(1, macros.reduce((sum, macro) => sum + macro.kcal, 0));
  return (
    <section className="bento-card fuel-card" aria-labelledby="fuel-title">
      <header className="bento-card__head">
        <span className="engage-label">
          <FlameIcon size={14} aria-hidden="true" /> Combustible de hoy
        </span>
        <span className="chip">{training ? "Día de entreno" : "Día de descanso"}</span>
      </header>
      <h2 id="fuel-title" className="fuel-card__title">
        {training ? day.title : "Hoy descansas"}
      </h2>
      <p className="fuel-card__lead">
        {training ? `${day.items.length} ejercicios, unos ${day.minutes} minutos.` : "Camina, estira y duerme bien: así también se progresa."}
      </p>
      <div className="fuel-card__kcal">
        <strong className="tabular">
          <Odometer value={targets.kcal} stagger={60} />
        </strong>
        <span>kcal para hoy</span>
      </div>
      <ul className="macro-list">
        {macros.map((macro) => (
          <li key={macro.key} className={`macro macro--${macro.key}`}>
            <span className="macro__label">{macro.label}</span>
            <span className="macro__track" aria-hidden="true">
              <span style={{ "--fill": `${Math.round((macro.kcal / total) * 100)}%` } as CSSProperties} />
            </span>
            <span className="macro__value tabular">{macro.grams} g</span>
          </li>
        ))}
      </ul>
      <div className="fuel-card__foot">
        <span className="fuel-card__water">
          <Droplets size={16} aria-hidden="true" /> {targets.waterL} L de agua
        </span>
        <Button variant="ghost" onClick={() => onNavigate("rutina")} icon={<ArrowRight size={16} />}>
          Ver mi día
        </Button>
      </div>
    </section>
  );
}

/** Mazo del plan de hoy: cada ejercicio es una tarjeta que se apila sobre la anterior al desplazar. */
function PlanDeck({ day, onNavigate }: { day: DayPlan; onNavigate: (route: RouteId) => void }) {
  if (day.kind !== "train" || day.items.length === 0) return null;
  return (
    <section className="plan-deck" aria-labelledby="deck-title">
      <header className="section-head">
        <div>
          <h2 id="deck-title">
            Tu plan de hoy, <span>ejercicio por ejercicio.</span>
          </h2>
          <p>{day.focus}</p>
        </div>
        <Button variant="ghost" onClick={() => onNavigate("rutina")} icon={<ArrowUpRight size={16} />}>
          Ver la semana
        </Button>
      </header>
      <ol className="deck">
        {day.items.map((item, index) => {
          const entry = CATALOG[item.exercise];
          const unit = item.unit === "seconds" ? "s" : "reps";
          return (
            <li className="deck__card" key={`${item.exercise}-${index}`} style={{ "--i": index } as CSSProperties}>
              <div className="deck__media" aria-hidden="true">
                <img src={catalogArt(item.exercise)} alt="" loading="lazy" decoding="async" />
                <span className="deck__index tabular">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="deck__body">
                <span className="deck__muscle">{entry.muscle}</span>
                <h3>{catalogLabel(item.exercise)}</h3>
                <p className="deck__note">{item.note}</p>
                <dl className="deck__facts">
                  <div>
                    <dt>
                      <Repeat size={14} aria-hidden="true" /> Series
                    </dt>
                    <dd className="tabular">
                      {item.sets} × {item.target}
                      <small> {unit}{item.perSide ? " por lado" : ""}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <Timer size={14} aria-hidden="true" /> Descanso
                    </dt>
                    <dd className="tabular">
                      {item.restSec}
                      <small> s</small>
                    </dd>
                  </div>
                </dl>
                {item.engine ? (
                  <Button
                    variant="primary"
                    icon={<Camera size={16} />}
                    onClick={() => {
                      setPendingExercise({ engine: item.engine!, variant: item.exercise });
                      onNavigate("entrenar");
                    }}
                  >
                    Entrenar con cámara
                  </Button>
                ) : (
                  <Button variant="ghost" icon={<ArrowRight size={16} />} onClick={() => onNavigate("rutina")}>
                    Ver la guía
                  </Button>
                )}
              </div>
              <span className="deck__shade" aria-hidden="true" />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function HomePage({ onNavigate }: HomePageProps) {
  const root = useRef<HTMLDivElement>(null);
  const { token, user } = useAuth();
  const { profile } = useProfile();
  const local = useMemo(() => computeLocalStats(readLocalSessions()), []);

  const stats = useAsync(() => statsApi.get(token!), [token], Boolean(token));
  const routine = useAsync(() => routineApi.get(token!), [token], Boolean(token));
  const achievements = useAsync(() => achievementsApi.list(token!), [token], Boolean(token));

  const data: Stats = stats.data ?? local;
  const goal = weeklyProgress(data);
  const streak = Math.max(data.streakDays, local.streakDays);
  const engage = useEngagement(user?.id, streak);
  const heroMood: MascotState = streak >= 3 ? "cheer" : streak > 0 ? "wave" : engage.hasSessions ? "worried" : "wave";
  const heroMessage =
    streak >= 3
      ? `¡${streak} días seguidos! No la vayamos a soltar.`
      : streak > 0
        ? "¡Ahí vamos! Hoy sumamos otro día."
        : engage.hasSessions
          ? "Se me extrañó por acá. Retomemos suave, ¿sí?"
          : "¡Quiubo! Soy Rep. Yo cuento, usted se luce.";
  const suggestion = suggestNextExercise(data.byExercise);
  const name = user?.name?.split(" ")[0] ?? "";
  const topAchievements = (achievements.data ?? [])
    .slice()
    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || progressPercent(b) - progressPercent(a))
    .slice(0, 3);
  const day = profile ? buildWeekPlan(profile, user?.level ?? "BEGINNER", currentWeek(profile)).days[todayIndex()] : null;

  // Movimiento ligado al scroll: la foto del héroe se desplaza lento, las tarjetas del plan se apilan
  // (la de atrás se encoge y se oscurece) y la frase de Rep se enciende palabra por palabra.
  useGsap(
    root,
    ({ gsap, reduce }) => {
      if (reduce) return;
      const hero = root.current?.querySelector(".hero");
      const photo = hero?.querySelector(".hero__media img");
      if (hero && photo) {
        gsap.fromTo(
          photo,
          { yPercent: -4, scale: 1.08 },
          { yPercent: 8, scale: 1.14, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } },
        );
      }

      const cards = gsap.utils.toArray<HTMLElement>(".deck__card");
      cards.forEach((card, index) => {
        const next = cards[index + 1];
        if (!next) return;
        const timeline = gsap.timeline({
          scrollTrigger: { trigger: next, start: "top bottom-=80", end: "top top+=140", scrub: true },
        });
        timeline.to(card, { scale: 0.94, ease: "none" }, 0);
        timeline.to(card.querySelector(".deck__shade"), { opacity: 0.55, ease: "none" }, 0);
      });

      const words = gsap.utils.toArray<HTMLElement>(".mentor-scrub .scrub-word");
      if (words.length) {
        gsap.fromTo(
          words,
          { opacity: 0.16 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.12,
            scrollTrigger: { trigger: ".mentor-scrub", start: "top 78%", end: "bottom 55%", scrub: 0.6 },
          },
        );
      }
    },
    [day?.items.length],
  );

  return (
    <div className="home" ref={root}>
      <section className="bento" aria-label="Tu día">
        <article className="bento-card hero ink-field" aria-labelledby="home-title" style={{ "--i": 0 } as CSSProperties}>
          <div className="hero__media" aria-hidden="true">
            <img src="/img/studio.jpg" alt="" decoding="async" />
          </div>
          <div className="hero__copy">
            {profile && (
              <span className="hero__eyebrow">
                <span className="live-dot" aria-hidden="true" />
                Semana {currentWeek(profile)} de {profile.weeks} · {goalName(profile.goal)}
              </span>
            )}
            <h1 id="home-title" className="hero__title">
              <span className="mask">
                <span>
                  Hoy se{" "}
                  <span className="hero__pill" aria-hidden="true">
                    <img src="/img/core.jpg" alt="" decoding="async" />
                  </span>
                </span>
              </span>
              <span className="mask">
                <span>
                  entrena<span className="hero__dot">.</span>
                </span>
              </span>
            </h1>
            <p className="hero__lead">
              {name ? `${name}, ` : ""}
              {streak > 0
                ? `llevas ${streak} ${streak === 1 ? "día" : "días"} seguidos. Rep cuenta, la cámara corrige y tú te luces.`
                : "tu racha empieza con una sesión. Rep cuenta, la cámara corrige y tú te luces."}
            </p>
            <div className="hero__actions">
              <Button variant="primary" large onClick={() => onNavigate("entrenar")} icon={<ArrowRight size={20} />}>
                Entrenar ahora
              </Button>
              <Button variant="ghost" large onClick={() => onNavigate("rutina")}>
                Ver mi plan
              </Button>
            </div>
          </div>
          <div className="hero__mascot">
            <Mascot state={heroMood} size={150} message={heroMessage} placement="top" interactive />
          </div>
        </article>

        <GoalCard
          goal={engage.goal}
          onGoal={engage.setGoal}
          size={200}
          reps={{ done: goal.reps, total: WEEKLY_GOAL_REPS, percent: goal.percent }}
        />

        {profile && day ? (
          <FuelCard profile={profile} day={day} onNavigate={onNavigate} />
        ) : (
          <section className="bento-card fuel-card" aria-label="Tu plan">
            <span className="engage-label">
              <Target size={14} aria-hidden="true" /> Tu plan
            </span>
            <h2 className="fuel-card__title">Arma tu plan en un minuto</h2>
            <p className="fuel-card__lead">Cuéntanos tu meta y FitMentor ajusta la rutina y la alimentación.</p>
            <Button variant="ghost" onClick={() => onNavigate("perfil")} icon={<ArrowRight size={16} />}>
              Completar perfil
            </Button>
          </section>
        )}
        <StreakCard streak={streak} week={engage.week} />
        <LevelCard level={engage.level} />
        <ChallengesCard challenges={engage.challenges} />
      </section>

      <section className="stat-strip" aria-label="Tus números">
        {[
          { label: "Sesiones", value: data.totalSessions, suffix: "", icon: Clock, note: "en total" },
          { label: "Repeticiones", value: data.totalReps, suffix: "", icon: Repeat, note: "contadas por la IA" },
          { label: "Precisión media", value: data.avgAccuracy, suffix: "%", icon: Target, note: "de técnica" },
          { label: "Kcal estimadas", value: data.totalCalories, suffix: "", icon: FlameIcon, note: "quemadas" },
        ].map(({ label, value, suffix, icon: Icon, note }, index) => (
          <div className={`stat-tile ${index === 2 ? "stat-tile--accent" : ""}`} key={label} style={{ "--i": index } as CSSProperties}>
            <span className="stat-tile__label">
              <Icon size={15} aria-hidden="true" /> {label}
            </span>
            <span className="stat-tile__value">
              <Odometer value={value} suffix={suffix} />
            </span>
            <span className="stat-tile__note">{note}</span>
          </div>
        ))}
      </section>

      {day && <PlanDeck day={day} onNavigate={onNavigate} />}

      <section className="mentor-scrub" aria-label="Frase del día">
        <MentorQuote userId={user?.id} state={streak > 0 ? "cheer" : "idle"} size={150} />
      </section>

      <section className="bento bento--lower" aria-label="Tu semana y tus logros">
        <Card as="section" title="Tu semana" className="bento-card week-card">
          <BarChart
            label="Repeticiones de los últimos siete días"
            data={data.weekly.map((d) => ({ label: weekdayLabel(d.date), value: d.reps }))}
          />
        </Card>

        <section className="bento-card medals-card" aria-labelledby="medals-title">
          <header className="bento-card__head">
            <h2 id="medals-title" className="bento-card__title">
              Medallas
            </h2>
            <Button variant="ghost" onClick={() => onNavigate("logros")} icon={<ArrowUpRight size={16} />}>
              Todas
            </Button>
          </header>
          <MedalStrip badges={engage.badges} />
          {topAchievements.length > 0 && (
            <ul className="server-achievements">
              {topAchievements.map((achievement) => (
                <li key={achievement.id}>
                  <div className="server-achievements__row">
                    <strong>{achievementText(achievement).title}</strong>
                    <span className="tabular">
                      <Odometer value={progressPercent(achievement)} suffix="%" stagger={60} />
                    </span>
                  </div>
                  <div className="bar">
                    <div className="bar__fill" style={{ width: `${progressPercent(achievement)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bento-card next-card" aria-labelledby="next-title">
          <div className="next-card__media" aria-hidden="true">
            <img src={EXERCISE_ART[suggestion.exercise]} alt="" loading="lazy" decoding="async" />
          </div>
          <div className="next-card__body">
            <span className="engage-label">
              <Sparkles size={14} aria-hidden="true" /> Siguiente ejercicio
            </span>
            <h2 id="next-title">{exerciseLabel(suggestion.exercise)}</h2>
            <p>{suggestion.reason}</p>
            <Button variant="primary" onClick={() => onNavigate("entrenar")} icon={<ArrowRight size={16} />}>
              Probar ahora
            </Button>
          </div>
        </section>

        {routine.data && Array.isArray(routine.data.items) && (
          <section className="bento-card routine-card" aria-labelledby="routine-title">
            <header className="bento-card__head">
              <h2 id="routine-title" className="bento-card__title">
                Rutina sugerida por la IA
              </h2>
              <Button variant="ghost" onClick={() => onNavigate("rutina")}>
                Ver rutina
              </Button>
            </header>
            <ol className="routine-list">
              {routine.data.items.slice(0, 4).map((item, index) => (
                <li className="routine-item" key={`${item.exercise}-${index}`}>
                  <span className="routine-item__index tabular">{index + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <strong>{exerciseLabel(item.exercise)}</strong>
                    <div className="routine-item__meta">
                      {item.sets} × {item.reps} · {routineNote(item.note)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <p className="muted" style={{ fontSize: 13 }}>
              {routineReason(routine.data.reason, routine.data.level)}
            </p>
          </section>
        )}
      </section>

      {stats.error && (
        <p className="home__note" role="status">
          Mostramos tus datos guardados en este dispositivo: no pudimos actualizar el servidor.
        </p>
      )}
    </div>
  );
}
