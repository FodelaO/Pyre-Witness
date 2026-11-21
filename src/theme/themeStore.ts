/** Owns the theme preference and mirrors it to the document. */
import { create } from "zustand";

type Theme = "dark" | "light";
type ThemeState = {
  theme: Theme;
  toggle: () => void;
};

const storageKey = "pw-theme";

/** Light (the engineering drawing by day) is the default; dark only when the viewer chose it. */
function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
  } catch {
    return "light";
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
