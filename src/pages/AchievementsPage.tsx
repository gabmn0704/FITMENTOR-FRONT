import { useMemo, type CSSProperties } from "react";
import { Award, Lock } from "lucide-react";
import { Card, EmptyState, Notice } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useAsync } from "../hooks/useAsync";
import { achievementsApi } from "../lib/services";
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

  return (
    <div className="stack">
      <header className="page-header" data-banner="ropes">
        <p className="eyebrow">Insignias</p>
        <h1>Logros</h1>
        <p>
          {achievements.data
            ? `${unlocked} de ${sorted.length} desbloqueados. Cada insignia refleja constancia real.`
            : "Desbloquea insignias entrenando con constancia."}
        </p>
      </header>

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
                <span className={`chip ${achievement.unlocked ? "chip--lime" : ""}`}>
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
              <span className="muted tabular" style={{ fontSize: 12 }}>
                {percent}%
              </span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
