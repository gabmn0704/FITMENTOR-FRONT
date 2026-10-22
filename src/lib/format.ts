const dateFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

/** "21 oct" a partir de una fecha ISO. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
}

/** "3:05" o "1:02:10" a partir de segundos. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Acepta progreso en 0-1 o en 0-100 y devuelve siempre 0-1. */
export function normalizeProgress(value: number): number {
  const ratio = value > 1 ? value / 100 : value;
  return Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "FM";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
