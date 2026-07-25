import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Architecture,
  ComponentDefinition,
  ComponentPreset,
  DataSource,
  DataSourceKind,
  DesignNode,
  DesignTokens,
  NodeAction,
  NodeType,
  Project,
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
} from "@/lib/factory";
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

interface EditorState {
  projects: Project[];
  currentProjectId: string | null;
  currentScreenId: string | null;
  selectedNodeId: string | null;
  viewport: Viewport;
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
  editorView: "overview" | "design" | "flow" | "system" | "architecture";
  setEditorView: (
    v: "overview" | "design" | "flow" | "system" | "architecture"
  ) => void;
  leftTool: "insert" | "layers" | "data";
  setLeftTool: (v: "insert" | "layers" | "data") => void;
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
  githubDialogOpen: boolean;
  setGithubDialogOpen: (v: boolean) => void;

  // ----- project CRUD
  addProject: (name: string, mode: ProjectMode, description?: string) => string;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  setProjectMode: (id: string, mode: ProjectMode) => void;

  // ----- navigation
  openProject: (id: string) => void;
  closeProject: () => void;
  setSelected: (id: string | null) => void;
  setViewport: (v: Partial<Viewport>) => void;

  // ----- screens
  addScreen: (name?: string) => void;
  selectScreen: (id: string) => void;
  renameScreen: (id: string, name: string) => void;
  deleteScreen: (id: string) => void;

  // ----- nodes
  addNode: (parentId: string, type: NodeType, index?: number) => string | null;
  moveNode: (nodeId: string, newParentId: string, index: number) => void;
  reorderNode: (nodeId: string, direction: -1 | 1) => void;
  updateNodeProps: (nodeId: string, props: Record<string, any>) => void;
  updateNodeStyles: (nodeId: string, styles: Partial<StyleTokens>) => void;
  renameNode: (nodeId: string, name: string) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;

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
  setScreenData: (screenId: string, sourceId: string | null) => void;

  // ----- design system (project-scoped)
  updateTokens: (patch: Partial<DesignTokens>) => void;
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
  createInstance: (
    parentId: string,
    defId: string,
    index?: number
  ) => string | null;
  setInstanceOverride: (nodeId: string, patch: Record<string, any>) => void;

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
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      currentScreenId: null,
      selectedNodeId: null,
      viewport: { x: 0, y: 0, zoom: 1 },
      previewMode: false,
      setPreviewMode: (v) => set({ previewMode: v, selectedNodeId: null }),
      editorView: "overview",
      // Switching top-level views exits component-edit mode so the Insert palette
      // shows custom components again (create-and-edit re-enters it explicitly after).
      setEditorView: (v) => set({ editorView: v, editingComponentId: null }),
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
      githubDialogOpen: false,
      setGithubDialogOpen: (v) => set({ githubDialogOpen: v }),

      addProject: (name, mode, description) => {
        const project = createProject(name, mode, description);
        set((s) => ({ projects: [project, ...s.projects] }));
        return project.id;
      },

      renameProject: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? touch({ ...p, name }) : p
          ),
        })),

      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          currentProjectId:
            s.currentProjectId === id ? null : s.currentProjectId,
        })),

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
          // Remap component-definition ids so duplicated instances stay linked.
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
            children: node.children.map(remapInstances),
          });
          const copy: Project = {
            ...src,
            id: uid("proj"),
            name: `${src.name} copy`,
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
              headers: d.headers.map((h) => ({ ...h })),
            })),
            designSystem: src.designSystem
              ? {
                  tokens: { ...src.designSystem.tokens },
                  presets: src.designSystem.presets.map((pr) => ({
                    ...pr,
                    id: uid("preset"),
                  })),
                  components,
                }
              : defaultDesignSystem(),
            architecture: src.architecture
              ? {
                  services: src.architecture.services.map((sv) => ({ ...sv })),
                  interactions: src.architecture.interactions.map((i) => ({
                    ...i,
                  })),
                  sequences: src.architecture.sequences.map((sq) => ({
                    ...sq,
                    steps: sq.steps.map((st) => ({ ...st })),
                  })),
                }
              : defaultArchitecture(),
          };
          return { projects: [copy, ...s.projects] };
        }),

      openProject: (id) => {
        const project = get().projects.find((p) => p.id === id);
        set({
          currentProjectId: id,
          currentScreenId: project?.screens[0]?.id ?? null,
          selectedNodeId: null,
          viewport: { x: 80, y: 80, zoom: 0.85 },
          editorView: "overview",
        });
      },

      closeProject: () =>
        set({
          currentProjectId: null,
          currentScreenId: null,
          selectedNodeId: null,
        }),

      setSelected: (id) => set({ selectedNodeId: id }),

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
        set((s) =>
          withActiveRoot(s, (root) =>
            updateNodeById(root, nodeId, (n) => ({
              ...n,
              styles: { ...n.styles, ...styles },
            }))
          )
        ),

      renameNode: (nodeId, name) =>
        set((s) =>
          withActiveRoot(s, (root) =>
            updateNodeById(root, nodeId, (n) => ({ ...n, name }))
          )
        ),

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
    }),
    {
      name: "buildboard-store",
      version: 5,
      partialize: (s) => ({ projects: s.projects }),
      migrate: (persisted: any) => {
        if (persisted?.projects) {
          persisted.projects = persisted.projects.map((p: any) => {
            const ds = p.designSystem ?? defaultDesignSystem();
            return {
              ...p,
              mode: p.mode ?? "static",
              dataSources: (p.dataSources ?? []).map((d: any) => ({
                ...d,
                kind: d.kind ?? "api",
              })),
              designSystem: {
                ...ds,
                presets: ds.presets ?? [],
                components: ds.components ?? [],
              },
              architecture: p.architecture ?? defaultArchitecture(),
            };
          });
        }
        return persisted;
      },
    }
  )
);
