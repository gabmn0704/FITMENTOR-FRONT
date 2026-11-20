import { useEffect, useState } from "react";
import { Trophy, X } from "lucide-react";
import { fireConfetti } from "../motion/Confetti";
import { syncEngagement } from "../../lib/engagement";
import { readLocalSessions } from "../../lib/sessions";
import { computeLocalStats } from "../../lib/stats";

interface Toast {
  title: string;
  lines: string[];
}

/**
 * Revisa al cambiar de pantalla si hubo retos cumplidos o medallas nuevas y los celebra una sola vez:
 * confeti y un aviso que se cierra solo.
 */
export function EngagementHost({ userId, route }: { userId: string | undefined; route: string }) {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const sessions = readLocalSessions();
    if (!sessions.length) return;
    const { newlyCompleted, newBadges } = syncEngagement(userId, sessions, computeLocalStats(sessions).streakDays);
    if (!newlyCompleted.length && !newBadges.length) return;
    const lines = [
      ...newBadges.map((badge) => `Medalla: ${badge.title}`),
      ...newlyCompleted.map((challenge) => `Reto cumplido: ${challenge.title} (+${challenge.xp} XP)`),
    ];
    setToast({ title: newBadges.length ? "¡Desbloqueaste un logro!" : "¡Reto cumplido!", lines });
    fireConfetti({ x: 0.5, y: 0.25 });
    const id = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(id);
  }, [userId, route]);

  if (!toast) return null;
  return (
    <div className="unlock-toast" role="status" aria-live="polite">
      <span className="unlock-toast__icon" aria-hidden="true">
        <Trophy size={28} />
      </span>
      <div className="unlock-toast__text">
        <strong>{toast.title}</strong>
        <ul>
          {toast.lines.slice(0, 4).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <button type="button" className="unlock-toast__close" aria-label="Cerrar aviso" onClick={() => setToast(null)}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
