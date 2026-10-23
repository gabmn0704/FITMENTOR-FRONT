import { sessionsApi } from "./services";
import { STORAGE_KEYS, storage } from "./storage";
import type { ServerSession, SessionPayload, SessionRecord } from "../types";

const MAX_LOCAL_SESSIONS = 200;

export function readLocalSessions(): SessionRecord[] {
  const list = storage.getJSON<SessionRecord[]>(STORAGE_KEYS.sessions, []);
  return Array.isArray(list) ? list : [];
}

function writeLocalSessions(list: SessionRecord[]): void {
  storage.setJSON(STORAGE_KEYS.sessions, list.slice(0, MAX_LOCAL_SESSIONS));
}

/** Guarda una sesión en local antes de intentar subirla; así nunca se pierde. */
export function saveLocalSession(payload: SessionPayload, now = new Date()): SessionRecord {
  const record: SessionRecord = {
    ...payload,
    localId: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    date: now.toISOString(),
    synced: false,
  };
  writeLocalSessions([record, ...readLocalSessions()]);
  return record;
}

/**
 * Sube las sesiones pendientes al backend. Las que fallan se conservan para
 * el siguiente intento. Devuelve cuántas se sincronizaron.
 */
let inFlight: Promise<number> | null = null;

export function syncPendingSessions(token: string): Promise<number> {
  // Evita subir dos veces la misma sesión si dos pantallas sincronizan a la vez.
  if (!inFlight) {
    inFlight = uploadPending(token).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function uploadPending(token: string): Promise<number> {
  const all = readLocalSessions();
  let synced = 0;
  const updated: SessionRecord[] = [];
  for (const record of all) {
    if (record.synced) {
      updated.push(record);
      continue;
    }
    const payload: SessionPayload = {
      exercise: record.exercise,
      reps: record.reps,
      accuracy: record.accuracy,
      durationSeconds: record.durationSeconds,
      ...(record.avgAngles ? { avgAngles: record.avgAngles } : {}),
    };
    try {
      await sessionsApi.create(token, payload);
      synced++;
      updated.push({ ...record, synced: true });
    } catch {
      updated.push(record);
    }
  }
  // Releer: pudo guardarse una sesión nueva mientras subíamos.
  const syncedIds = new Set(updated.filter((r) => r.synced).map((r) => r.localId));
  writeLocalSessions(readLocalSessions().map((r) => (syncedIds.has(r.localId) ? { ...r, synced: true } : r)));
  return synced;
}

/** Entrada del historial: une sesiones del servidor y locales pendientes. */
export interface HistoryEntry {
  id: string;
  exercise: string;
  reps: number;
  accuracy: number;
  durationSeconds: number;
  /** ISO 8601. */
  date: string;
  synced: boolean;
}

/**
 * Historial a mostrar. Si el servidor respondió, sus sesiones mandan y se
 * añaden solo las locales pendientes; si no, se usa todo lo local.
 */
export function mergeHistory(server: ServerSession[] | null, local: SessionRecord[]): HistoryEntry[] {
  const fromLocal = (r: SessionRecord): HistoryEntry => ({
    id: r.localId,
    exercise: r.exercise,
    reps: r.reps,
    accuracy: r.accuracy,
    durationSeconds: r.durationSeconds,
    date: r.date,
    synced: r.synced,
  });
  const entries: HistoryEntry[] = server
    ? [
        ...server.map((s) => ({
          id: s.id,
          exercise: s.exercise,
          reps: s.reps,
          accuracy: s.accuracy,
          durationSeconds: s.durationSeconds,
          date: s.createdAt,
          synced: true,
        })),
        ...local.filter((r) => !r.synced).map(fromLocal),
      ]
    : local.map(fromLocal);
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}
