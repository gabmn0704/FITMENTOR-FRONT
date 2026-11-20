import { useEffect, useState, type CSSProperties } from "react";
import { Award, Check, Lock, Minus, Plus, Sparkles, Target } from "lucide-react";
import { Odometer } from "../motion/Odometer";
import { fireConfetti } from "../motion/Confetti";
import { Mascot } from "../mascot/Mascot";
import { WEEKLY_GOAL_RANGE, quoteOfTheDay, type WeekDay } from "../../lib/engagement";
import type { MascotState } from "../../lib/mascot";
import type { useEngagement } from "./useEngagement";

type Engagement = ReturnType<typeof useEngagement>;

/** Llama de racha: tres capas que titilan. Apagada (gris) cuando no hay racha. */
export function Flame({ lit = true, size = 28 }: { lit?: boolean; size?: number }) {
  return (
    <svg className={`flame ${lit ? "flame--lit" : ""}`} width={size} height={(size * 36) / 28} viewBox="0 0 28 36" aria-hidden="true" focusable="false">
      <path className="flame__outer" d="M14 1c1 7 9 11 9 20a9 9 0 0 1-18 0c0-4 2-6 3-9 2 2 3 3 4 3 0-5 1-10 2-14z" />
      <path className="flame__mid" d="M14 12c1 5 6 7 6 13a6 6 0 0 1-12 0c0-3 1-4 2-6 1 1 2 2 3 2 0-3 0-6 1-9z" />
      <path className="flame__core" d="M14 22c1 3 3.5 4 3.5 7a3.5 3.5 0 0 1-7 0c0-2 1-3 1.5-4 .8.6 1.2 1 1.7 1 0-1.6-.2-2.6.3-4z" />
    </svg>
  );
}

function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <ol className="week-strip" aria-label="Días de esta semana">
      {days.map((day, index) => (
        <li
          key={day.key}
          className={["week-strip__day", day.active ? "is-active" : "", day.today ? "is-today" : "", day.future ? "is-future" : ""].join(" ")}
          style={{ "--i": index } as CSSProperties}
          aria-label={`${day.label}: ${day.active ? "entrenaste" : day.future ? "por venir" : "sin sesión"}${day.today ? " (hoy)" : ""}`}
        >
          <span className="week-strip__dot">{day.active ? <Flame size={16} /> : null}</span>
          <span className="week-strip__label">{day.label}</span>
        </li>
      ))}
    </ol>
  );
}

/** Racha diaria con llama y la semana en curso. */
export function StreakCard({ streak, week }: { streak: number; week: WeekDay[] }) {
  const mood = streak >= 7 ? "blaze" : streak >= 3 ? "warm" : streak > 0 ? "spark" : "cold";
  return (
    <section className={`engage-card streak-card streak-card--${mood}`} aria-label="Racha de días">
      <div className="streak-card__head">
        <Flame lit={streak > 0} size={52} />
        <div>
          <span className="engage-label">Racha</span>
          <strong className="streak-card__count tabular">
            <Odometer value={streak} stagger={90} />
            <small>{streak === 1 ? "día" : "días"}</small>
          </strong>
        </div>
      </div>
      <WeekStrip days={week} />
      <p className="engage-note">
        {streak === 0
          ? "Una sesión hoy enciende la llama."
          : streak < 3
            ? "Buen arranque. Con 3 días seguidos la llama crece."
            : streak < 7
              ? "¡Va ardiendo! Siete días y se pone al rojo vivo."
              : "Llama al rojo vivo. Eso es constancia."}
      </p>
    </section>
  );
}

/** Anillo de meta semanal (sesiones) con selector de meta. */
export function GoalCard({ goal, onGoal }: { goal: Engagement["goal"]; onGoal: (value: number) => void }) {
  const size = 150;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - goal.percent / 100);
  const [celebrated, setCelebrated] = useState(false);

  useEffect(() => {
    if (goal.reached && !celebrated) {
      setCelebrated(true);
      const id = window.setTimeout(() => fireConfetti({ x: 0.5, y: 0.35, count: 90 }), 900);
      return () => window.clearTimeout(id);
    }
  }, [goal.reached, celebrated]);

  return (
    <section className={`engage-card goal-card ${goal.reached ? "is-reached" : ""}`} aria-label="Meta semanal">
      <div className="goal-card__ring" role="img" aria-label={`${goal.done} de ${goal.goal} sesiones esta semana`}>
        <svg width={size} height={size} aria-hidden="true">
          <defs>
            <linearGradient id="goal-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff3d1f" />
              <stop offset="1" stopColor="#ffb100" />
            </linearGradient>
          </defs>
          <circle className="goal-card__track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
          <circle
            className="goal-card__value"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ "--circ": circ } as CSSProperties}
          />
        </svg>
        <div className="goal-card__center">
          <strong className="tabular">
            <Odometer value={goal.done} stagger={90} />
            <small>/{goal.goal}</small>
          </strong>
          <span>sesiones</span>
        </div>
      </div>
      <div className="goal-card__side">
        <span className="engage-label">
          <Target size={14} aria-hidden="true" /> Meta semanal
        </span>
        <p className="engage-note">
          {goal.reached
            ? "¡Meta cumplida! Todo lo que sume ahora es de yapa."
            : goal.done === 0
              ? "Arranca la semana con tu primera sesión."
              : `Te faltan ${goal.goal - goal.done} ${goal.goal - goal.done === 1 ? "sesión" : "sesiones"}.`}
        </p>
        <div className="stepper" role="group" aria-label="Sesiones por semana">
          <button type="button" aria-label="Una sesión menos" disabled={goal.goal <= WEEKLY_GOAL_RANGE.min} onClick={() => onGoal(goal.goal - 1)}>
            <Minus size={16} aria-hidden="true" />
          </button>
          <span className="tabular" aria-live="polite">
            {goal.goal} / semana
          </span>
          <button type="button" aria-label="Una sesión más" disabled={goal.goal >= WEEKLY_GOAL_RANGE.max} onClick={() => onGoal(goal.goal + 1)}>
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

/** Nivel y experiencia. */
export function LevelCard({ level }: { level: Engagement["level"] }) {
  return (
    <section className="engage-card level-card" aria-label="Nivel">
      <div className="level-card__badge" aria-hidden="true">
        <span>NIV</span>
        <strong>
          <Odometer value={level.level} />
        </strong>
      </div>
      <div className="level-card__text">
        <span className="engage-label">Nivel de constancia</span>
        <strong className="level-card__title">{level.title}</strong>
        <div className="level-card__bar" role="img" aria-label={`${level.percent} por ciento hacia el siguiente nivel`}>
          <span style={{ "--fill": `${level.percent}%` } as CSSProperties} />
        </div>
        <span className="engage-note tabular">
          {level.xp} XP · faltan {level.toNext} para el siguiente nivel
        </span>
      </div>
    </section>
  );
}

/** Retos del día con avance y marca de cumplido. */
export function ChallengesCard({ challenges }: { challenges: Engagement["challenges"] }) {
  const done = challenges.filter((c) => c.done).length;
  return (
    <section className="engage-card challenges" aria-label="Retos del día">
      <header className="engage-card__head">
        <span className="engage-label">
          <Sparkles size={14} aria-hidden="true" /> Retos de hoy
        </span>
        <span className="chip chip--cobalt tabular">
          {done}/{challenges.length}
        </span>
      </header>
      <ul className="challenge-list">
        {challenges.map((challenge, index) => (
          <li key={challenge.id} className={`challenge ${challenge.done ? "is-done" : ""}`} style={{ "--i": index } as CSSProperties}>
            <span className="challenge__check" aria-hidden="true">
              {challenge.done ? <Check size={16} strokeWidth={3.2} /> : <span>{index + 1}</span>}
            </span>
            <div className="challenge__body">
              <strong>{challenge.title}</strong>
              <div className="challenge__bar" role="img" aria-label={`${challenge.percent} por ciento`}>
                <span style={{ "--fill": `${challenge.done ? 100 : challenge.percent}%` } as CSSProperties} />
              </div>
            </div>
            <span className="challenge__xp tabular">+{challenge.xp} XP</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Frase del día dicha por la mascota. */
export function MentorQuote({ userId, state = "idle" }: { userId?: string; state?: MascotState }) {
  return (
    <section className="engage-card mentor-quote" aria-label="Frase del día del mentor">
      <Mascot state={state} size={132} interactive />
      <blockquote>
        <span className="engage-label">Frase del día del mentor</span>
        <p>{quoteOfTheDay(new Date(), userId)}</p>
      </blockquote>
    </section>
  );
}

/** Rejilla de medallas FitMentor con progreso y desbloqueo animado. */
export function BadgeGrid({ badges, fresh = [] }: { badges: Engagement["badges"]; fresh?: string[] }) {
  return (
    <ul className="badge-grid" aria-label="Medallas FitMentor">
      {badges.map((badge, index) => {
        const unlocked = badge.percent >= 100;
        return (
          <li
            key={badge.id}
            className={`badge ${unlocked ? "is-unlocked" : "is-locked"} ${fresh.includes(badge.id) ? "is-fresh" : ""}`}
            style={{ "--i": index } as CSSProperties}
          >
            <span className="badge__medal" aria-hidden="true">
              {unlocked ? <Award size={26} /> : <Lock size={22} />}
            </span>
            <strong>{badge.title}</strong>
            <span className="badge__desc">{badge.description}</span>
            <span className="badge__bar" aria-hidden="true">
              <span style={{ "--fill": `${badge.percent}%` } as CSSProperties} />
            </span>
            <span className="sr-only">{unlocked ? "Desbloqueada" : `${badge.percent} por ciento`}</span>
          </li>
        );
      })}
    </ul>
  );
}
