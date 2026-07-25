export type NodeType =
  | "Container"
  | "Grid"
  | "Heading"
  | "Text"
  | "Button"
  | "Input"
  | "Textarea"
  | "Card"
  | "Badge"
  | "Avatar"
  | "Image"
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

export interface DesignNode {
  id: string;
  type: NodeType;
  name?: string;
  props: Record<string, any>;
  styles: StyleTokens;
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
}

export interface Screen {
  id: string;
  name: string;
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
  font: string; // font family name, shared across themes
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
export interface ComponentDefinition {
  id: string;
  name: string;
  root: DesignNode;
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

export interface Project {
  id: string;
  name: string;
  description?: string;
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
