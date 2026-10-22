import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS, storage } from "../lib/storage";

export type ThemeChoice = "dark" | "light" | "system";

const THEMES: ThemeChoice[] = ["dark", "light", "system"];

function readTheme(): ThemeChoice {
  const value = storage.getString(STORAGE_KEYS.theme);
  return THEMES.includes(value as ThemeChoice) ? (value as ThemeChoice) : "dark";
}

/** Aplica el tema en <html>. "system" retira el atributo y deja decidir a prefers-color-scheme. */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>(readTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    storage.setString(STORAGE_KEYS.theme, next);
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}
