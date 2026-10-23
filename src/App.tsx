import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import { AppShell } from "./components/layout/AppShell";
import { Button } from "./components/ui";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useHashRoute } from "./hooks/useHashRoute";
import { usePointerEffects } from "./hooks/usePointerEffects";
import { syncPendingSessions } from "./lib/sessions";
import type { RouteId } from "./lib/routes";
import { AchievementsPage } from "./pages/AchievementsPage";
import { CoachPage } from "./pages/CoachPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProgressPage } from "./pages/ProgressPage";
import { RoutinePage } from "./pages/RoutinePage";
import { TrainPage } from "./pages/TrainPage";

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
  const [route, navigate] = useHashRoute();
  usePointerEffects();

  // Al iniciar sesión, sube en segundo plano las sesiones guardadas sin conexión.
  useEffect(() => {
    if (token) void syncPendingSessions(token);
  }, [token]);

  if (!token) return <LoginPage />;

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
        <ErrorBoundary>{page(route)}</ErrorBoundary>
      </div>
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Screens />
    </AuthProvider>
  );
}
