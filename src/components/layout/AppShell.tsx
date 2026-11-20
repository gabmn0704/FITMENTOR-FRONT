import { useMemo, type CSSProperties, type ReactNode } from "react";
import { Activity, Bot, CalendarDays, Dumbbell, LayoutDashboard, Trophy, User, type LucideIcon } from "lucide-react";
import { Avatar } from "../ui";
import { Logo } from "../../brand/Logo";
import { ConfettiHost } from "../motion/Confetti";
import { EngagementHost } from "../engage/EngagementHost";
import { Flame } from "../engage/Engage";
import { levelFromXp, readEngagement, totalXp } from "../../lib/engagement";
import { readLocalSessions } from "../../lib/sessions";
import { computeLocalStats } from "../../lib/stats";
import { ROUTES, routeHref, type RouteId } from "../../lib/routes";
import { isGuest, levelLabel } from "../../lib/contract";
import type { User as UserType } from "../../types";

const ICONS: Record<RouteId, LucideIcon> = {
  inicio: LayoutDashboard,
  entrenar: Dumbbell,
  progreso: Activity,
  rutina: CalendarDays,
  logros: Trophy,
  coach: Bot,
  perfil: User,
};

/** En móvil la barra inferior muestra cinco destinos; el resto se alcanza desde Inicio. */
const MOBILE_ROUTES: RouteId[] = ["inicio", "entrenar", "progreso", "coach", "perfil"];

interface AppShellProps {
  route: RouteId;
  user: UserType | null;
  onNavigate: (route: RouteId) => void;
  children: ReactNode;
}

function NavLink({ id, current, onNavigate }: { id: RouteId; current: RouteId; onNavigate: (r: RouteId) => void }) {
  const Icon = ICONS[id];
  const label = ROUTES.find((r) => r.id === id)?.label ?? id;
  return (
    <a
      className="nav-link"
      href={routeHref(id)}
      aria-current={current === id ? "page" : undefined}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(id);
      }}
    >
      <Icon size={20} aria-hidden="true" />
      <span className="nav-link__label">{label}</span>
    </a>
  );
}

export function AppShell({ route, user, onNavigate, children }: AppShellProps) {
  const title = ROUTES.find((r) => r.id === route)?.label ?? "Inicio";
  // Racha y nivel del encabezado: salen de las sesiones guardadas; se recalculan al cambiar de pantalla.
  const pulse = useMemo(() => {
    const sessions = readLocalSessions();
    const streak = computeLocalStats(sessions).streakDays;
    const level = levelFromXp(totalXp(sessions, readEngagement(user?.id).completed));
    return { streak, level };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, user?.id]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>

      <aside className="sidebar">
        <div className="brand">
          <Logo size={36} tone="inverse" />
        </div>
        <nav className="nav-list" aria-label="Navegación principal">
          <span
            className="nav-indicator"
            aria-hidden="true"
            style={{ "--idx": Math.max(0, ROUTES.findIndex((r) => r.id === route)) } as CSSProperties}
          />
          {ROUTES.map((r) => (
            <NavLink key={r.id} id={r.id} current={route} onNavigate={onNavigate} />
          ))}
        </nav>
        {user && (
          <div className="sidebar__footer row">
            <Avatar name={user.name} picture={user.picture} />
            <div className="profile__text" style={{ minWidth: 0 }}>
              <strong>{user.name}</strong>
              <span>
                {isGuest(user) ? `Invitado · ${levelLabel(user.level)}` : levelLabel(user.level)}
              </span>
            </div>
          </div>
        )}
      </aside>

      <main className="main" id="main" tabIndex={-1}>
        <div className="main__inner">
          <div className="topbar">
            <span className="topbar__title" aria-hidden="true">
              Mi espacio · {title}
            </span>
            <span className="topbar__pulse">
              <span className={`pulse-chip ${pulse.streak > 0 ? "is-hot" : ""}`} title="Racha de días seguidos">
                <Flame lit={pulse.streak > 0} size={16} />
                <b className="tabular">{pulse.streak}</b>
                <span className="sr-only">días de racha</span>
              </span>
              <span className="pulse-chip" title={`Nivel ${pulse.level.level}: ${pulse.level.title}`}>
                <b className="tabular">NIV {pulse.level.level}</b>
                <span className="pulse-chip__title">{pulse.level.title}</span>
              </span>
            </span>
          </div>
          {children}
        </div>
      </main>

      <ConfettiHost />
      <EngagementHost userId={user?.id} route={route} />

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {MOBILE_ROUTES.map((id) => (
          <NavLink key={id} id={id} current={route} onNavigate={onNavigate} />
        ))}
      </nav>
    </div>
  );
}
