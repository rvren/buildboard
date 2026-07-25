import type { CSSProperties } from "react";
import type { DesignTokens } from "@/types";

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

/**
 * CSS-variable style object that re-themes any subtree rendering the user's
 * design (canvas artboard, thumbnails, gallery) to the project's tokens.
 * Components already read `hsl(var(--primary))`, `.bg-brand`, `--radius`, etc.
 */
export function tokenStyle(tokens: DesignTokens): CSSProperties {
  return {
    // cast: CSS custom properties aren't in the CSSProperties type
    ["--primary" as any]: hexToHslTriple(tokens.primary),
    ["--ring" as any]: hexToHslTriple(tokens.primary),
    ["--brand-from" as any]: hexToHslTriple(tokens.brandFrom),
    ["--brand-to" as any]: hexToHslTriple(tokens.brandTo),
    ["--radius" as any]: `${tokens.radius}px`,
    fontFamily: `"${tokens.font}", ui-sans-serif, system-ui, sans-serif`,
  };
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
