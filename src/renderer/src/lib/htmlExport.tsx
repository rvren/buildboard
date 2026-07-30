import { renderToStaticMarkup } from "react-dom/server";
import type { Project, Screen } from "@/types";
import { StaticNode } from "@/features/editor/canvas/renderTree";
import { ComponentDefsProvider } from "@/features/editor/canvas/componentDefs";
import { tokensToCss } from "@/lib/designSystem";

// Framework-free static HTML export. Each screen is rendered with the SAME
// StaticNode the canvas uses (via renderToStaticMarkup), so the .html matches
// what you designed. The Tailwind Play CDN is configured with the app's shadcn
// color mapping, and the design tokens ship as CSS variables — one self-contained
// file per screen, no build step.

/** Inline Tailwind CDN config mapping the shadcn color tokens to the CSS vars. */
const TW_CONFIG = `tailwind.config = {
  darkMode: ["class"],
  theme: { extend: { colors: {
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    border: "hsl(var(--border))",
    input: "hsl(var(--input))",
    ring: "hsl(var(--ring))",
    card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
    popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
    primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
    secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
    muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
    accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
    destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
  }, borderRadius: {
    lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)",
  } } },
};`;

/** Render one screen to a self-contained HTML document. */
export function screenToHtml(screen: Screen, project: Project): string {
  const tokens = project.designSystem.tokens;
  const body = renderToStaticMarkup(
    <ComponentDefsProvider components={project.designSystem.components}>
      <StaticNode node={screen.root} />
    </ComponentDefsProvider>
  );
  const title = screen.title || screen.name || project.name;
  const brand =
    ".bg-brand{background-image:linear-gradient(135deg,hsl(var(--brand-from)),hsl(var(--brand-to)));}";
  const base = `body{font-family:"${tokens.font}",ui-sans-serif,system-ui,sans-serif;background:hsl(var(--background));color:hsl(var(--foreground));margin:0;}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>${TW_CONFIG}</script>
<style>
${tokensToCss(tokens)}
${base}
${brand}
</style>
</head>
<body>
${body}
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
