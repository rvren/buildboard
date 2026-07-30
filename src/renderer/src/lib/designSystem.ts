import type { CSSProperties } from "react";
import type { DesignTokens, ThemeMode, ThemePalette } from "@/types";

/** Curated fonts offered by the design system (loaded on demand from Google Fonts). */
export const DS_FONTS = [
  "Geist",
  "Inter",
  "Manrope",
  "Poppins",
  "Sora",
  "Space Grotesk",
];

/** Convert a #RRGGBB hex to a Tailwind/shadcn `"H S% L%"` triple. */
export function hexToHslTriple(hex: string): string {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  if ([r, g, b].some((n) => Number.isNaN(n))) return "243 75% 60%";
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const lum = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    sat = d / (1 - Math.abs(2 * lum - 1));
    switch (max) {
      case r:
        hue = ((g - b) / d) % 6;
        break;
      case g:
        hue = (b - r) / d + 2;
        break;
      default:
        hue = (r - g) / d + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return `${Math.round(hue)} ${Math.round(sat * 100)}% ${Math.round(lum * 100)}%`;
}

/** Convert a Tailwind/shadcn `"H S% L%"` triple to a #RRGGBB hex. */
export function hslTripleToHex(triple: string): string {
  const m = triple.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return "#000000";
  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n: number) =>
    Math.round((n + mm) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Map from `ThemePalette` field → CSS custom property name. */
export const PALETTE_VARS: Record<keyof ThemePalette, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  success: "--success",
  warning: "--warning",
  border: "--border",
  input: "--input",
  ring: "--ring",
  brandFrom: "--brand-from",
  brandTo: "--brand-to",
};

/**
 * CSS-variable style object that re-themes any subtree rendering the user's
 * design (canvas artboard, thumbnails, gallery) to the project's tokens for the
 * given theme. Emits the full palette so the designed app is fully token-driven.
 */
export function tokenStyle(
  tokens: DesignTokens,
  theme: ThemeMode = "light"
): CSSProperties {
  const palette = tokens[theme];
  const style: Record<string, string> = {};
  for (const key of Object.keys(PALETTE_VARS) as (keyof ThemePalette)[]) {
    style[PALETTE_VARS[key]] = hexToHslTriple(palette[key]);
  }
  style["--radius"] = `${tokens.radius}px`;
  // Heading/display font falls back to the body font when unset — no visual
  // change until a heading font is chosen. Canvas + export read the same var.
  style["--font-heading"] = `"${tokens.headingFont || tokens.font}", ui-sans-serif, system-ui, sans-serif`;
  return {
    ...style,
    fontFamily: `"${tokens.font}", ui-sans-serif, system-ui, sans-serif`,
  } as CSSProperties;
}

const loaded = new Set<string>();

/** Inject a Google-Fonts stylesheet for the given family once. */
export function ensureFontLoaded(font: string) {
  if (!font || font === "Geist" || loaded.has(font)) return;
  loaded.add(font);
  const family = font.replace(/ /g, "+");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

/**
 * Serialize design tokens as CSS custom properties for a real Tailwind/shadcn
 * project — `:root` (light) + `.dark` (dark) + `--radius`. Colors are emitted as
 * `H S% L%` triples (shadcn convention). Used by the tokens "Copy CSS" export.
 */
export function tokensToCss(tokens: DesignTokens): string {
  const keys = Object.keys(PALETTE_VARS) as (keyof ThemePalette)[];
  const block = (pal: ThemePalette) =>
    keys.map((k) => `  ${PALETTE_VARS[k]}: ${hexToHslTriple(pal[k])};`).join("\n");
  return [
    ":root {",
    block(tokens.light),
    `  --radius: ${tokens.radius}px;`,
    `  --font-heading: "${tokens.headingFont || tokens.font}", ui-sans-serif, system-ui, sans-serif;`,
    "}",
    "",
    ".dark {",
    block(tokens.dark),
    "}",
    "",
  ].join("\n");
}
