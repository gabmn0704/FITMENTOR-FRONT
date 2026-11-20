import { useMemo, type CSSProperties } from "react";
import { Award, Lock } from "lucide-react";
import { PageMascot } from "../components/mascot/PageMascot";
import { BadgeGrid } from "../components/engage/Engage";
import { useEngagement } from "../components/engage/useEngagement";
import { Card, EmptyState, Notice } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useAsync } from "../hooks/useAsync";
import { achievementsApi } from "../lib/services";
import { Odometer } from "../components/motion/Odometer";
import { achievementText, progressPercent } from "../lib/contract";

export function AchievementsPage() {
  const { token } = useAuth();
  const achievements = useAsync(() => achievementsApi.list(token!), [token], Boolean(token));

  const sorted = useMemo(
    () =>
      (achievements.data ?? [])
        .slice()
        .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || progressPercent(b) - progressPercent(a)),
    [achievements.data],
  );
  const unlocked = sorted.filter((a) => a.unlocked).length;
  const { user } = useAuth();
  const engage = useEngagement(user?.id, 0);
  const medals = engage.badges.filter((b) => b.percent >= 100).length;

  return (
    <div className="stack">
      <header className="page-header" data-banner="ropes">
        <PageMascot state={medals > 0 ? "celebrate" : "cheer"} />
        <h1>Logros</h1>
        <p>
          {achievements.data
            ? `${unlocked} de ${sorted.length} desbloqueados. Cada insignia refleja constancia real.`
            : "Desbloquea insignias entrenando con constancia."}
        </p>
      </header>

      <section className="stack" aria-labelledby="medals-title" style={{ gap: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 id="medals-title" style={{ fontSize: 28 }}>Medallas de Rep</h2>
          <span className="chip chip--cobalt tabular">
            {medals} / {engage.badges.length}
          </span>
        </div>
        <BadgeGrid badges={engage.badges} />
      </section>

      {!token && <Notice tone="info">Inicia sesión para ver tus logros.</Notice>}
      {token && achievements.loading && (
        <div className="grid-cards" aria-label="Cargando logros">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 170 }} />
          ))}
        </div>
      )}
      {token && achievements.error && <Notice tone="error">No pudimos cargar los logros: {achievements.error}</Notice>}
      {token && achievements.data && sorted.length === 0 && (
        <EmptyState title="Aún no hay logros">Tu primera sesión abrirá el camino.</EmptyState>
      )}

      <div className="grid-cards">
        {sorted.map((achievement, index) => {
          const percent = progressPercent(achievement);
          const text = achievementText(achievement);
          return (
            <Card
              as="article"
              key={achievement.id}
              interactive
              className={`achievement rise ${achievement.unlocked ? "achievement--unlocked" : "achievement--locked"}`}
              style={{ ["--i" as string]: Math.min(index, 8) } as CSSProperties}
              aria-label={`${text.title}, ${achievement.unlocked ? "desbloqueado" : `${percent} por ciento`}`}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="achievement__icon" aria-hidden="true">
                  {achievement.unlocked ? <Award size={22} /> : <Lock size={20} />}
                </span>
                <span className={`chip ${achievement.unlocked ? "chip--cobalt" : ""}`}>
                  {achievement.unlocked ? "Desbloqueado" : "En progreso"}
                </span>
              </div>
              <div>
                <h2 style={{ fontSize: 20 }}>{text.title}</h2>
                <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                  {text.description}
                </p>
              </div>
              <div className="bar" aria-hidden="true">
                <div className="bar__fill" style={{ width: `${percent}%` }} />
              </div>
              <span className="achievement__percent tabular">
                <Odometer value={percent} suffix="%" stagger={70} />
              </span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
