/**
 * Colours of the 3D view. Defaults mirror the tokens in src/app/globals.css; readPalette()
 * re-reads the live CSS variables so the 3D plant always matches the 2D drawing.
 */
import type { Medium } from "@/twin/types";

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? match[1].replace(/./g, (c) => c + c) : match[1];
  const value = parseInt(digits, 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

export const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const TOKENS = {
  bg: ["--pw-bg", "#070b10"],
  floor: ["--pw-floor", "#0b1117"],
  panel2: ["--pw-panel-2", "#131c26"],
  line: ["--pw-line", "#1e2a37"],
  lineStrong: ["--pw-line-strong", "#2f4053"],
  eqStroke: ["--pw-eq-stroke", "#93a7bc"],
  eqFill: ["--pw-eq-fill", "#151f2a"],
  eqFill2: ["--pw-eq-fill-2", "#1d2a38"],
  eqAccent: ["--pw-eq-accent", "#d2deea"],
  ok: ["--pw-ok", "#34d399"],
  attention: ["--pw-attention", "#fbbf24"],
  alarm: ["--pw-alarm", "#ff3b5c"],
  info: ["--pw-info", "#60a5fa"],
  water: ["--pw-m-water", "#4cc3ff"],
  syrup: ["--pw-m-syrup", "#f5b041"],
  product: ["--pw-m-product", "#c97b45"],
  co2: ["--pw-m-co2", "#e2e8f0"],
  glycol: ["--pw-m-glycol", "#5eead4"],
  ammonia: ["--pw-m-ammonia", "#a3e635"],
  cip: ["--pw-m-cip", "#e879f9"],
  power: ["--pw-m-power", "#facc15"],
  network: ["--pw-m-network", "#7b8898"],
} as const;

type TokenName = keyof typeof TOKENS;

export interface Palette extends Record<TokenName, Rgb> {
  /** Lit steel tones derived from the equipment tokens (2D fills are too dark to shade). */
  steel: Rgb;
  steelDark: Rgb;
  steelLight: Rgb;
  media: Record<Medium, Rgb>;
}

function derive(base: Record<TokenName, Rgb>): Palette {
  return {
    ...base,
    steel: mix(base.eqFill2, base.eqStroke, 0.26),
    steelDark: mix(base.eqFill2, base.eqStroke, 0.1),
    steelLight: mix(base.eqFill2, base.eqStroke, 0.46),
    media: {
      water: base.water, syrup: base.syrup, product: base.product, co2: base.co2, glycol: base.glycol,
      ammonia: base.ammonia, cip: base.cip, power: base.power, network: base.network,
    },
  };
}

function fromSource(read: (cssVar: string) => string | undefined): Palette {
  const base = {} as Record<TokenName, Rgb>;
  for (const name of Object.keys(TOKENS) as TokenName[]) {
    const [cssVar, fallback] = TOKENS[name];
    base[name] = hexToRgb(read(cssVar) ?? "") ?? (hexToRgb(fallback) as Rgb);
  }
  return derive(base);
}

export const DEFAULT_PALETTE: Palette = fromSource(() => undefined);

/** Reads the live tokens from the document (falls back to the defaults for non-hex values). */
export function readPalette(element: Element): Palette {
  const style = getComputedStyle(element);
  return fromSource((cssVar) => style.getPropertyValue(cssVar));
}

export const rgbCss = (c: Rgb): string => `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)})`;
