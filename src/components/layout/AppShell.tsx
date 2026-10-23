import type { ReactNode } from "react";
import { Activity, Bot, CalendarDays, Dumbbell, LayoutDashboard, Trophy, User, type LucideIcon } from "lucide-react";
import { Avatar } from "../ui";
import { Logo } from "../../brand/Logo";
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
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>

      <aside className="sidebar">
        <div className="brand">
          <Logo size={34} />
        </div>
        <nav className="nav-list" aria-label="Navegación principal">
          {ROUTES.map((r) => (
            <NavLink key={r.id} id={r.id} current={route} onNavigate={onNavigate} />
          ))}
        </nav>
        {user && (
          <div className="sidebar__footer row" style={{ paddingInline: 8 }}>
            <Avatar name={user.name} picture={user.picture} />
            <div className="profile__text" style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: 14 }}>{user.name}</strong>
              <span className="muted" style={{ fontSize: 12 }}>
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
          </div>
          {children}
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {MOBILE_ROUTES.map((id) => (
          <NavLink key={id} id={id} current={route} onNavigate={onNavigate} />
        ))}
      </nav>
    </div>
  );
}
