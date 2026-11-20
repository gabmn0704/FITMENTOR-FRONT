import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import {
  Activity,
  Bot,
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  Monitor,
  Moon,
  Sun,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "../ui";
import { Logo, LogoMark } from "../../brand/Logo";
import { ConfettiHost } from "../motion/Confetti";
import { loadGsap } from "../motion/useGsap";
import { EngagementHost } from "../engage/EngagementHost";
import { Flame } from "../engage/Engage";
import { levelFromXp, readEngagement, totalXp } from "../../lib/engagement";
import { readLocalSessions } from "../../lib/sessions";
import { computeLocalStats } from "../../lib/stats";
import { ROUTES, routeHref, type RouteId } from "../../lib/routes";
import { isGuest, levelLabel } from "../../lib/contract";
import { useTheme, type ThemeChoice } from "../../hooks/useTheme";
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

/** En móvil la píldora inferior muestra cinco destinos; el resto se alcanza desde Inicio. */
const MOBILE_ROUTES: RouteId[] = ["inicio", "entrenar", "progreso", "coach", "perfil"];

const THEME_OPTIONS: Array<{ value: ThemeChoice; label: string; icon: LucideIcon }> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

interface AppShellProps {
  route: RouteId;
  user: UserType | null;
  onNavigate: (route: RouteId) => void;
  children: ReactNode;
}

function greeting(hour: number): string {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Indicador que se desliza bajo el destino activo: mide el enlace actual y mueve una sola pieza con transform,
 * así el cambio es fluido (sin saltos de layout) y se recalcula si cambia el tamaño del contenedor.
 */
function useSlidingIndicator(container: RefObject<HTMLElement>, indicator: RefObject<HTMLElement>, active: string) {
  useLayoutEffect(() => {
    const host = container.current;
    const pill = indicator.current;
    if (!host || !pill) return;
    const place = () => {
      const link = host.querySelector<HTMLElement>(`[data-route="${active}"]`);
      if (!link) {
        pill.style.opacity = "0";
        return;
      }
      pill.style.opacity = "1";
      pill.style.setProperty("--ind-x", `${link.offsetLeft}px`);
      pill.style.setProperty("--ind-y", `${link.offsetTop}px`);
      pill.style.setProperty("--ind-w", `${link.offsetWidth}px`);
      pill.style.setProperty("--ind-h", `${link.offsetHeight}px`);
    };
    place();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(place);
    observer.observe(host);
    return () => observer.disconnect();
  }, [container, indicator, active]);
}

function NavLink({ id, current, onNavigate }: { id: RouteId; current: RouteId; onNavigate: (r: RouteId) => void }) {
  const Icon = ICONS[id];
  const label = ROUTES.find((r) => r.id === id)?.label ?? id;
  return (
    <a
      className="nav-link"
      data-route={id}
      href={routeHref(id)}
      aria-current={current === id ? "page" : undefined}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(id);
      }}
    >
      <Icon size={20} strokeWidth={current === id ? 2.3 : 1.9} aria-hidden="true" />
      <span className="nav-link__label">{label}</span>
    </a>
  );
}

/** Selector de tema de tres posiciones con una perilla que se desliza. */
function ThemeSwitch({ theme, setTheme }: { theme: ThemeChoice; setTheme: (next: ThemeChoice) => void }) {
  const index = Math.max(0, THEME_OPTIONS.findIndex((option) => option.value === theme));
  const next = THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length]!;
  const CurrentIcon = THEME_OPTIONS[index]!.icon;
  return (
    <>
      <div className="theme-switch" role="radiogroup" aria-label="Tema de color" style={{ "--idx": index } as CSSProperties}>
        <span className="theme-switch__thumb" aria-hidden="true" />
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            aria-label={`Tema ${label.toLowerCase()}`}
            title={label}
            onClick={() => setTheme(value)}
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
      <button
        type="button"
        className="theme-cycle"
        aria-label={`Tema: ${THEME_OPTIONS[index]!.label.toLowerCase()}. Cambiar a ${next.label.toLowerCase()}`}
        title={`Cambiar a tema ${next.label.toLowerCase()}`}
        onClick={() => setTheme(next.value)}
      >
        <CurrentIcon size={18} aria-hidden="true" />
      </button>
    </>
  );
}

export function AppShell({ route, user, onNavigate, children }: AppShellProps) {
  const railNav = useRef<HTMLElement>(null);
  const railIndicator = useRef<HTMLSpanElement>(null);
  const dockNav = useRef<HTMLElement>(null);
  const dockIndicator = useRef<HTMLSpanElement>(null);
  useSlidingIndicator(railNav, railIndicator, route);
  useSlidingIndicator(dockNav, dockIndicator, route);
  const { theme, setTheme } = useTheme();

  // Racha y nivel del encabezado: salen de las sesiones guardadas; se recalculan al cambiar de pantalla.
  const pulse = useMemo(() => {
    const sessions = readLocalSessions();
    const streak = computeLocalStats(sessions).streakDays;
    const level = levelFromXp(totalXp(sessions, readEngagement(user?.id).completed));
    return { streak, level };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, user?.id]);

  const now = new Date();
  const firstName = user?.name?.split(" ")[0] ?? "";
  const today = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(now);

  // Cada pantalla nueva empieza arriba; GSAP se descarga en segundo plano para las animaciones de scroll.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [route]);
  useEffect(() => {
    void loadGsap().catch(() => undefined);
  }, []);

  // Atajos globales: las teclas 1 a 7 abren cada sección (se ignoran al escribir o con modificadores).
  const navigate = useRef(onNavigate);
  navigate.current = onNavigate;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const index = Number(event.key) - 1;
      const next = Number.isInteger(index) ? ROUTES[index] : undefined;
      if (next) navigate.current(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>

      <aside className="rail">
        <div className="rail__brand">
          <Logo size={34} tone="brand" />
          <span className="rail__mark">
            <LogoMark size={36} tone="brand" />
          </span>
        </div>

        <nav className="rail__nav" aria-label="Navegación principal" ref={railNav}>
          <span className="nav-indicator" aria-hidden="true" ref={railIndicator} />
          {ROUTES.map((r) => (
            <NavLink key={r.id} id={r.id} current={route} onNavigate={onNavigate} />
          ))}
        </nav>

        <div className="rail__foot">
          <ThemeSwitch theme={theme} setTheme={setTheme} />
          {user && (
            <div className="rail__user">
              <Avatar name={user.name} picture={user.picture} />
              <div className="rail__user-text">
                <strong>{user.name}</strong>
                <span>{isGuest(user) ? `Invitado · ${levelLabel(user.level)}` : levelLabel(user.level)}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="main" id="main" tabIndex={-1}>
        <header className="topbar">
          <span className="topbar__mark" aria-hidden="true">
            <LogoMark size={32} tone="brand" animated={false} />
          </span>
          <div className="topbar__hello">
            <span className="topbar__greet">
              {greeting(now.getHours())}
              {firstName ? `, ${firstName}` : ""}
            </span>
            <span className="topbar__date">{today}</span>
          </div>
          <div className="topbar__pulse">
            <span className={`pulse-chip ${pulse.streak > 0 ? "is-hot" : ""}`} title="Racha de días seguidos">
              <Flame lit={pulse.streak > 0} size={16} />
              <b className="tabular">{pulse.streak}</b>
              <span className="pulse-chip__unit">{pulse.streak === 1 ? "día" : "días"}</span>
              <span className="sr-only">de racha</span>
            </span>
            <span
              className="pulse-chip pulse-chip--level"
              title={`Nivel ${pulse.level.level}: ${pulse.level.title}`}
              style={{ "--lvl": `${pulse.level.percent}%` } as CSSProperties}
            >
              <span className="pulse-chip__ring" aria-hidden="true">
                <b className="tabular">{pulse.level.level}</b>
              </span>
              <span className="pulse-chip__title">{pulse.level.title}</span>
              <span className="sr-only">Nivel {pulse.level.level}</span>
            </span>
            <span className="topbar__theme">
              <ThemeSwitch theme={theme} setTheme={setTheme} />
            </span>
          </div>
        </header>

        <div className="main__inner">{children}</div>
      </main>

      <ConfettiHost />
      <EngagementHost userId={user?.id} route={route} />

      <nav className="dock" aria-label="Navegación móvil" ref={dockNav}>
        <span className="dock__indicator" aria-hidden="true" ref={dockIndicator} />
        {MOBILE_ROUTES.map((id) => (
          <NavLink key={id} id={id} current={route} onNavigate={onNavigate} />
        ))}
      </nav>
    </div>
  );
}
