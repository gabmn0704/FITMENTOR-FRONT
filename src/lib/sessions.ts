import { sessionsApi } from "./services";
import { STORAGE_KEYS, storage } from "./storage";
import type { SessionPayload, SessionRecord } from "../types";

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
export async function syncPendingSessions(token: string): Promise<number> {
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
  writeLocalSessions(updated);
  return synced;
}
