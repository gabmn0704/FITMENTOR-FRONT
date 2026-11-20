import { storage } from "./storage";
import type { DayPlan, WeekPlan } from "./weeklyPlan";

/**
 * Registro diario que vive en este dispositivo: comidas hechas, vasos de agua y pesajes. Todo va separado por usuario
 * y se poda solo para no crecer sin límite. Además, exporta la semana de entrenamiento a un calendario (.ics).
 */

const DAY_LOG_KEY = "fitmentor.daylog";
const WEIGHT_KEY = "fitmentor.weights";
const KEEP_DAYS = 60;
const KEEP_WEIGHTS = 180;

export interface DayLog {
  /** Comidas marcadas como hechas (por su identificador de franja). */
  meals: string[];
  /** Vasos de 250 ml. */
  water: number;
}

export interface WeightEntry {
  /** Fecha local AAAA-MM-DD. */
  date: string;
  kg: number;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Fecha local en formato AAAA-MM-DD (no UTC: el día cambia a medianoche de la persona). */
export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const scoped = (key: string, userId?: string | null) => (userId ? `${key}.${userId}` : key);

type DayLogMap = Record<string, DayLog>;

function readMap(userId?: string | null): DayLogMap {
  const raw = storage.getJSON<unknown>(scoped(DAY_LOG_KEY, userId), {});
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as DayLogMap) : {};
}

function cleanLog(value: Partial<DayLog> | undefined): DayLog {
  const meals = Array.isArray(value?.meals) ? value!.meals.filter((m): m is string => typeof m === "string") : [];
  const water = Number.isFinite(value?.water) ? Math.max(0, Math.min(20, Math.round(value!.water!))) : 0;
  return { meals, water };
}

export function readDayLog(date: string, userId?: string | null): DayLog {
  return cleanLog(readMap(userId)[date]);
}

export function writeDayLog(date: string, log: DayLog, userId?: string | null): DayLog {
  const map = readMap(userId);
  map[date] = cleanLog(log);
  const kept = Object.keys(map)
    .sort()
    .slice(-KEEP_DAYS)
    .reduce<DayLogMap>((acc, key) => {
      acc[key] = map[key];
      return acc;
    }, {});
  storage.setJSON(scoped(DAY_LOG_KEY, userId), kept);
  return kept[date];
}

/** Marca o desmarca una comida y devuelve el registro del día ya guardado. */
export function toggleMeal(date: string, slot: string, userId?: string | null): DayLog {
  const log = readDayLog(date, userId);
  const meals = log.meals.includes(slot) ? log.meals.filter((m) => m !== slot) : [...log.meals, slot];
  return writeDayLog(date, { ...log, meals }, userId);
}

export function setWater(date: string, glasses: number, userId?: string | null): DayLog {
  return writeDayLog(date, { ...readDayLog(date, userId), water: glasses }, userId);
}

/** Vasos de 250 ml que cubren la meta de litros del día. */
export function glassesFor(liters: number): number {
  return Math.max(1, Math.round((liters * 1000) / 250));
}

export function readWeights(userId?: string | null): WeightEntry[] {
  const raw = storage.getJSON<unknown>(scoped(WEIGHT_KEY, userId), []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is WeightEntry => !!e && typeof e.date === "string" && Number.isFinite(e.kg))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Guarda un pesaje; si ya había uno ese día, lo reemplaza. */
export function addWeight(kg: number, date = dateKey(), userId?: string | null): WeightEntry[] {
  if (!Number.isFinite(kg) || kg < 25 || kg > 350) return readWeights(userId);
  const value = Math.round(kg * 10) / 10;
  const list = readWeights(userId).filter((e) => e.date !== date);
  list.push({ date, kg: value });
  list.sort((a, b) => a.date.localeCompare(b.date));
  const kept = list.slice(-KEEP_WEIGHTS);
  storage.setJSON(scoped(WEIGHT_KEY, userId), kept);
  return kept;
}

export function removeWeight(date: string, userId?: string | null): WeightEntry[] {
  const kept = readWeights(userId).filter((e) => e.date !== date);
  storage.setJSON(scoped(WEIGHT_KEY, userId), kept);
  return kept;
}

/**
 * Ritmo real en kg por semana a partir de los pesajes (primer y último registro). Null si hay menos de dos
 * pesajes o si están en el mismo día.
 */
export function weeklyRate(entries: WeightEntry[]): number | null {
  if (entries.length < 2) return null;
  const first = entries[0];
  const last = entries[entries.length - 1];
  const days = (Date.parse(`${last.date}T12:00:00`) - Date.parse(`${first.date}T12:00:00`)) / 86_400_000;
  if (days < 1) return null;
  return Math.round(((last.kg - first.kg) / days) * 7 * 100) / 100;
}

/** Lunes (fecha local, a medianoche) de la semana que contiene `date`. */
export function mondayOf(date = new Date()): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

const icsDate = (date: Date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;

const icsText = (text: string) => text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

function dayDescription(day: DayPlan, label: (id: DayPlan["items"][number]["exercise"]) => string): string {
  const lines = day.items.map((item) => `${label(item.exercise)}: ${item.sets} x ${item.target}${item.unit === "seconds" ? " s" : ""}${item.perSide ? " por lado" : ""}`);
  return [day.focus, "", ...lines].join("\n");
}

/**
 * Calendario iCalendar con un evento por cada día de entrenamiento de la semana, a la hora elegida. Se importa en
 * Google Calendar, Outlook o el calendario del teléfono.
 */
export function weekToIcs(
  plan: WeekPlan,
  monday: Date,
  label: (id: DayPlan["items"][number]["exercise"]) => string,
  hour = 18,
  stamp = new Date(),
): string {
  const events = plan.days
    .filter((day) => day.kind === "train")
    .flatMap((day) => {
      const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + day.index, hour, 0, 0);
      const end = new Date(start.getTime() + Math.max(15, day.minutes) * 60_000);
      return [
        "BEGIN:VEVENT",
        `UID:fitmentor-w${plan.week}-d${day.index}-${dateKey(start)}@fitmentor`,
        `DTSTAMP:${icsDate(stamp)}`,
        `DTSTART:${icsDate(start)}`,
        `DTEND:${icsDate(end)}`,
        `SUMMARY:${icsText(`FitMentor: ${day.title}`)}`,
        `DESCRIPTION:${icsText(dayDescription(day, label))}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT30M",
        "ACTION:DISPLAY",
        `DESCRIPTION:${icsText(`En 30 minutos: ${day.title}`)}`,
        "END:VALARM",
        "END:VEVENT",
      ];
    });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FitMentor//Plan semanal//ES", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
}

/** Descarga un texto como archivo desde el navegador. */
export function downloadText(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
