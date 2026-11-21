/** Owns the theme preference and mirrors it to the document. */
import { create } from "zustand";

type Theme = "dark" | "light";
type ThemeState = {
  theme: Theme;
  toggle: () => void;
};

const storageKey = "pw-theme";

function readTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem(storageKey) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme: Theme) {
  if (typeof document !== "undefined") document.documentElement.dataset.theme = theme;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const theme = readTheme();
  applyTheme(theme);

  return {
    theme,
    toggle() {
      const next = get().theme === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // The current page can still use the selected theme when storage is blocked.
      }
      set({ theme: next });
    },
  };
});
