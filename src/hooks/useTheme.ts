import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "solana-defi-demo:theme";

function readStoredTheme(): Theme | null {
  if (typeof localStorage === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

/** Dark by default — DeFi dashboards are read on dark backgrounds. */
function systemPreference(): Theme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

/**
 * Keeps `<html class="dark">` in sync with the selected theme.
 *
 * The Tailwind build is configured with `@custom-variant dark (&:is(.dark *))`,
 * so toggling this class is what swaps the entire token set.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme() ?? systemPreference());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persisting is best-effort; a private-mode quota error must not break the app.
    }
  }, []);

  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [setTheme, theme],
  );

  return { theme, setTheme, toggleTheme };
}
