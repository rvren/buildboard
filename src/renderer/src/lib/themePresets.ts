import type { ThemePalette } from "@/types";

// Curated theme presets. Each applies a small, tasteful patch to the color
// tokens (primary / ring / brand gradient) over the project's current palette —
// one click restyles buttons, focus rings, and brand accents across both modes.
// We deliberately patch a subset so backgrounds/text stay legible.

export interface ThemePreset {
  id: string;
  name: string;
  /** Swatch shown in the gallery. */
  swatch: string;
  light: Partial<ThemePalette>;
  dark: Partial<ThemePalette>;
}

const mk = (
  name: string,
  id: string,
  light: string,
  dark: string,
  from: string,
  to: string
): ThemePreset => ({
  id,
  name,
  swatch: light,
  light: {
    primary: light,
    primaryForeground: "#ffffff",
    ring: light,
    brandFrom: from,
    brandTo: to,
  },
  dark: {
    primary: dark,
    primaryForeground: "#08130c",
    ring: dark,
    brandFrom: from,
    brandTo: to,
  },
});

export const THEME_PRESETS: ThemePreset[] = [
  mk("Green", "green", "#00a562", "#22c55e", "#00a562", "#22c55e"),
  mk("Ocean", "ocean", "#2563eb", "#60a5fa", "#3b82f6", "#06b6d4"),
  mk("Violet", "violet", "#7c3aed", "#a78bfa", "#8b5cf6", "#d946ef"),
  mk("Sunset", "sunset", "#ea580c", "#fb923c", "#f97316", "#f59e0b"),
  mk("Rose", "rose", "#e11d48", "#fb7185", "#f43f5e", "#fb7185"),
  mk("Slate", "slate", "#334155", "#94a3b8", "#475569", "#64748b"),
];
