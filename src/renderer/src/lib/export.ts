import JSZip from "jszip";
import type { Project, ThemePalette } from "@/types";
import { generatePageCode, generateComponentCode } from "@/lib/codegen";
import { hexToHslTriple, PALETTE_VARS } from "@/lib/designSystem";
import { architectureMarkdown } from "@/lib/architecture";

/** Emit a `{ --var: H S% L%; … }` block body from a palette + radius. */
function paletteVarBlock(palette: ThemePalette, radius: number): string {
  const lines = (Object.keys(PALETTE_VARS) as (keyof ThemePalette)[]).map(
    (key) => `  ${PALETTE_VARS[key]}: ${hexToHslTriple(palette[key])};`
  );
  lines.push(`  --radius: ${radius}px;`);
  return lines.join("\n");
}

function pascalCase(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  const pascal = cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return /^[A-Za-z]/.test(pascal) ? pascal : `Screen${pascal}`;
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  triggerDownload(filename, blob);
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Bundle every screen as a `<Name>Page.tsx` file into a downloadable zip. */
export async function exportProjectZip(project: Project) {
  const zip = new JSZip();
  const folder = zip.folder(pascalCase(project.name) || "project")!;
  const pages = folder.folder("pages")!;
  const seen = new Map<string, number>();

  for (const screen of project.screens) {
    let base = pascalCase(screen.name) + "Page";
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    if (n > 0) base = `${base}${n + 1}`;
    pages.file(`${base}.tsx`, generatePageCode(screen, project));
  }

  // Design-system component definitions as standalone, reusable files.
  const comps = project.designSystem?.components ?? [];
  if (comps.length) {
    const cf = folder.folder("components")!;
    const cseen = new Map<string, number>();
    for (const def of comps) {
      let name = pascalCase(def.name) || "Component";
      const k = cseen.get(name) ?? 0;
      cseen.set(name, k + 1);
      if (k > 0) name = `${name}${k + 1}`;
      cf.file(`${name}.tsx`, generateComponentCode(def.root, project));
    }
  }

  // Design-system tokens as CSS variables (import once at app root).
  const t = project.designSystem?.tokens;
  if (t) {
    folder.file(
      "design-tokens.css",
      `:root {\n${paletteVarBlock(t.light, t.radius)}\n}\n\n` +
        `.dark {\n${paletteVarBlock(t.dark, t.radius)}\n}\n\n` +
        `.bg-brand { background-image: linear-gradient(135deg, hsl(var(--brand-from)), hsl(var(--brand-to))); }\n`
    );
  }

  // Buildable scaffold: globals + Tailwind config + package.json so the export
  // compiles as a real project, not just loose files.
  folder.file(
    "globals.css",
    `@import "./design-tokens.css";\n\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`
  );
  folder.file("tailwind.config.js", tailwindConfig());
  folder.file("package.json", packageJson(project.name));

  // Architecture docs (service map + sequence diagrams as mermaid).
  const arch = project.architecture;
  if (arch && (arch.services.length > 0 || arch.sequences.length > 0)) {
    folder.folder("docs")!.file("architecture.md", architectureMarkdown(project));
  }

  folder.file(
    "README.md",
    `# ${project.name}\n\nExported from BuildBoard.\n\n` +
      `${project.screens.length} screen(s). Components use shadcn/ui — ` +
      `install the referenced primitives and Tailwind to compile.\n` +
      `Import \`design-tokens.css\` at your app root to apply the design system.\n`
  );

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(`${pascalCase(project.name) || "project"}.zip`, blob);
}

/** shadcn-style Tailwind config wired to the exported `design-tokens.css` vars. */
function tailwindConfig(): string {
  const c = (name: string) =>
    `${name}: { DEFAULT: "hsl(var(--${name}))", foreground: "hsl(var(--${name}-foreground))" }`;
  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        ${c("card")},
        ${c("popover")},
        ${c("primary")},
        ${c("secondary")},
        ${c("muted")},
        ${c("accent")},
        ${c("destructive")},
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
`;
}

function packageJson(name: string): string {
  return (
    JSON.stringify(
      {
        name: (pascalCase(name) || "project").toLowerCase(),
        private: true,
        dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
        devDependencies: {
          tailwindcss: "^3.4.0",
          autoprefixer: "^10.4.0",
          postcss: "^8.4.0",
          typescript: "^5.4.0",
        },
      },
      null,
      2
    ) + "\n"
  );
}
