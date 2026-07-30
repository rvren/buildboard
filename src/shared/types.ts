export type NodeType =
  | "Container"
  | "Grid"
  | "Heading"
  | "Text"
  | "Link"
  | "Button"
  | "Input"
  | "Textarea"
  | "Card"
  | "Badge"
  | "Avatar"
  | "Image"
  | "Icon"
  | "Divider"
  | "Switch"
  | "Checkbox"
  | "Instance";

/**
 * Structured style tokens. Both the canvas renderer and the code generator
 * translate this single source of truth into Tailwind classes.
 * `undefined` / "" means "not set" (omitted from output).
 */
export interface StyleTokens {
  // layout
  display?: "flex" | "grid" | "block";
  direction?: "row" | "col";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
  wrap?: boolean;
  gap?: number; // tailwind gap scale (0-12)
  gridCols?: number; // for Grid
  // spacing
  padding?: number; // p-{n}
  margin?: number; // m-{n}
  // sizing
  width?: string; // "full" | "auto" | "fit" | "1/2" | "px value like 320"
  height?: string;
  // appearance
  bg?: string; // token key, e.g. "background" | "primary" | "muted" | "card" | "transparent"
  textColor?: string;
  radius?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  border?: boolean;
  shadow?: "none" | "sm" | "md" | "lg" | "xl";
  opacity?: number; // 0-100; snaps to Tailwind's opacity scale on export

  // typography
  fontSize?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  fontWeight?: "normal" | "medium" | "semibold" | "bold";
  textAlign?: "left" | "center" | "right";
}

/**
 * A prop whose value is sourced from data instead of a static literal.
 * `sourceId` is a DataSource id, or a sentinel:
 *   "$item"   — the current repeater item
 *   "$screen" — the current screen's primary data source
 */
export interface Binding {
  sourceId: string;
  path: string; // field path within the source schema, e.g. "title" or "items[].name"
}

export const ITEM_SOURCE = "$item";
export const SCREEN_SOURCE = "$screen";

/** Interactive behavior attached to a node (currently Button onClick). */
export interface NodeAction {
  trigger: "click";
  type: "none" | "navigate" | "request";
  targetScreenId?: string; // for navigate
  dataSourceId?: string; // for request
}

/** Responsive breakpoints (mobile-first): base < sm < md < lg. */
export type Breakpoint = "sm" | "md" | "lg";
export const BREAKPOINTS: Breakpoint[] = ["sm", "md", "lg"];

export interface DesignNode {
  id: string;
  type: NodeType;
  name?: string;
  props: Record<string, any>;
  styles: StyleTokens;
  /**
   * Per-breakpoint style overrides (mobile-first). `styles` is the base; each
   * breakpoint patches over the cascade below it. Drives responsive Tailwind on
   * export (e.g. `w-full md:w-1/2`) and the canvas preview at the active breakpoint.
   */
  responsive?: Partial<Record<Breakpoint, Partial<StyleTokens>>>;
  children: DesignNode[];
  /** propName -> Binding. Bound props render from data. */
  bindings?: Record<string, Binding>;
  action?: NodeAction;
  /** When set, this container repeats once per item of the bound array. */
  repeat?: Binding;
  /**
   * When set, this node is an INSTANCE of a design-system ComponentDefinition
   * (`type` is "Instance"). It renders the definition's subtree; editing the
   * definition updates every instance across all screens.
   */
  instanceOf?: string;
  /** Prop patch applied to the definition's root when rendering this instance. */
  overrides?: Record<string, any>;
  /** Selected variant id (of the definition's `variants`) for this instance. */
  variant?: string;
  /** Hidden from the canvas, preview, and export (toggled in the Layers panel). */
  hidden?: boolean;
}

export interface Screen {
  id: string;
  name: string;
  /** Page metadata for multi-page sites — exported as `export const metadata`. */
  title?: string;
  description?: string;
  /** Route path for this page, e.g. "/" or "/about". */
  path?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  root: DesignNode;
  /** Primary data source for this screen ($screen bindings resolve to it). */
  dataSourceId?: string;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HeaderPair {
  key: string;
  value: string;
}

export type SchemaFieldType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null";

export interface SchemaField {
  path: string;
  type: SchemaFieldType;
}

export interface RequestResult {
  status: number;
  ok: boolean;
  timeMs: number;
  body: string;
  at: number;
}

export type DataSourceKind = "api" | "constant";

export interface DataSource {
  id: string;
  name: string;
  kind: DataSourceKind;
  // api
  method: HttpMethod;
  url: string;
  headers: HeaderPair[];
  auth: { type: "none" | "bearer"; token?: string };
  body?: string;
  lastResult?: RequestResult;
  lastError?: string;
  // constant
  data?: string; // JSON string
  // shared
  schema?: SchemaField[];
}

export type ProjectMode = "static" | "dynamic";

/** Full semantic color palette for one theme (all values are #RRGGBB hex). */
export interface ThemePalette {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
  border: string;
  input: string;
  ring: string;
  brandFrom: string;
  brandTo: string;
}

export type ThemeMode = "light" | "dark";

export interface DesignTokens {
  /** Full palette per theme, independently editable. */
  light: ThemePalette;
  dark: ThemePalette;
  radius: number; // px, shared across themes
  font: string; // body font family name, shared across themes
  headingFont?: string; // optional display font for headings (falls back to `font`)
}

export interface ComponentPreset {
  id: string;
  name: string;
  type: NodeType;
  props: Record<string, any>;
  styles: StyleTokens;
}

/**
 * A reusable component built in the Design System. `root` is a canonical
 * DesignNode subtree; page nodes with `instanceOf === id` render through it,
 * so editing the definition fans out to every instance on every screen.
 */
/** A named variant of a component: a style-token patch applied to its root. */
export interface ComponentVariant {
  id: string;
  name: string;
  styles: Partial<StyleTokens>;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  root: DesignNode;
  /** Named variants selectable per instance (e.g. primary / secondary / ghost). */
  variants?: ComponentVariant[];
}

export interface DesignSystem {
  tokens: DesignTokens;
  presets: ComponentPreset[];
  components: ComponentDefinition[];
}

export type ServiceKind =
  | "frontend"
  | "service"
  | "database"
  | "external"
  | "queue"
  | "auth";

export interface ArchService {
  id: string;
  name: string;
  kind: ServiceKind;
  description?: string;
}

export interface ArchInteraction {
  id: string;
  from: string; // service id
  to: string; // service id
  label?: string;
}

export interface SeqStep {
  id: string;
  from: string; // participant name
  to: string; // participant name
  message: string;
  type: "sync" | "async" | "response";
}

export interface SequenceDiagram {
  id: string;
  name: string;
  steps: SeqStep[];
}

export interface Architecture {
  services: ArchService[];
  interactions: ArchInteraction[];
  sequences: SequenceDiagram[];
}

/** Site-level settings, exported as PWA manifest + `<head>` metadata. */
export interface ProjectMeta {
  /** Browser theme color (hex), used for the manifest + theme-color meta. */
  themeColor?: string;
  /** Favicon / app icon as a self-contained data URI. */
  icon?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  meta?: ProjectMeta;
  mode: ProjectMode;
  createdAt: number;
  updatedAt: number;
  screens: Screen[];
  dataSources: DataSource[];
  designSystem: DesignSystem;
  architecture: Architecture;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// ---------------------------------------------------------------------------
// Desktop bridge — the renderer↔main surface. The renderer has no Node/DB
// access; everything flows through the preload's typed `window.api`.
// ---------------------------------------------------------------------------

export type ThemeState = { mode: ThemeMode };

/** A restorable point-in-time snapshot of a project (metadata only; no tree). */
export interface SnapshotMeta {
  id: string;
  projectId: string;
  label: string;
  createdAt: number;
}

export interface BuildBoardApi {
  /** Persisted projects, hydrated from the normalized SQLite tables. */
  listProjects: () => Promise<Project[]>;
  /** Full-rewrite of one project (delete its rows + reinsert) in a transaction. */
  saveProject: (project: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  /** Synchronous theme read for the no-flash boot script. */
  getThemeSync: () => ThemeState;
  setTheme: (mode: ThemeMode) => Promise<void>;
  // AI generate-from-prompt (BYO Anthropic key; desktop only).
  aiHasKey: () => Promise<boolean>;
  aiSetKey: (key: string) => Promise<void>;
  aiClearKey: () => Promise<void>;
  aiGenerate: (
    prompt: string
  ) => Promise<{ ok: true; nodes: DesignNode[] } | { ok: false; error: string }>;
  // Restorable per-project version snapshots (the project tree, versioned).
  listSnapshots: (projectId: string) => Promise<SnapshotMeta[]>;
  createSnapshot: (projectId: string, label: string) => Promise<SnapshotMeta | null>;
  restoreSnapshot: (snapshotId: string) => Promise<Project | null>;
  deleteSnapshot: (snapshotId: string) => Promise<void>;
}

declare global {
  interface Window {
    api: BuildBoardApi;
  }
}
