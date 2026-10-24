import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { storage } from "../lib/storage";

interface Saved {
  date: string;
  sets: Record<string, number>;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Series marcadas hoy en los ejercicios sin cámara. Se guardan por usuario y se reinician cada día. */
export function useDoneSets() {
  const { user } = useAuth();
  const key = `fitmentor.done.${user?.id ?? "anon"}`;
  const read = useCallback((): Record<string, number> => {
    const saved = storage.getJSON<Saved | null>(key, null);
    return saved && saved.date === today() ? saved.sets : {};
  }, [key]);
  const [sets, setSets] = useState<Record<string, number>>(read);

  useEffect(() => setSets(read()), [read]);

  /** Marca `count` series hechas; pulsar la última marcada la quita. */
  const mark = useCallback(
    (exercise: string, count: number) => {
      setSets((current) => {
        const next = { ...current, [exercise]: current[exercise] === count ? count - 1 : count };
        storage.setJSON(key, { date: today(), sets: next } satisfies Saved);
        return next;
      });
    },
    [key],
  );

  return { done: sets, mark };
}
