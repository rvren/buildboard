import type { Breakpoint, DesignNode, StyleTokens } from "@/types";
import { BREAKPOINTS } from "@/types";

/** Color token -> Tailwind background class. */
export const BG_TOKENS: Record<string, string> = {
  transparent: "bg-transparent",
  background: "bg-background",
  card: "bg-card",
  muted: "bg-muted",
  secondary: "bg-secondary",
  accent: "bg-accent",
  primary: "bg-primary",
  destructive: "bg-destructive",
  white: "bg-white",
  black: "bg-black",
};

/** Color token -> Tailwind text-color class. */
export const TEXT_TOKENS: Record<string, string> = {
  foreground: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  "primary-foreground": "text-primary-foreground",
  secondary: "text-secondary-foreground",
  destructive: "text-destructive",
  white: "text-white",
};

const RADIUS: Record<string, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

const SHADOW: Record<string, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
};

const FONT_SIZE: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
};

const FONT_WEIGHT: Record<string, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

function sizeClass(axis: "w" | "h", value?: string): string | null {
  if (!value) return null;
  const named: Record<string, string> = {
    full: `${axis}-full`,
    auto: `${axis}-auto`,
    fit: `${axis}-fit`,
    "1/2": `${axis}-1/2`,
    "1/3": `${axis}-1/3`,
    "2/3": `${axis}-2/3`,
    "1/4": `${axis}-1/4`,
    screen: axis === "w" ? "w-screen" : "h-screen",
  };
  if (named[value]) return named[value];
  // numeric -> arbitrary pixel value
  if (/^\d+$/.test(value)) return `${axis}-[${value}px]`;
  return null;
}

/**
 * Convert structured style tokens into a deterministic, ordered Tailwind
 * className string. Used identically by the canvas renderer and codegen so
 * "what you see" equals "what you export".
 */
export function stylesToTailwind(s: StyleTokens): string {
  const cls: string[] = [];

  // Layout
  if (s.display === "flex") {
    cls.push("flex");
    cls.push(s.direction === "col" ? "flex-col" : "flex-row");
    if (s.wrap) cls.push("flex-wrap");
  } else if (s.display === "grid") {
    cls.push("grid");
    if (s.gridCols) cls.push(`grid-cols-${s.gridCols}`);
  } else if (s.display === "block") {
    cls.push("block");
  }

  if (s.display === "flex") {
    const alignMap: Record<string, string> = {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    };
    const justifyMap: Record<string, string> = {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
      around: "justify-around",
    };
    if (s.align && alignMap[s.align]) cls.push(alignMap[s.align]);
    if (s.justify && justifyMap[s.justify]) cls.push(justifyMap[s.justify]);
  }

  if (s.gap != null && (s.display === "flex" || s.display === "grid"))
    cls.push(`gap-${s.gap}`);

  // Sizing
  const w = sizeClass("w", s.width);
  const h = sizeClass("h", s.height);
  if (w) cls.push(w);
  if (h) cls.push(h);

  // Spacing
  if (s.padding != null) cls.push(`p-${s.padding}`);
  if (s.margin != null) cls.push(`m-${s.margin}`);

  // Appearance
  if (s.bg && BG_TOKENS[s.bg]) cls.push(BG_TOKENS[s.bg]);
  if (s.border) cls.push("border");
  if (s.radius && RADIUS[s.radius]) cls.push(RADIUS[s.radius]);
  if (s.shadow && SHADOW[s.shadow]) cls.push(SHADOW[s.shadow]);

  // Typography
  if (s.fontSize && FONT_SIZE[s.fontSize]) cls.push(FONT_SIZE[s.fontSize]);
  if (s.fontWeight && FONT_WEIGHT[s.fontWeight])
    cls.push(FONT_WEIGHT[s.fontWeight]);
  if (s.textColor && TEXT_TOKENS[s.textColor])
    cls.push(TEXT_TOKENS[s.textColor]);
  if (s.textAlign && s.textAlign !== "left")
    cls.push(`text-${s.textAlign}`);

  return cls.join(" ");
}

/** Active editing/preview breakpoint — "base" plus the responsive breakpoints. */
export type ActiveBreakpoint = "base" | Breakpoint;

/** Representative artboard preview width per breakpoint (Tailwind min-widths). */
export const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
};

/**
 * Merge a node's base `styles` with its responsive overrides up to and including
 * `bp` (mobile-first cascade). At "base" this is just `styles`. Used by the canvas
 * to preview a node at the active breakpoint.
 */
export function effectiveTokens(node: DesignNode, bp: ActiveBreakpoint): StyleTokens {
  if (bp === "base" || !node.responsive) return node.styles;
  let merged: StyleTokens = { ...node.styles };
  for (const b of BREAKPOINTS) {
    const ov = node.responsive[b];
    if (ov) merged = { ...merged, ...ov };
    if (b === bp) break;
  }
  return merged;
}

/**
 * Codegen: base classes plus prefixed responsive overrides, e.g.
 * `flex flex-col md:flex-row lg:w-1/2`. Each override emits only its own changed
 * properties, prefixed with the breakpoint — real, mobile-first Tailwind.
 */
export function responsiveClasses(
  base: StyleTokens,
  responsive?: Partial<Record<Breakpoint, Partial<StyleTokens>>>
): string {
  const parts = [stylesToTailwind(base)];
  if (responsive) {
    for (const bp of BREAKPOINTS) {
      const ov = responsive[bp];
      if (!ov || Object.keys(ov).length === 0) continue;
      const cls = stylesToTailwind(ov as StyleTokens).trim();
      if (cls) parts.push(cls.split(/\s+/).map((c) => `${bp}:${c}`).join(" "));
    }
  }
  return parts.filter(Boolean).join(" ");
}

/**
 * Pixel width/height can't be safelisted as arbitrary Tailwind values, so the
 * live renderer applies them as inline styles to stay accurate. (Codegen still
 * emits `w-[320px]`, which is valid in a real Tailwind project.)
 */
export function sizeStyle(s: StyleTokens): Record<string, string> {
  const style: Record<string, string> = {};
  if (s.width && /^\d+$/.test(s.width)) style.width = `${s.width}px`;
  if (s.height && /^\d+$/.test(s.height)) style.height = `${s.height}px`;
  return style;
}
