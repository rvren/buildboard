import { create } from "zustand";
import type {
  Architecture,
  Breakpoint,
  ComponentDefinition,
  ComponentPreset,
  DataSource,
  DataSourceKind,
  DesignNode,
  DesignTokens,
  ThemeMode,
  ThemePalette,
  NodeAction,
  NodeType,
  Project,
  ProjectMeta,
  ProjectMode,
  Screen,
  StyleTokens,
  Viewport,
} from "@/types";
import { uid } from "@/lib/utils";
import {
  createDataSource,
  createNode,
  createProject,
  createScreen,
  defaultArchitecture,
  defaultDesignSystem,
  defaultTokens,
} from "@/lib/factory";
import { createProjectFromTemplate } from "@/lib/templates";
import type { CbSim } from "@/lib/colorBlind";
import { deriveServices, deriveSequence } from "@/lib/architecture";
import {
  cloneNodeWithNewIds,
  findNode,
  findParent,
  insertChild,
  isAncestor,
  removeNode,
  updateNodeById,
} from "@/lib/tree";
import { defFor } from "@/lib/nodeDefs";
import { persistence } from "@/lib/persistence";

export type EditorView =
  | "overview"
  | "design"
  | "flow"
  | "system"
  | "architecture";

/** All editor views, in nav order — also the valid URL `:view` segments. */
export const EDITOR_VIEWS: EditorView[] = [
  "overview",
  "system",
  "architecture",
  "design",
  "flow",
];

/** Coerce an unknown URL segment to a valid view (defaults to overview). */
export function parseView(v: string | undefined | null): EditorView {
  return EDITOR_VIEWS.includes(v as EditorView) ? (v as EditorView) : "overview";
}

/**
 * A view→URL navigator registered by the mounted EditorPage. `setEditorView`
 * calls it so every existing caller updates the route with no code changes.
 * Store code can't use `useNavigate`, hence this small registry.
 */
/** App-level node clipboard (copy on one screen, paste on another). */
let _clipboard: DesignNode | null = null;
let _viewNav: ((view: EditorView) => void) | null = null;
export function registerViewNavigator(fn: ((view: EditorView) => void) | null) {
  _viewNav = fn;
}

interface EditorState {
  projects: Project[];
  currentProjectId: string | null;
  currentScreenId: string | null;
  selectedNodeId: string | null;
  /** Multi-selection (always includes the primary selectedNodeId). */
  selectedNodeIds: string[];
  viewport: Viewport;
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
  /** Editor undo/redo over the active project's edits (in-session history). */
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /** Active responsive breakpoint being edited/previewed on the canvas. */
  activeBreakpoint: "base" | Breakpoint;
  setActiveBreakpoint: (bp: "base" | Breakpoint) => void;
  editorView: "overview" | "design" | "flow" | "system" | "architecture";
  setEditorView: (
    v: "overview" | "design" | "flow" | "system" | "architecture"
  ) => void;
  leftTool: "insert" | "layers" | "data" | "pages";
  setLeftTool: (v: "insert" | "layers" | "data" | "pages") => void;
  /** Design System sub-tool (left rail). */
  systemTool: "tokens" | "components";
  setSystemTool: (v: "tokens" | "components") => void;
  /** Architecture sub-tool (left rail). */
  archTool: "services" | "sequences";
  setArchTool: (v: "services" | "sequences") => void;
  /** Selected sequence in the Architecture view (shared by rail editor + diagram). */
  selectedSeqId: string | null;
  setSelectedSeqId: (id: string | null) => void;
  /** When set, the canvas + node tools edit this component definition's root. */
  editingComponentId: string | null;
  editComponent: (id: string | null) => void;
  dataDialogOpen: boolean;
  setDataDialogOpen: (v: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (v: boolean) => void;
  githubDialogOpen: boolean;
  setGithubDialogOpen: (v: boolean) => void;

  // ----- project CRUD
  addProject: (name: string, mode: ProjectMode, description?: string) => string;
  addProjectFromTemplate: (
    name: string,
    mode: ProjectMode,
    templateId: string
  ) => string;
  renameProject: (id: string, name: string) => void;
  /** Patch a project's site meta (favicon + PWA/theme-color). */
  updateProjectMeta: (id: string, patch: Partial<ProjectMeta>) => void;
  /** Save a restorable snapshot of the current project. */
  createProjectSnapshot: (label: string) => Promise<void>;
  /** Restore a snapshot into the live project (overwrites it). */
  restoreProjectSnapshot: (snapshotId: string) => Promise<void>;
  // ----- global find & replace (text content across all screens + components)
  findReplaceOpen: boolean;
  setFindReplaceOpen: (v: boolean) => void;
  quickInsertOpen: boolean;
  setQuickInsertOpen: (v: boolean) => void;
  responsivePreviewOpen: boolean;
  setResponsivePreviewOpen: (v: boolean) => void;
  focusOrderOpen: boolean;
  setFocusOrderOpen: (v: boolean) => void;
  /** Color-blindness simulation applied over the canvas. */
  cbSim: CbSim;
  setCbSim: (v: CbSim) => void;
  nodeSearchOpen: boolean;
  setNodeSearchOpen: (v: boolean) => void;
  /** Canvas dot-grid visibility (declutter toggle). */
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  countTextMatches: (find: string, caseSensitive: boolean) => number;
  replaceTextEverywhere: (
    find: string,
    replace: string,
    caseSensitive: boolean
  ) => number;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  /** Import a project from a parsed `.json` file (fresh ids); returns its id. */
  importProject: (raw: unknown) => string | null;
  setProjectMode: (id: string, mode: ProjectMode) => void;

  // ----- navigation
  openProject: (id: string) => void;
  closeProject: () => void;
  setSelected: (id: string | null) => void;
  /** Shift-click: add/remove a node from the multi-selection. */
  toggleSelectNode: (id: string) => void;
  /** Delete every node in the multi-selection. */
  deleteSelection: () => void;
  setViewport: (v: Partial<Viewport>) => void;

  // ----- screens
  addScreen: (name?: string) => void;
  selectScreen: (id: string) => void;
  renameScreen: (id: string, name: string) => void;
  /** Update a page's metadata (title / description / path). */
  updateScreenMeta: (
    id: string,
    patch: Partial<Pick<Screen, "title" | "description" | "path" | "background">>
  ) => void;
  deleteScreen: (id: string) => void;
  /** Deep-clone a screen (fresh node ids) and select the copy. */
  duplicateScreen: (id: string) => void;
  /** Move a screen left/right in the switcher order. */
  moveScreen: (id: string, dir: -1 | 1) => void;

  // ----- nodes
  addNode: (parentId: string, type: NodeType, index?: number) => string | null;
  /** Append a starter layout's subtree(s) to the active root (fresh ids). */
  insertStarter: (children: DesignNode[]) => void;
  moveNode: (nodeId: string, newParentId: string, index: number) => void;
  reorderNode: (nodeId: string, direction: -1 | 1) => void;
  updateNodeProps: (nodeId: string, props: Record<string, any>) => void;
  updateNodeStyles: (nodeId: string, styles: Partial<StyleTokens>) => void;
  renameNode: (nodeId: string, name: string) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  /** Wrap a node in a new Container ("group"); selects the container. */
  wrapSelection: (nodeId: string) => void;
  /** Toggle a node's hidden flag (Layers panel show/hide). */
  toggleNodeHidden: (nodeId: string) => void;
  toggleNodeLocked: (nodeId: string) => void;
  /** Copy / cut a node to the app clipboard; paste into the selection or root. */
  copyNode: (nodeId: string) => void;
  cutNode: (nodeId: string) => void;
  pasteNode: () => void;

  // ----- bindings & actions
  setNodeBinding: (
    nodeId: string,
    prop: string,
    binding: { sourceId: string; path: string } | null
  ) => void;
  setNodeAction: (nodeId: string, action: NodeAction | null) => void;
  setNodeRepeat: (
    nodeId: string,
    repeat: { sourceId: string; path: string } | null
  ) => void;
  setNodeVisibleIf: (
    nodeId: string,
    binding: { sourceId: string; path: string } | null
  ) => void;
  setScreenData: (screenId: string, sourceId: string | null) => void;

  // ----- design system (project-scoped)
  updateTokens: (patch: Partial<DesignTokens>) => void;
  /** Replace the project's design tokens from imported JSON (normalized). */
  importTokens: (raw: unknown) => void;
  /** Update one theme's palette (light or dark). */
  updateThemeToken: (mode: ThemeMode, patch: Partial<ThemePalette>) => void;
  addPreset: (fromNodeId: string, name: string) => void;
  updatePreset: (id: string, patch: Partial<ComponentPreset>) => void;
  deletePreset: (id: string) => void;
  createNodeFromPreset: (
    parentId: string,
    presetId: string,
    index?: number
  ) => string | null;

  // ----- design-system components (reusable definitions + instances)
  addComponentDefinition: (name: string) => string;
  /** Create a component definition whose root is a freshly-seeded node of `type`. */
  addComponentDefinitionOfType: (name: string, type: NodeType) => string;
  createComponentFromNode: (nodeId: string, name: string) => string | null;
  renameComponentDefinition: (id: string, name: string) => void;
  deleteComponentDefinition: (id: string) => void;
  /** Import component definitions (from a JSON library) with fresh ids. */
  importComponents: (defs: ComponentDefinition[]) => number;
  createInstance: (
    parentId: string,
    defId: string,
    index?: number
  ) => string | null;
  setInstanceOverride: (nodeId: string, patch: Record<string, any>) => void;
  /** Select (or clear) which variant of its definition an instance uses. */
  setInstanceVariant: (nodeId: string, variantId: string | null) => void;
  /** Capture a named variant (style patch) on a component definition. */
  addComponentVariant: (
    defId: string,
    name: string,
    styles: Partial<StyleTokens>
  ) => void;
  deleteComponentVariant: (defId: string, variantId: string) => void;

  // ----- architecture (project-scoped)
  updateArchitecture: (fn: (a: Architecture) => Architecture) => void;
  syncArchitecture: () => void;

  // ----- data sources (project-scoped)
  addDataSource: (name?: string, kind?: DataSourceKind) => string | null;
  updateDataSource: (id: string, patch: Partial<DataSource>) => void;
  deleteDataSource: (id: string) => void;
  duplicateDataSource: (id: string) => void;

  // ----- selectors
  currentProject: () => Project | undefined;
  currentScreen: () => Screen | undefined;
  /** The root the node tools currently edit: a component def root when editing, else the screen root. */
  currentRoot: () => DesignNode | undefined;
}

function touch(p: Project): Project {
  return { ...p, updatedAt: Date.now() };
}

/**
 * Upgrade a persisted `tokens` object to the current light/dark shape.
 * Old projects stored a flat `{ primary, brandFrom, brandTo, radius, font }`;
 * we build full light+dark palettes and carry the old brand/primary into both.
 */
function normalizeTokens(tokens: any): DesignTokens {
  const defaults = defaultTokens();
  if (!tokens) return defaults;
  // Already the new shape — merge with defaults to backfill any missing keys.
  if (tokens.light && tokens.dark) {
    return {
      light: { ...defaults.light, ...tokens.light },
      dark: { ...defaults.dark, ...tokens.dark },
      radius: tokens.radius ?? defaults.radius,
      font: tokens.font ?? defaults.font,
    };
  }
  // Old flat shape: preserve the user's brand/primary in both themes.
  const brand: Partial<ThemePalette> = {};
  if (tokens.primary) {
    brand.primary = tokens.primary;
    brand.ring = tokens.primary;
  }
  if (tokens.brandFrom) brand.brandFrom = tokens.brandFrom;
  if (tokens.brandTo) brand.brandTo = tokens.brandTo;
  return {
    light: { ...defaults.light, ...brand },
    dark: { ...defaults.dark, ...brand },
    radius: tokens.radius ?? defaults.radius,
    font: tokens.font ?? defaults.font,
  };
}

/** Apply an updater to the current screen's root, marking the project dirty. */
function withRoot(
  state: EditorState,
  updater: (root: DesignNode, screen: Screen) => DesignNode
): Partial<EditorState> {
  const projects = state.projects.map((p) => {
    if (p.id !== state.currentProjectId) return p;
    return touch({
      ...p,
      screens: p.screens.map((s) =>
        s.id === state.currentScreenId
          ? { ...s, root: updater(s.root, s) }
          : s
      ),
    });
  });
  return { projects };
}

/**
 * Apply an updater to the ACTIVE root — the component definition being edited
 * (`editingComponentId`), else the current screen's root. This is the single
 * fan-out path: because instances render through their definition, editing a
 * definition updates every instance across all screens.
 */
/** Text-bearing props scanned by global find & replace. */
const TEXT_REPLACE_PROPS = [
  "content",
  "label",
  "placeholder",
  "alt",
  "href",
  "fallback",
] as const;

function countOccurrences(hay: string, needle: string, cs: boolean): number {
  if (!needle) return 0;
  const h = cs ? hay : hay.toLowerCase();
  const n = cs ? needle : needle.toLowerCase();
  let count = 0;
  let i = h.indexOf(n);
  while (i !== -1) {
    count++;
    i = h.indexOf(n, i + n.length);
  }
  return count;
}

function replaceOccurrences(
  hay: string,
  needle: string,
  repl: string,
  cs: boolean
): { result: string; n: number } {
  const n = countOccurrences(hay, needle, cs);
  if (n === 0) return { result: hay, n: 0 };
  if (cs) return { result: hay.split(needle).join(repl), n };
  // Case-insensitive replace preserving non-matched text.
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { result: hay.replace(new RegExp(esc, "gi"), repl), n };
}

/** Deep-clone a project with fresh ids everywhere (instances stay linked to their
 *  remapped component definitions). Used by duplicate + import. */
function cloneProjectDeep(src: Project, name: string): Project {
  const defIdMap = new Map<string, string>();
  const components = (src.designSystem?.components ?? []).map((c) => {
    const nid = uid("cmp");
    defIdMap.set(c.id, nid);
    return { ...c, id: nid, root: cloneNodeWithNewIds(c.root, uid) };
  });
  const remapInstances = (node: DesignNode): DesignNode => ({
    ...node,
    instanceOf: node.instanceOf
      ? defIdMap.get(node.instanceOf) ?? node.instanceOf
      : node.instanceOf,
    children: (node.children ?? []).map(remapInstances),
  });
  return {
    ...src,
    id: uid("proj"),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    screens: src.screens.map((sc) => ({
      ...sc,
      id: uid("screen"),
      root: remapInstances(cloneNodeWithNewIds(sc.root, uid)),
    })),
    dataSources: (src.dataSources ?? []).map((d) => ({
      ...d,
      id: uid("ds"),
      headers: (d.headers ?? []).map((h) => ({ ...h })),
    })),
    designSystem: src.designSystem
      ? {
          tokens: {
            ...src.designSystem.tokens,
            light: { ...src.designSystem.tokens.light },
            dark: { ...src.designSystem.tokens.dark },
          },
          presets: (src.designSystem.presets ?? []).map((pr) => ({
            ...pr,
            id: uid("preset"),
          })),
          components,
        }
      : defaultDesignSystem(),
    architecture: src.architecture
      ? {
          services: src.architecture.services.map((sv) => ({ ...sv })),
          interactions: src.architecture.interactions.map((i) => ({ ...i })),
          sequences: src.architecture.sequences.map((sq) => ({
            ...sq,
            steps: sq.steps.map((st) => ({ ...st })),
          })),
        }
      : defaultArchitecture(),
  };
}

function withActiveRoot(
  state: EditorState,
  updater: (root: DesignNode) => DesignNode
): Partial<EditorState> {
  const projects = state.projects.map((p) => {
    if (p.id !== state.currentProjectId) return p;
    if (state.editingComponentId) {
      return touch({
        ...p,
        designSystem: {
          ...p.designSystem,
          components: p.designSystem.components.map((c) =>
            c.id === state.editingComponentId
              ? { ...c, root: updater(c.root) }
              : c
          ),
        },
      });
    }
    return touch({
      ...p,
      screens: p.screens.map((s) =>
        s.id === state.currentScreenId ? { ...s, root: updater(s.root) } : s
      ),
    });
  });
  return { projects };
}

/** Replace every instance of `defId` in a subtree with a detached copy of the definition. */
function replaceInstances(
  node: DesignNode,
  defId: string,
  defRoot: DesignNode
): DesignNode {
  if (node.instanceOf === defId) {
    const clone = cloneNodeWithNewIds(defRoot, uid);
    return { ...clone, props: { ...clone.props, ...(node.overrides ?? {}) } };
  }
  return {
    ...node,
    children: node.children.map((c) => replaceInstances(c, defId, defRoot)),
  };
}

export const useEditor = create<EditorState>()(
  (set, get) => ({
      projects: [],
      currentProjectId: null,
      currentScreenId: null,
      selectedNodeId: null,
      selectedNodeIds: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      previewMode: false,
      setPreviewMode: (v) => set({ previewMode: v, selectedNodeId: null }),
      canUndo: false,
      canRedo: false,
      undo: () => historyUndo(),
      redo: () => historyRedo(),
      activeBreakpoint: "base",
      setActiveBreakpoint: (bp) => set({ activeBreakpoint: bp }),
      editorView: "overview",
      // Switching top-level views exits component-edit mode so the Insert palette
      // shows custom components again (create-and-edit re-enters it explicitly after).
      // Also mirrors the view into the URL via the registered navigator.
      setEditorView: (v) => {
        set({ editorView: v, editingComponentId: null });
        _viewNav?.(v);
      },
      leftTool: "insert",
      setLeftTool: (v) => set({ leftTool: v }),
      systemTool: "tokens",
      setSystemTool: (v) => set({ systemTool: v }),
      archTool: "services",
      setArchTool: (v) => set({ archTool: v }),
      selectedSeqId: null,
      setSelectedSeqId: (id) => set({ selectedSeqId: id }),
      editingComponentId: null,
      editComponent: (id) =>
        set({ editingComponentId: id, selectedNodeId: null }),
      dataDialogOpen: false,
      setDataDialogOpen: (v) => set({ dataDialogOpen: v }),
      commandOpen: false,
      setCommandOpen: (v) => set({ commandOpen: v }),
      shortcutsOpen: false,
      setShortcutsOpen: (v) => set({ shortcutsOpen: v }),
      githubDialogOpen: false,
      setGithubDialogOpen: (v) => set({ githubDialogOpen: v }),

      addProject: (name, mode, description) => {
        const project = createProject(name, mode, description);
        set((s) => ({ projects: [project, ...s.projects] }));
        return project.id;
      },

      addProjectFromTemplate: (name, mode, templateId) => {
        const project = createProjectFromTemplate(name, mode, templateId);
        set((s) => ({ projects: [project, ...s.projects] }));
        return project.id;
      },

      renameProject: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? touch({ ...p, name }) : p
          ),
        })),

      updateProjectMeta: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? touch({ ...p, meta: { ...(p.meta ?? {}), ...patch } })
              : p
          ),
        })),

      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          currentProjectId:
            s.currentProjectId === id ? null : s.currentProjectId,
        })),

      createProjectSnapshot: async (label) => {
        const project = get().currentProject();
        if (!project) return;
        // Flush the latest state to the backend first so the snapshot is current.
        await persistence.saveProject(project);
        await persistence.createSnapshot(project.id, label.trim() || "Snapshot");
      },

      restoreProjectSnapshot: async (snapshotId) => {
        // Safety net: snapshot the current state before overwriting it, so a
        // restore is itself undoable.
        const current = get().currentProject();
        if (current) {
          await persistence.saveProject(current);
          await persistence.createSnapshot(current.id, "Before restore");
        }
        const restored = await persistence.restoreSnapshot(snapshotId);
        if (!restored) return;
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === restored.id ? restored : p
          ),
          selectedNodeId: null,
          selectedNodeIds: [],
        }));
      },

      findReplaceOpen: false,
      setFindReplaceOpen: (v) => set({ findReplaceOpen: v }),
      quickInsertOpen: false,
      setQuickInsertOpen: (v) => set({ quickInsertOpen: v }),
      responsivePreviewOpen: false,
      setResponsivePreviewOpen: (v) => set({ responsivePreviewOpen: v }),
      focusOrderOpen: false,
      setFocusOrderOpen: (v) => set({ focusOrderOpen: v }),
      cbSim: "none",
      setCbSim: (v) => set({ cbSim: v }),
      nodeSearchOpen: false,
      setNodeSearchOpen: (v) => set({ nodeSearchOpen: v }),
      showGrid: true,
      setShowGrid: (v) => set({ showGrid: v }),

      countTextMatches: (find, caseSensitive) => {
        const project = get().currentProject();
        if (!project || !find) return 0;
        let count = 0;
        const scan = (n: DesignNode) => {
          for (const key of TEXT_REPLACE_PROPS) {
            const val = n.props?.[key];
            if (typeof val === "string")
              count += countOccurrences(val, find, caseSensitive);
          }
          for (const c of n.children ?? []) scan(c);
        };
        project.screens.forEach((sc) => scan(sc.root));
        project.designSystem.components.forEach((c) => scan(c.root));
        return count;
      },

      replaceTextEverywhere: (find, replace, caseSensitive) => {
        if (!find) return 0;
        let count = 0;
        const remap = (n: DesignNode): DesignNode => {
          let props = n.props;
          for (const key of TEXT_REPLACE_PROPS) {
            const val = props?.[key];
            if (typeof val === "string" && val) {
              const { result, n: hits } = replaceOccurrences(
                val,
                find,
                replace,
                caseSensitive
              );
              if (hits > 0) {
                count += hits;
                props = { ...props, [key]: result };
              }
            }
          }
          const children = (n.children ?? []).map(remap);
          return props === n.props ? { ...n, children } : { ...n, props, children };
        };
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  screens: p.screens.map((sc) => ({ ...sc, root: remap(sc.root) })),
                  designSystem: {
                    ...p.designSystem,
                    components: p.designSystem.components.map((c) => ({
                      ...c,
                      root: remap(c.root),
                    })),
                  },
                })
              : p
          ),
        }));
        return count;
      },

      setProjectMode: (id, mode) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? touch({ ...p, mode }) : p
          ),
        })),

      duplicateProject: (id) =>
        set((s) => {
          const src = s.projects.find((p) => p.id === id);
          if (!src) return {};
          return { projects: [cloneProjectDeep(src, `${src.name} copy`), ...s.projects] };
        }),

      importProject: (raw) => {
        if (!raw || typeof raw !== "object") return null;
        const src = raw as Project;
        if (!Array.isArray(src.screens) || !src.designSystem) return null;
        const copy = cloneProjectDeep(src, src.name || "Imported project");
        set((s) => ({ projects: [copy, ...s.projects] }));
        return copy.id;
      },

      openProject: (id) => {
        const project = get().projects.find((p) => p.id === id);
        set({
          currentProjectId: id,
          currentScreenId: project?.screens[0]?.id ?? null,
          selectedNodeId: null,
          viewport: { x: 80, y: 80, zoom: 0.85 },
          // editorView is driven by the URL (see EditorPage) — not forced here.
        });
      },

      closeProject: () =>
        set({
          currentProjectId: null,
          currentScreenId: null,
          selectedNodeId: null,
        }),

      setSelected: (id) =>
        set({ selectedNodeId: id, selectedNodeIds: id ? [id] : [] }),

      toggleSelectNode: (id) =>
        set((s) => {
          const has = s.selectedNodeIds.includes(id);
          const ids = has
            ? s.selectedNodeIds.filter((x) => x !== id)
            : [...s.selectedNodeIds, id];
          return {
            selectedNodeIds: ids,
            // Primary stays the most-recently-added (or the last remaining).
            selectedNodeId: has ? ids[ids.length - 1] ?? null : id,
          };
        }),

      deleteSelection: () =>
        set((s) => {
          const ids = s.selectedNodeIds.length
            ? s.selectedNodeIds
            : s.selectedNodeId
              ? [s.selectedNodeId]
              : [];
          const root = get().currentRoot();
          if (!root || !ids.length) return {};
          const targets = ids.filter((id) => id !== root.id);
          if (!targets.length) return {};
          const patch = withActiveRoot(s, (r) => {
            let tree = r;
            for (const id of targets) tree = removeNode(tree, id).tree;
            return tree;
          });
          return { ...patch, selectedNodeId: null, selectedNodeIds: [] };
        }),

      setViewport: (v) =>
        set((s) => ({ viewport: { ...s.viewport, ...v } })),

      addScreen: (name) =>
        set((s) => {
          const project = s.projects.find((p) => p.id === s.currentProjectId);
          if (!project) return {};
          const count = project.screens.length;
          const screen = createScreen(name || `Screen ${count + 1}`, {
            x: count * (1280 + 120),
            y: 0,
          });
          return {
            projects: s.projects.map((p) =>
              p.id === project.id
                ? touch({ ...p, screens: [...p.screens, screen] })
                : p
            ),
            currentScreenId: screen.id,
            selectedNodeId: null,
          };
        }),

      duplicateScreen: (id) =>
        set((s) => {
          const project = s.projects.find((p) => p.id === s.currentProjectId);
          const src = project?.screens.find((sc) => sc.id === id);
          if (!project || !src) return {};
          const idx = project.screens.findIndex((sc) => sc.id === id);
          const copy: Screen = {
            ...src,
            id: uid("screen"),
            name: `${src.name} copy`,
            x: src.x + 1280 + 120,
            root: cloneNodeWithNewIds(src.root, uid),
          };
          const screens = [...project.screens];
          screens.splice(idx + 1, 0, copy);
          return {
            projects: s.projects.map((p) =>
              p.id === project.id ? touch({ ...p, screens }) : p
            ),
            currentScreenId: copy.id,
            selectedNodeId: null,
          };
        }),

      moveScreen: (id, dir) =>
        set((s) => {
          const project = s.projects.find((p) => p.id === s.currentProjectId);
          if (!project) return {};
          const idx = project.screens.findIndex((sc) => sc.id === id);
          const to = idx + dir;
          if (idx < 0 || to < 0 || to >= project.screens.length) return {};
          const screens = [...project.screens];
          const [moved] = screens.splice(idx, 1);
          screens.splice(to, 0, moved);
          return {
            projects: s.projects.map((p) =>
              p.id === project.id ? touch({ ...p, screens }) : p
            ),
          };
        }),

      selectScreen: (id) => set({ currentScreenId: id, selectedNodeId: null }),

      renameScreen: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  screens: p.screens.map((sc) =>
                    sc.id === id ? { ...sc, name } : sc
                  ),
                })
              : p
          ),
        })),

      updateScreenMeta: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  screens: p.screens.map((sc) =>
                    sc.id === id ? { ...sc, ...patch } : sc
                  ),
                })
              : p
          ),
        })),

      deleteScreen: (id) =>
        set((s) => {
          const project = s.projects.find((p) => p.id === s.currentProjectId);
          if (!project || project.screens.length <= 1) return {};
          const remaining = project.screens.filter((sc) => sc.id !== id);
          return {
            projects: s.projects.map((p) =>
              p.id === project.id
                ? touch({ ...p, screens: remaining })
                : p
            ),
            currentScreenId:
              s.currentScreenId === id
                ? remaining[0]?.id ?? null
                : s.currentScreenId,
            selectedNodeId: null,
          };
        }),

      insertStarter: (children) =>
        set((s) =>
          withActiveRoot(s, (root) => ({
            ...root,
            children: [
              ...root.children,
              ...children.map((c) => cloneNodeWithNewIds(c, uid)),
            ],
          }))
        ),

      addNode: (parentId, type, index = -1) => {
        const root = get().currentRoot();
        if (!root) return null;
        const parent = findNode(root, parentId);
        if (!parent) return null;
        // Only containers accept children; otherwise drop beside the target.
        let targetParentId = parentId;
        let targetIndex = index;
        if (!defFor(parent.type).canHaveChildren) {
          const loc = findParent(root, parentId);
          if (!loc) return null;
          targetParentId = loc.parent.id;
          targetIndex = loc.index + 1;
        }
        const newNode = createNode(type);
        set((s) =>
          withActiveRoot(s, (r) =>
            insertChild(r, targetParentId, newNode, targetIndex)
          )
        );
        set({ selectedNodeId: newNode.id });
        return newNode.id;
      },

      moveNode: (nodeId, newParentId, index) =>
        set((s) => {
          const root = get().currentRoot();
          if (!root) return {};
          if (nodeId === newParentId) return {};
          // Prevent dropping a node into its own descendant.
          if (isAncestor(root, nodeId, newParentId)) return {};
          const parentDef = findNode(root, newParentId);
          if (!parentDef || !defFor(parentDef.type).canHaveChildren) return {};

          return withActiveRoot(s, (r) => {
            const { tree, removed } = removeNode(r, nodeId);
            if (!removed) return r;
            return insertChild(tree, newParentId, removed, index);
          });
        }),

      reorderNode: (nodeId, direction) =>
        set((s) => {
          const root = get().currentRoot();
          if (!root) return {};
          const loc = findParent(root, nodeId);
          if (!loc) return {};
          const target = loc.index + direction;
          if (target < 0 || target >= loc.parent.children.length) return {};
          return withActiveRoot(s, (r) =>
            updateNodeById(r, loc.parent.id, (parent) => {
              const children = [...parent.children];
              const [moved] = children.splice(loc.index, 1);
              children.splice(target, 0, moved);
              return { ...parent, children };
            })
          );
        }),

      updateNodeProps: (nodeId, props) =>
        set((s) =>
          withActiveRoot(s, (root) =>
            updateNodeById(root, nodeId, (n) => ({
              ...n,
              props: { ...n.props, ...props },
            }))
          )
        ),

      updateNodeStyles: (nodeId, styles) =>
        set((s) => {
          const bp = s.activeBreakpoint;
          return withActiveRoot(s, (root) =>
            updateNodeById(root, nodeId, (n) => {
              // At "base" edit the node's base styles; at a breakpoint, write an
              // override so export emits responsive Tailwind (e.g. md:w-1/2).
              if (bp === "base") return { ...n, styles: { ...n.styles, ...styles } };
              const prev = n.responsive?.[bp] ?? {};
              return {
                ...n,
                responsive: { ...n.responsive, [bp]: { ...prev, ...styles } },
              };
            })
          );
        }),

      renameNode: (nodeId, name) =>
        set((s) =>
          withActiveRoot(s, (root) =>
            updateNodeById(root, nodeId, (n) => ({ ...n, name }))
          )
        ),

      toggleNodeHidden: (nodeId) =>
        set((s) =>
          withActiveRoot(s, (root) =>
            updateNodeById(root, nodeId, (n) => ({ ...n, hidden: !n.hidden }))
          )
        ),

      toggleNodeLocked: (nodeId) =>
        set((s) =>
          withActiveRoot(s, (root) =>
            updateNodeById(root, nodeId, (n) => ({ ...n, locked: !n.locked }))
          )
        ),

      copyNode: (nodeId) => {
        const root = get().currentRoot();
        const n = root ? findNode(root, nodeId) : null;
        if (n) _clipboard = cloneNodeWithNewIds(n, uid);
      },

      cutNode: (nodeId) => {
        get().copyNode(nodeId);
        get().deleteNode(nodeId);
      },

      pasteNode: () => {
        if (!_clipboard) return;
        const clone = cloneNodeWithNewIds(_clipboard, uid);
        const st = get();
        const root = st.currentRoot();
        if (!root) return;
        // Target: the selected container, else beside the selection, else the root.
        let parentId = root.id;
        let index = -1;
        const selId = st.selectedNodeId;
        if (selId && selId !== root.id) {
          const sel = findNode(root, selId);
          if (sel && defFor(sel.type).canHaveChildren) {
            parentId = sel.id;
          } else if (sel) {
            const p = findParent(root, selId);
            if (p) {
              parentId = p.parent.id;
              index = p.index + 1;
            }
          }
        }
        set((s) => withActiveRoot(s, (r) => insertChild(r, parentId, clone, index)));
        set({ selectedNodeId: clone.id });
      },

      deleteNode: (nodeId) => {
        const root = get().currentRoot();
        if (!root || root.id === nodeId) return;
        set((s) => withActiveRoot(s, (r) => removeNode(r, nodeId).tree));
        set((s) =>
          s.selectedNodeId === nodeId ? { selectedNodeId: null } : {}
        );
      },

      duplicateNode: (nodeId) => {
        const root = get().currentRoot();
        if (!root || root.id === nodeId) return;
        const loc = findParent(root, nodeId);
        const original = findNode(root, nodeId);
        if (!loc || !original) return;
        const copy = cloneNodeWithNewIds(original, uid);
        set((s) =>
          withActiveRoot(s, (r) =>
            insertChild(r, loc.parent.id, copy, loc.index + 1)
          )
        );
        set({ selectedNodeId: copy.id });
      },

      wrapSelection: (nodeId) => {
        const root = get().currentRoot();
        if (!root || root.id === nodeId) return;
        const loc = findParent(root, nodeId);
        const original = findNode(root, nodeId);
        if (!loc || !original) return;
        const container = createNode("Container");
        container.styles = {
          ...container.styles,
          display: "flex",
          direction: "col",
          gap: 2,
        };
        container.name = "Group";
        container.children = [original];
        set((s) =>
          withActiveRoot(s, (r) => {
            const removed = removeNode(r, nodeId).tree;
            return insertChild(removed, loc.parent.id, container, loc.index);
          })
        );
        set({ selectedNodeId: container.id });
      },

      setNodeBinding: (nodeId, prop, binding) =>
        set((s) =>
          withActiveRoot(s, (root) =>
            updateNodeById(root, nodeId, (n) => {
              const bindings = { ...(n.bindings ?? {}) };
              if (binding) bindings[prop] = binding;
              else delete bindings[prop];
              return { ...n, bindings };
            })
          )
        ),

      setNodeAction: (nodeId, action) =>
        set((s) =>
          withActiveRoot(s, (root) =>
            updateNodeById(root, nodeId, (n) => ({
              ...n,
              action: action ?? undefined,
            }))
          )
        ),

      setNodeRepeat: (nodeId, repeat) =>
        set((s) =>
          withActiveRoot(s, (root) =>
            updateNodeById(root, nodeId, (n) => ({
              ...n,
              repeat: repeat ?? undefined,
            }))
          )
        ),

      setNodeVisibleIf: (nodeId, binding) =>
        set((s) =>
          withActiveRoot(s, (root) =>
            updateNodeById(root, nodeId, (n) => ({
              ...n,
              visibleIf: binding ?? undefined,
            }))
          )
        ),

      setScreenData: (screenId, sourceId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  screens: p.screens.map((sc) =>
                    sc.id === screenId
                      ? { ...sc, dataSourceId: sourceId ?? undefined }
                      : sc
                  ),
                })
              : p
          ),
        })),

      updateTokens: (patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  designSystem: {
                    ...p.designSystem,
                    tokens: { ...p.designSystem.tokens, ...patch },
                  },
                })
              : p
          ),
        })),

      importTokens: (raw) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  designSystem: {
                    ...p.designSystem,
                    // normalizeTokens accepts full or partial/legacy shapes and
                    // backfills every palette key, so imports are always valid.
                    tokens: normalizeTokens(raw),
                  },
                })
              : p
          ),
        })),

      updateThemeToken: (mode, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  designSystem: {
                    ...p.designSystem,
                    tokens: {
                      ...p.designSystem.tokens,
                      [mode]: { ...p.designSystem.tokens[mode], ...patch },
                    },
                  },
                })
              : p
          ),
        })),

      addPreset: (fromNodeId, name) => {
        const screen = get().currentScreen();
        const project = get().currentProject();
        if (!screen || !project) return;
        const node = findNode(screen.root, fromNodeId);
        if (!node) return;
        const preset: ComponentPreset = {
          id: uid("preset"),
          name: name.trim() || node.name || node.type,
          type: node.type,
          props: { ...node.props },
          styles: { ...node.styles },
        };
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  designSystem: {
                    ...p.designSystem,
                    presets: [...p.designSystem.presets, preset],
                  },
                })
              : p
          ),
        }));
      },

      updatePreset: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  designSystem: {
                    ...p.designSystem,
                    presets: p.designSystem.presets.map((pr) =>
                      pr.id === id ? { ...pr, ...patch } : pr
                    ),
                  },
                })
              : p
          ),
        })),

      deletePreset: (id) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  designSystem: {
                    ...p.designSystem,
                    presets: p.designSystem.presets.filter((pr) => pr.id !== id),
                  },
                })
              : p
          ),
        })),

      createNodeFromPreset: (parentId, presetId, index = -1) => {
        const project = get().currentProject();
        const screen = get().currentScreen();
        if (!project || !screen) return null;
        const preset = project.designSystem.presets.find(
          (pr) => pr.id === presetId
        );
        if (!preset) return null;
        const parent = findNode(screen.root, parentId);
        if (!parent) return null;
        let targetParentId = parentId;
        let targetIndex = index;
        if (!defFor(parent.type).canHaveChildren) {
          const loc = findParent(screen.root, parentId);
          if (!loc) return null;
          targetParentId = loc.parent.id;
          targetIndex = loc.index + 1;
        }
        const node = createNode(preset.type);
        node.name = preset.name;
        node.props = { ...preset.props };
        node.styles = { ...preset.styles };
        set((s) =>
          withRoot(s, (root) =>
            insertChild(root, targetParentId, node, targetIndex)
          )
        );
        set({ selectedNodeId: node.id });
        return node.id;
      },

      addComponentDefinition: (name) => {
        const id = uid("cmp");
        const root = createNode("Container");
        root.name = name.trim() || "Component";
        root.styles = {
          display: "flex",
          direction: "col",
          gap: 4,
          padding: 6,
          width: "fit",
        };
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  designSystem: {
                    ...p.designSystem,
                    components: [
                      ...p.designSystem.components,
                      { id, name: root.name!, root },
                    ],
                  },
                })
              : p
          ),
        }));
        return id;
      },

      addComponentDefinitionOfType: (name, type) => {
        const id = uid("cmp");
        const root = createNode(type);
        root.name = name.trim() || root.name || "Component";
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  designSystem: {
                    ...p.designSystem,
                    components: [
                      ...p.designSystem.components,
                      { id, name: root.name!, root },
                    ],
                  },
                })
              : p
          ),
        }));
        return id;
      },

      createComponentFromNode: (nodeId, name) => {
        const root = get().currentRoot();
        if (!root) return null;
        const node = findNode(root, nodeId);
        if (!node) return null;
        const id = uid("cmp");
        const defRoot = cloneNodeWithNewIds(node, uid);
        const defName = name.trim() || node.name || node.type;
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  designSystem: {
                    ...p.designSystem,
                    components: [
                      ...p.designSystem.components,
                      { id, name: defName, root: defRoot },
                    ],
                  },
                })
              : p
          ),
        }));
        return id;
      },

      renameComponentDefinition: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  designSystem: {
                    ...p.designSystem,
                    components: p.designSystem.components.map((c) =>
                      c.id === id ? { ...c, name } : c
                    ),
                  },
                })
              : p
          ),
        })),

      deleteComponentDefinition: (id) =>
        set((s) => {
          const project = s.projects.find((p) => p.id === s.currentProjectId);
          const def = project?.designSystem.components.find(
            (c) => c.id === id
          );
          return {
            editingComponentId:
              s.editingComponentId === id ? null : s.editingComponentId,
            projects: s.projects.map((p) => {
              if (p.id !== s.currentProjectId) return p;
              // Detach any instances → plain copies so nothing dangles.
              const detach = (root: DesignNode) =>
                def ? replaceInstances(root, id, def.root) : root;
              return touch({
                ...p,
                screens: p.screens.map((sc) => ({
                  ...sc,
                  root: detach(sc.root),
                })),
                designSystem: {
                  ...p.designSystem,
                  components: p.designSystem.components
                    .filter((c) => c.id !== id)
                    .map((c) => ({ ...c, root: detach(c.root) })),
                },
              });
            }),
          };
        }),

      importComponents: (defs) => {
        if (!Array.isArray(defs) || !defs.length) return 0;
        // Fresh def ids + node ids; remap nested instanceOf references.
        const idMap = new Map<string, string>();
        for (const d of defs) if (d?.id) idMap.set(d.id, uid("comp"));
        const remap = (node: DesignNode): DesignNode => ({
          ...node,
          instanceOf:
            node.instanceOf && idMap.has(node.instanceOf)
              ? idMap.get(node.instanceOf)
              : node.instanceOf,
          children: (node.children ?? []).map(remap),
        });
        const cloned: ComponentDefinition[] = defs
          .filter((d) => d && d.root && d.id)
          .map((d) => ({
            id: idMap.get(d.id)!,
            name: d.name || "Component",
            variants: d.variants,
            root: remap(cloneNodeWithNewIds(d.root, uid)),
          }));
        if (!cloned.length) return 0;
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  designSystem: {
                    ...p.designSystem,
                    components: [...p.designSystem.components, ...cloned],
                  },
                })
              : p
          ),
        }));
        return cloned.length;
      },

      createInstance: (parentId, defId, index = -1) => {
        const project = get().currentProject();
        const root = get().currentRoot();
        if (!project || !root) return null;
        // Guard against a component instancing itself while being edited.
        if (get().editingComponentId === defId) return null;
        const def = project.designSystem.components.find((c) => c.id === defId);
        if (!def) return null;
        const parent = findNode(root, parentId);
        if (!parent) return null;
        let targetParentId = parentId;
        let targetIndex = index;
        if (!defFor(parent.type).canHaveChildren) {
          const loc = findParent(root, parentId);
          if (!loc) return null;
          targetParentId = loc.parent.id;
          targetIndex = loc.index + 1;
        }
        const node: DesignNode = {
          id: uid("node"),
          type: "Instance",
          name: def.name,
          props: {},
          styles: {},
          children: [],
          instanceOf: defId,
          overrides: {},
        };
        set((s) =>
          withActiveRoot(s, (r) =>
            insertChild(r, targetParentId, node, targetIndex)
          )
        );
        set({ selectedNodeId: node.id });
        return node.id;
      },

      setInstanceOverride: (nodeId, patch) =>
        set((s) =>
          withActiveRoot(s, (root) =>
            updateNodeById(root, nodeId, (n) => ({
              ...n,
              overrides: { ...(n.overrides ?? {}), ...patch },
            }))
          )
        ),

      setInstanceVariant: (nodeId, variantId) =>
        set((s) =>
          withActiveRoot(s, (root) =>
            updateNodeById(root, nodeId, (n) => {
              const next = { ...n };
              if (variantId) next.variant = variantId;
              else delete next.variant;
              return next;
            })
          )
        ),

      addComponentVariant: (defId, name, styles) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  designSystem: {
                    ...p.designSystem,
                    components: p.designSystem.components.map((c) =>
                      c.id === defId
                        ? {
                            ...c,
                            variants: [
                              ...(c.variants ?? []),
                              { id: uid(), name, styles },
                            ],
                          }
                        : c
                    ),
                  },
                })
              : p
          ),
        })),

      deleteComponentVariant: (defId, variantId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  designSystem: {
                    ...p.designSystem,
                    components: p.designSystem.components.map((c) =>
                      c.id === defId
                        ? {
                            ...c,
                            variants: (c.variants ?? []).filter(
                              (v) => v.id !== variantId
                            ),
                          }
                        : c
                    ),
                  },
                })
              : p
          ),
        })),

      updateArchitecture: (fn) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({ ...p, architecture: fn(p.architecture) })
              : p
          ),
        })),

      syncArchitecture: () =>
        set((s) => {
          const project = s.projects.find((p) => p.id === s.currentProjectId);
          if (!project) return {};
          const screen = project.screens.find(
            (sc) => sc.id === s.currentScreenId
          );
          const derived = deriveServices(project);
          const seq = screen ? deriveSequence(screen, project) : null;
          return {
            projects: s.projects.map((p) =>
              p.id === project.id
                ? touch({
                    ...p,
                    architecture: {
                      ...p.architecture,
                      services: [...p.architecture.services, ...derived],
                      sequences: seq
                        ? [...p.architecture.sequences, seq]
                        : p.architecture.sequences,
                    },
                  })
                : p
            ),
          };
        }),

      addDataSource: (name, kind = "api") => {
        const ds = createDataSource(
          name || (kind === "constant" ? "New constant" : "New request"),
          kind
        );
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({ ...p, dataSources: [...(p.dataSources ?? []), ds] })
              : p
          ),
        }));
        return ds.id;
      },

      updateDataSource: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  dataSources: (p.dataSources ?? []).map((d) =>
                    d.id === id ? { ...d, ...patch } : d
                  ),
                })
              : p
          ),
        })),

      deleteDataSource: (id) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === s.currentProjectId
              ? touch({
                  ...p,
                  dataSources: (p.dataSources ?? []).filter(
                    (d) => d.id !== id
                  ),
                })
              : p
          ),
        })),

      duplicateDataSource: (id) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== s.currentProjectId) return p;
            const src = (p.dataSources ?? []).find((d) => d.id === id);
            if (!src) return p;
            const copy: DataSource = {
              ...src,
              id: uid("ds"),
              name: `${src.name} copy`,
              headers: src.headers.map((h) => ({ ...h })),
              schema: src.schema?.map((f) => ({ ...f })),
            };
            return touch({
              ...p,
              dataSources: [...(p.dataSources ?? []), copy],
            });
          }),
        })),

      currentProject: () =>
        get().projects.find((p) => p.id === get().currentProjectId),

      currentScreen: () => {
        const p = get().projects.find((x) => x.id === get().currentProjectId);
        return p?.screens.find((s) => s.id === get().currentScreenId);
      },

      currentRoot: () => {
        const st = get();
        const p = st.projects.find((x) => x.id === st.currentProjectId);
        if (!p) return undefined;
        if (st.editingComponentId) {
          return p.designSystem.components.find(
            (c) => c.id === st.editingComponentId
          )?.root;
        }
        return p.screens.find((s) => s.id === st.currentScreenId)?.root;
      },
    })
);

// ---------------------------------------------------------------------------
// Persistence — normalized SQLite via the desktop bridge (window.api). The
// store's action API is unchanged; only the backend moved off localStorage.
// Boot hydrates from the DB; every mutation autosaves the changed project(s) on
// a debounce, and removed projects are deleted.
// ---------------------------------------------------------------------------

/** Backfill any missing token keys on a hydrated project (old/partial palettes). */
function hydrateProject(p: Project): Project {
  const ds = p.designSystem ?? defaultDesignSystem();
  return {
    ...p,
    designSystem: {
      ...ds,
      tokens: normalizeTokens(ds.tokens),
      presets: ds.presets ?? [],
      components: ds.components ?? [],
    },
    architecture: p.architecture ?? defaultArchitecture(),
  };
}

let _hydrating = false;
let _prevProjects: Project[] = [];
const _pending = new Map<string, Project>();
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

function _flush() {
  _saveTimer = null;
  for (const p of _pending.values()) void persistence.saveProject(p);
  _pending.clear();
}

// ---------------------------------------------------------------------------
// Undo / redo — an in-session history of the `projects` snapshot. Immutable
// store updates make each snapshot cheap (unchanged projects share references).
// History is editor-scoped: it resets when the active project changes, and
// undo/redo restore a prior snapshot (which then autosaves like any edit).
// ---------------------------------------------------------------------------

const HISTORY_LIMIT = 100;
const _past: Project[][] = [];
const _future: Project[][] = [];
let _applyingHistory = false;
let _prevProjectId: string | null = null;

function historyUndo() {
  if (_past.length === 0) return;
  _future.push(useEditor.getState().projects);
  const prev = _past.pop()!;
  _applyingHistory = true;
  useEditor.setState({ projects: prev, canUndo: _past.length > 0, canRedo: true });
  _applyingHistory = false;
}

function historyRedo() {
  if (_future.length === 0) return;
  _past.push(useEditor.getState().projects);
  const nextSnap = _future.pop()!;
  _applyingHistory = true;
  useEditor.setState({ projects: nextSnap, canUndo: true, canRedo: _future.length > 0 });
  _applyingHistory = false;
}

/** Load persisted projects once, before the app renders. */
export async function initEditorStore(): Promise<void> {
  _hydrating = true;
  try {
    const loaded = (await persistence.listProjects()).map(hydrateProject);
    useEditor.setState({ projects: loaded });
    _prevProjects = useEditor.getState().projects;
  } finally {
    _hydrating = false;
  }
}

// Diff-by-reference autosave (+ undo history): immutable updates give changed
// projects new refs.
useEditor.subscribe((state) => {
  // Reset history when the active project changes — undo is editor-scoped.
  if (state.currentProjectId !== _prevProjectId) {
    _prevProjectId = state.currentProjectId;
    _past.length = 0;
    _future.length = 0;
    if (state.canUndo || state.canRedo) {
      useEditor.setState({ canUndo: false, canRedo: false });
    }
  }

  const next = state.projects;
  if (_hydrating || next === _prevProjects) return;
  const prev = _prevProjects;
  _prevProjects = next;

  // Record an undo entry for edits made while a project is open (not for
  // undo/redo itself, which sets _applyingHistory).
  if (!_applyingHistory && state.currentProjectId) {
    _past.push(prev);
    if (_past.length > HISTORY_LIMIT) _past.shift();
    _future.length = 0;
    if (!state.canUndo || state.canRedo) {
      useEditor.setState({ canUndo: true, canRedo: false });
    }
  }

  const nextIds = new Set(next.map((p) => p.id));
  for (const p of prev) {
    if (!nextIds.has(p.id)) void persistence.deleteProject(p.id);
  }
  const prevById = new Map(prev.map((p) => [p.id, p] as const));
  for (const p of next) {
    if (prevById.get(p.id) !== p) _pending.set(p.id, p);
  }
  if (_pending.size) {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_flush, 400);
  }
});
