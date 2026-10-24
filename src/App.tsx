import { Component, Suspense, lazy, useEffect, type ErrorInfo, type ReactNode } from "react";
import { AppShell } from "./components/layout/AppShell";
import { Button } from "./components/ui";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ProfileProvider, useProfile } from "./hooks/useProfile";
import { useHashRoute } from "./hooks/useHashRoute";
import { usePointerEffects } from "./hooks/usePointerEffects";
import { syncPendingSessions } from "./lib/sessions";
import type { RouteId } from "./lib/routes";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";

/**
 * Las demás pantallas se descargan al abrirlas (y, ya iniciada la sesión, en segundo plano): la pantalla de acceso
 * solo carga lo imprescindible. Entrenar arrastra el detector de postura, que es lo más pesado.
 */
const pageModules = {
  onboarding: () => import("./components/onboarding/Onboarding"),
  train: () => import("./pages/TrainPage"),
  progress: () => import("./pages/ProgressPage"),
  routine: () => import("./pages/RoutinePage"),
  achievements: () => import("./pages/AchievementsPage"),
  coach: () => import("./pages/CoachPage"),
  profile: () => import("./pages/ProfilePage"),
};
const Onboarding = lazy(() => pageModules.onboarding().then((m) => ({ default: m.Onboarding })));
const TrainPage = lazy(() => pageModules.train().then((m) => ({ default: m.TrainPage })));
const ProgressPage = lazy(() => pageModules.progress().then((m) => ({ default: m.ProgressPage })));
const RoutinePage = lazy(() => pageModules.routine().then((m) => ({ default: m.RoutinePage })));
const AchievementsPage = lazy(() => pageModules.achievements().then((m) => ({ default: m.AchievementsPage })));
const CoachPage = lazy(() => pageModules.coach().then((m) => ({ default: m.CoachPage })));
const ProfilePage = lazy(() => pageModules.profile().then((m) => ({ default: m.ProfilePage })));

/** Descarga el resto de pantallas cuando el navegador está libre, para que cambiar de sección sea instantáneo. */
function preloadPages(): void {
  const run = () => {
    for (const load of Object.values(pageModules)) void load().catch(() => undefined);
  };
  const idle = (window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle.call(window, run, { timeout: 4000 });
  else window.setTimeout(run, 1500);
}

function PageFallback() {
  return (
    <div className="stack" aria-label="Cargando">
      <div className="skeleton" style={{ height: 200 }} />
      <div className="skeleton" style={{ height: 120 }} />
      <div className="skeleton" style={{ height: 240 }} />
    </div>
  );
}

/** Evita una pantalla en blanco si una página lanza un error inesperado. */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error de interfaz", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="auth-shell">
        <div className="card login rise">
          <h1>Algo no salió bien</h1>
          <p className="muted">Recarga la página para continuar. Tus sesiones guardadas no se pierden.</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Recargar
          </Button>
        </div>
      </div>
    );
  }
}

function Screens() {
  const { token, user } = useAuth();
  const { profile, skipped } = useProfile();
  const [route, navigate] = useHashRoute();
  usePointerEffects();

  // Al iniciar sesión, sube en segundo plano las sesiones guardadas sin conexión.
  useEffect(() => {
    if (token) void syncPendingSessions(token);
  }, [token]);

  useEffect(() => {
    if (token) preloadPages();
  }, [token]);

  if (!token) return <LoginPage />;
  if (user && !profile && !skipped) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Onboarding />
      </Suspense>
    );
  }

  const page = (id: RouteId) => {
    switch (id) {
      case "entrenar":
        return <TrainPage onNavigate={navigate} />;
      case "progreso":
        return <ProgressPage />;
      case "rutina":
        return <RoutinePage onNavigate={navigate} />;
      case "logros":
        return <AchievementsPage />;
      case "coach":
        return <CoachPage />;
      case "perfil":
        return <ProfilePage />;
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  return (
    <AppShell route={route} user={user} onNavigate={navigate}>
      <div className="page-enter" key={route}>
        <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>{page(route)}</Suspense>
        </ErrorBoundary>
      </div>
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <Screens />
      </ProfileProvider>
    </AuthProvider>
  );
}
