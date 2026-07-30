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

/** Route segment for a screen: its `path`, else a slug of its name. "/" → index. */
function routeSegment(name: string, path: string | undefined): string {
  const raw = (path ?? "").trim().replace(/^\/+|\/+$/g, "");
  if (raw) return raw.toLowerCase();
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "page";
}

/**
 * One-click Next.js (App Router) scaffold: `app/<route>/page.tsx` per screen,
 * a root layout, globals + tokens, components, and the config a real Next app
 * needs. Each `page.tsx` is the SAME codegen output as the plain export (default
 * export + metadata), so the App Router picks it up directly.
 */
export async function exportNextProjectZip(project: Project) {
  const zip = new JSZip();
  const root = zip.folder(pascalCase(project.name) || "project")!;
  const app = root.folder("app")!;

  // Routes: first screen is the index ("/"); others get their own segment.
  const usedRoutes = new Set<string>();
  project.screens.forEach((screen, i) => {
    const code = generatePageCode(screen, project);
    if (i === 0) {
      app.file("page.tsx", code);
      return;
    }
    let seg = routeSegment(screen.name, screen.path);
    let dedup = seg;
    let n = 2;
    while (usedRoutes.has(dedup)) dedup = `${seg}-${n++}`;
    usedRoutes.add(dedup);
    app.folder(dedup)!.file("page.tsx", code);
  });

  app.file("layout.tsx", rootLayout(project));
  app.file(
    "globals.css",
    `@import "./design-tokens.css";\n\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`
  );

  const t = project.designSystem?.tokens;
  if (t) {
    app.file(
      "design-tokens.css",
      `:root {\n${paletteVarBlock(t.light, t.radius)}\n}\n\n` +
        `.dark {\n${paletteVarBlock(t.dark, t.radius)}\n}\n\n` +
        `.bg-brand { background-image: linear-gradient(135deg, hsl(var(--brand-from)), hsl(var(--brand-to))); }\n`
    );
  }

  const comps = project.designSystem?.components ?? [];
  if (comps.length) {
    const cf = root.folder("components")!;
    const cseen = new Map<string, number>();
    for (const def of comps) {
      let name = pascalCase(def.name) || "Component";
      const k = cseen.get(name) ?? 0;
      cseen.set(name, k + 1);
      if (k > 0) name = `${name}${k + 1}`;
      cf.file(`${name}.tsx`, generateComponentCode(def.root, project));
    }
  }

  // Favicon + PWA manifest from the project's site meta.
  const meta = project.meta ?? {};
  const pub = root.folder("public")!;
  const iconFile = meta.icon ? dataUriToFile(pub, "favicon", meta.icon) : null;
  pub.file(
    "manifest.json",
    JSON.stringify(
      {
        name: project.name,
        short_name: project.name.slice(0, 12),
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: meta.themeColor ?? "#00a562",
        ...(iconFile
          ? { icons: [{ src: `/${iconFile.name}`, sizes: "any", type: iconFile.mime }] }
          : {}),
      },
      null,
      2
    ) + "\n"
  );

  root.file("package.json", nextPackageJson(project.name));
  root.file("next.config.mjs", `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nexport default nextConfig;\n`);
  root.file(
    "postcss.config.js",
    `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`
  );
  root.file("tailwind.config.ts", nextTailwindConfig());
  root.file("tsconfig.json", nextTsconfig());
  root.file(
    "README.md",
    `# ${project.name}\n\nExported from BuildBoard as a Next.js (App Router) app.\n\n` +
      "```bash\nnpm install\nnpm run dev\n```\n\n" +
      `Routes live under \`app/\`. Components reference shadcn/ui primitives — run ` +
      `\`npx shadcn@latest init\` and add the referenced primitives (button, input, …) ` +
      `to compile. The design system is in \`app/design-tokens.css\`.\n`
  );

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(`${pascalCase(project.name) || "project"}-next.zip`, blob);
}

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/gif": "gif",
};

/** Decode a data URI into a zip file; returns its written name + mime. */
function dataUriToFile(
  folder: JSZip,
  base: string,
  dataUri: string
): { name: string; mime: string } | null {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUri);
  if (!m) return null;
  const mime = m[1] || "application/octet-stream";
  const isBase64 = !!m[2];
  const payload = m[3];
  const name = `${base}.${MIME_EXT[mime] ?? "img"}`;
  if (isBase64) folder.file(name, payload, { base64: true });
  else folder.file(name, decodeURIComponent(payload));
  return { name, mime };
}

function rootLayout(project: Project): string {
  const title = JSON.stringify(project.name);
  const desc = JSON.stringify(
    project.description?.trim() || `${project.name} — built with BuildBoard`
  );
  const meta = project.meta ?? {};
  const themeColor = meta.themeColor ?? "#00a562";
  const iconExt = meta.icon
    ? MIME_EXT[/^data:([^;,]+)/.exec(meta.icon)?.[1] ?? ""] ?? "img"
    : null;
  const iconsBlock = iconExt ? `\n  icons: { icon: "/favicon.${iconExt}" },` : "";
  return `import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: ${title},
  description: ${desc},
  manifest: "/manifest.json",${iconsBlock}
};

export const viewport: Viewport = {
  themeColor: ${JSON.stringify(themeColor)},
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}

function nextPackageJson(name: string): string {
  return (
    JSON.stringify(
      {
        name: (pascalCase(name) || "project").toLowerCase(),
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
        },
        dependencies: {
          next: "^14.2.0",
          react: "^18.3.1",
          "react-dom": "^18.3.1",
        },
        devDependencies: {
          "@types/node": "^20",
          "@types/react": "^18",
          "@types/react-dom": "^18",
          autoprefixer: "^10.4.0",
          postcss: "^8.4.0",
          tailwindcss: "^3.4.0",
          typescript: "^5.4.0",
        },
      },
      null,
      2
    ) + "\n"
  );
}

function nextTailwindConfig(): string {
  const c = (name: string) =>
    `${name}: { DEFAULT: "hsl(var(--${name}))", foreground: "hsl(var(--${name}-foreground))" }`;
  return `import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
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

export default config;
`;
}

function nextTsconfig(): string {
  return (
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2
    ) + "\n"
  );
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
