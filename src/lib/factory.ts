import type {
  Architecture,
  DataSource,
  DataSourceKind,
  DesignNode,
  DesignSystem,
  NodeType,
  Project,
  ProjectMode,
  Screen,
} from "@/types";
import type { ThemePalette } from "@/types";
import { defFor } from "@/lib/nodeDefs";
import { uid } from "@/lib/utils";
import { schemaFromBody } from "@/lib/dataSource";
import { hslTripleToHex } from "@/lib/designSystem";

/** Source-of-truth default palettes, mirroring src/index.css `:root` / `.dark`. */
const LIGHT_HSL: Record<keyof ThemePalette, string> = {
  background: "220 20% 98.5%",
  foreground: "224 14% 14%",
  card: "0 0% 100%",
  cardForeground: "224 14% 14%",
  popover: "0 0% 100%",
  popoverForeground: "224 14% 14%",
  primary: "243 75% 60%",
  primaryForeground: "0 0% 100%",
  secondary: "220 14% 96%",
  secondaryForeground: "224 14% 22%",
  muted: "220 14% 96%",
  mutedForeground: "220 9% 46%",
  accent: "220 14% 95%",
  accentForeground: "224 14% 20%",
  destructive: "352 78% 56%",
  destructiveForeground: "0 0% 100%",
  success: "158 64% 42%",
  warning: "32 90% 52%",
  border: "220 13% 91%",
  input: "220 13% 90%",
  ring: "243 75% 60%",
  brandFrom: "243 75% 60%",
  brandTo: "275 80% 66%",
};

const DARK_HSL: Record<keyof ThemePalette, string> = {
  background: "220 8% 9%",
  foreground: "220 14% 93%",
  card: "220 7% 12%",
  cardForeground: "220 14% 93%",
  popover: "220 7% 13%",
  popoverForeground: "220 14% 93%",
  primary: "248 90% 72%",
  primaryForeground: "240 30% 10%",
  secondary: "220 6% 17%",
  secondaryForeground: "220 14% 93%",
  muted: "220 6% 16%",
  mutedForeground: "220 8% 60%",
  accent: "220 6% 18%",
  accentForeground: "220 14% 90%",
  destructive: "352 74% 62%",
  destructiveForeground: "0 0% 100%",
  success: "158 60% 52%",
  warning: "32 92% 62%",
  border: "220 6% 20%",
  input: "220 6% 22%",
  ring: "248 90% 72%",
  brandFrom: "248 85% 66%",
  brandTo: "278 80% 68%",
};

function paletteFromHsl(src: Record<keyof ThemePalette, string>): ThemePalette {
  const out = {} as ThemePalette;
  for (const key of Object.keys(src) as (keyof ThemePalette)[]) {
    out[key] = hslTripleToHex(src[key]);
  }
  return out;
}

/** Default design tokens: full light + dark palettes, shared radius/font. */
export function defaultTokens() {
  return {
    light: paletteFromHsl(LIGHT_HSL),
    dark: paletteFromHsl(DARK_HSL),
    radius: 14,
    font: "Geist",
  };
}

export function createNode(type: NodeType): DesignNode {
  const def = defFor(type);
  return {
    id: uid("node"),
    type,
    name: def.label,
    props: { ...def.defaultProps },
    styles: { ...def.defaultStyles },
    children: [],
  };
}

/** A screen's root is always a full-size Container. */
export function createRoot(): DesignNode {
  const root = createNode("Container");
  root.name = "Root";
  root.styles = {
    display: "flex",
    direction: "col",
    gap: 6,
    padding: 8,
    width: "full",
    height: "full",
    bg: "background",
  };
  return root;
}

export function createScreen(
  name: string,
  opts?: { width?: number; height?: number; x?: number; y?: number }
): Screen {
  return {
    id: uid("screen"),
    name,
    width: opts?.width ?? 1280,
    height: opts?.height ?? 832,
    x: opts?.x ?? 0,
    y: opts?.y ?? 0,
    root: createRoot(),
  };
}

/** Convenience builder used by the demo seed. */
function node(
  type: NodeType,
  overrides: Partial<Pick<DesignNode, "props" | "styles" | "name">> = {},
  children: DesignNode[] = []
): DesignNode {
  const base = createNode(type);
  return {
    ...base,
    name: overrides.name ?? base.name,
    props: { ...base.props, ...overrides.props },
    styles: { ...base.styles, ...overrides.styles },
    children,
  };
}

/** A polished landing-style demo screen so a new project isn't empty. */
export function createDemoScreen(): Screen {
  const screen = createScreen("Landing");
  screen.root = node(
    "Container",
    {
      name: "Root",
      styles: {
        display: "flex",
        direction: "col",
        gap: 8,
        padding: 10,
        width: "full",
        height: "full",
        bg: "background",
      },
    },
    [
      // Nav
      node(
        "Container",
        {
          name: "Navbar",
          styles: {
            display: "flex",
            direction: "row",
            align: "center",
            justify: "between",
            width: "full",
            padding: 0,
          },
        },
        [
          node("Heading", {
            props: { content: "Acme", level: 3 },
            styles: { fontSize: "xl", fontWeight: "bold", textColor: "foreground" },
          }),
          node(
            "Container",
            {
              name: "NavActions",
              styles: { display: "flex", direction: "row", gap: 2, align: "center", padding: 0 },
            },
            [
              node("Button", { props: { label: "Sign in", variant: "ghost", size: "sm" } }),
              node("Button", { props: { label: "Get started", variant: "default", size: "sm" } }),
            ]
          ),
        ]
      ),
      // Hero
      node(
        "Container",
        {
          name: "Hero",
          styles: {
            display: "flex",
            direction: "col",
            gap: 4,
            align: "center",
            padding: 8,
            width: "full",
          },
        },
        [
          node("Badge", { props: { label: "New · v2.0", variant: "secondary" } }),
          node("Heading", {
            props: { content: "Design and ship UI, faster", level: 1 },
            styles: { fontSize: "4xl", fontWeight: "bold", textAlign: "center", textColor: "foreground" },
          }),
          node("Text", {
            props: {
              content:
                "Build interfaces on a canvas and export clean React + Tailwind code in seconds.",
            },
            styles: { fontSize: "lg", textColor: "muted", textAlign: "center", width: "2/3" },
          }),
          node(
            "Container",
            {
              name: "CTA",
              styles: { display: "flex", direction: "row", gap: 3, justify: "center", padding: 0 },
            },
            [
              node("Button", { props: { label: "Start building", variant: "default", size: "lg" } }),
              node("Button", { props: { label: "Documentation", variant: "outline", size: "lg" } }),
            ]
          ),
        ]
      ),
      // Feature cards
      node(
        "Grid",
        {
          name: "Features",
          styles: { display: "grid", gridCols: 3, gap: 4, width: "full" },
        },
        [
          featureCard("Canvas editor", "Drag, drop, and arrange components visually."),
          featureCard("Live code", "See production React for every element instantly."),
          featureCard("Export ready", "Copy or download clean, typed components."),
        ]
      ),
    ]
  );
  return screen;
}

function featureCard(title: string, body: string): DesignNode {
  return node(
    "Card",
    {
      styles: { display: "flex", direction: "col", gap: 2, padding: 6, width: "full" },
    },
    [
      node("Heading", {
        props: { content: title, level: 4 },
        styles: { fontSize: "lg", fontWeight: "semibold", textColor: "foreground" },
      }),
      node("Text", {
        props: { content: body },
        styles: { fontSize: "sm", textColor: "muted" },
      }),
    ]
  );
}

const SAMPLE_CONSTANT = JSON.stringify(
  {
    title: "Welcome to Acme",
    subtitle: "The fastest way to ship your product.",
    ctaLabel: "Get started",
  },
  null,
  2
);

export function createDataSource(
  name: string,
  kind: DataSourceKind = "api"
): DataSource {
  return {
    id: uid("ds"),
    name,
    kind,
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/todos/1",
    headers: [],
    auth: { type: "none" },
    body: "",
    data: kind === "constant" ? SAMPLE_CONSTANT : undefined,
    schema:
      kind === "constant"
        ? schemaFromBody(SAMPLE_CONSTANT) ?? undefined
        : undefined,
  };
}

export function defaultDesignSystem(): DesignSystem {
  return {
    tokens: defaultTokens(),
    presets: [],
    components: [],
  };
}

export function defaultArchitecture(): Architecture {
  return {
    services: [{ id: uid("svc"), name: "Web App", kind: "frontend" }],
    interactions: [],
    sequences: [],
  };
}

export function createProject(
  name: string,
  mode: ProjectMode = "static",
  description?: string
): Project {
  const now = Date.now();
  return {
    id: uid("proj"),
    name,
    mode,
    description,
    createdAt: now,
    updatedAt: now,
    screens: [createDemoScreen()],
    dataSources: [],
    designSystem: defaultDesignSystem(),
    architecture: defaultArchitecture(),
  };
}
