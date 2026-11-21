/** Switches drawing palettes from the top-bar instrument row. */
"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "./themeStore";

export default function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggle = useThemeStore((state) => state.toggle);
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button type="button" className="pw-tool-button" aria-label={label}
      data-pw-tip={label} data-pw-tip-align="end" onClick={toggle}>
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
