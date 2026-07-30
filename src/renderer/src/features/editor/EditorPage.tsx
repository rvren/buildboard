import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  Layers,
  Blocks,
  LayoutTemplate,
  Database,
  Palette,
  Component,
  Network,
  GitBranch,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  useEditor,
  parseView,
  registerViewNavigator,
} from "@/store/editorStore";
import { cn } from "@/lib/utils";
import { findNode, findParent, isAncestor } from "@/lib/tree";
import { defFor } from "@/lib/nodeDefs";
import type { NodeType } from "@/types";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TopBar } from "./TopBar";
import { Canvas } from "./canvas/Canvas";
import { PaletteTab } from "./left/PaletteTab";
import { LayersTab } from "./left/LayersTab";
import { DataTab } from "./left/DataTab";
import { PagesTab } from "./left/PagesTab";
import { PropertiesPanel } from "./right/PropertiesPanel";
import { CodePanel } from "./right/CodePanel";
import { DragStateContext } from "./canvas/dragContext";
import { FlowMap } from "./flow/FlowMap";
import { OverviewView } from "./overview/OverviewView";
import { SystemLeft, SystemMain } from "./system/SystemView";
import { ArchLeft, ArchMain } from "./architecture/ArchitectureView";
import { CommandPalette } from "./CommandPalette";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { FindReplaceDialog } from "./FindReplaceDialog";
import { QuickInsertDialog } from "./QuickInsertDialog";
import { GettingStarted } from "./onboarding/GettingStarted";
import { NavRail } from "./NavRail";
import { ensureFontLoaded } from "@/lib/designSystem";

/** Which prop supplies a node's inner text (for field-drop binding). */
const TEXT_PROP: Record<string, string> = {
  Heading: "content",
  Text: "content",
  Button: "label",
  Badge: "label",
};

/** Resolve which container + index a drop over `overId` should land in. */
function resolveDrop(
  rootId: string,
  screenRoot: import("@/types").DesignNode,
  overId: string
): { parentId: string; index: number } | null {
  const target = findNode(screenRoot, overId);
  if (!target) return null;
  if (defFor(target.type).canHaveChildren) {
    return { parentId: target.id, index: target.children.length };
  }
  const loc = findParent(screenRoot, overId);
  if (!loc) return { parentId: rootId, index: 0 };
  return { parentId: loc.parent.id, index: loc.index + 1 };
}

export default function EditorPage() {
  const { projectId, view } = useParams();
  const navigate = useNavigate();

  const projects = useEditor((s) => s.projects);
  const currentProjectId = useEditor((s) => s.currentProjectId);
  const openProject = useEditor((s) => s.openProject);
  const editorView = useEditor((s) => s.editorView);
  const setEditorView = useEditor((s) => s.setEditorView);
  const project = projects.find((p) => p.id === projectId);
  const routeView = parseView(view);

  // Sync store's active project with the URL.
  React.useEffect(() => {
    if (project && currentProjectId !== project.id) openProject(project.id);
  }, [project, currentProjectId, openProject]);

  // Register the view→URL navigator so setEditorView (and all its callers)
  // keep the route in sync. Cleared on unmount.
  React.useEffect(() => {
    if (!projectId) return;
    registerViewNavigator((v) => navigate(`/project/${projectId}/${v}`));
    return () => registerViewNavigator(null);
  }, [projectId, navigate]);

  // URL → store: apply the route's view (deep links, back/forward). A missing or
  // invalid `:view` segment is canonicalized to /overview.
  React.useEffect(() => {
    if (!projectId) return;
    if (view !== routeView) {
      navigate(`/project/${projectId}/${routeView}`, { replace: true });
    } else if (routeView !== editorView) {
      setEditorView(routeView);
    }
  }, [projectId, view, routeView, editorView, navigate, setEditorView]);

  // Load the project's design-system font (for the canvas too).
  React.useEffect(() => {
    const f = project?.designSystem?.tokens.font;
    if (f) ensureFontLoaded(f);
  }, [project?.designSystem?.tokens.font]);

  const [activeLabel, setActiveLabel] = React.useState<string | null>(null);
  const [dropParentId, setDropParentId] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Prefer the innermost droppable under the pointer; fall back to overlap.
  const collision: CollisionDetection = React.useCallback((args) => {
    const within = pointerWithin(args);
    return within.length ? within : rectIntersection(args);
  }, []);

  useKeyboardShortcuts();

  if (!project) return <NotFound onBack={() => navigate("/")} />;

  const onDragStart = (e: DragStartEvent) => {
    setIsDragging(true);
    const data = e.active.data.current as any;
    if (data?.kind === "palette") {
      setActiveLabel(defFor(data.type as NodeType).label);
    } else if (data?.kind === "node") {
      const root = useEditor.getState().currentRoot();
      const n = root ? findNode(root, data.nodeId) : null;
      setActiveLabel(n?.name ?? "Element");
    } else if (data?.kind === "field") {
      setActiveLabel(data.path || "field");
    } else if (data?.kind === "preset") {
      const project = useEditor.getState().currentProject();
      const preset = project?.designSystem.presets.find(
        (p) => p.id === data.presetId
      );
      setActiveLabel(preset?.name ?? "Preset");
    } else if (data?.kind === "instance") {
      const project = useEditor.getState().currentProject();
      const def = project?.designSystem.components.find(
        (c) => c.id === data.defId
      );
      setActiveLabel(def?.name ?? "Component");
    }
  };

  const computeTarget = (overId: string | null, activeNodeId?: string) => {
    const root = useEditor.getState().currentRoot();
    if (!root || !overId) return null;
    const res = resolveDrop(root.id, root, overId);
    if (!res) return null;
    // Don't target the dragged node or its own descendants.
    if (
      activeNodeId &&
      (res.parentId === activeNodeId ||
        isAncestor(root, activeNodeId, res.parentId))
    ) {
      return null;
    }
    return res;
  };

  const onDragOver = (e: DragOverEvent) => {
    const data = e.active.data.current as any;
    const res = computeTarget(
      e.over ? String(e.over.id) : null,
      data?.kind === "node" ? data.nodeId : undefined
    );
    setDropParentId(res?.parentId ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const data = e.active.data.current as any;
    const overId = e.over ? String(e.over.id) : null;
    const res = computeTarget(
      overId,
      data?.kind === "node" ? data.nodeId : undefined
    );
    setIsDragging(false);
    setActiveLabel(null);
    setDropParentId(null);
    if (!res) return;

    const store = useEditor.getState();
    if (data?.kind === "palette") {
      store.addNode(res.parentId, data.type as NodeType, res.index);
    } else if (data?.kind === "preset") {
      store.createNodeFromPreset(res.parentId, data.presetId, res.index);
    } else if (data?.kind === "instance") {
      store.createInstance(res.parentId, data.defId, res.index);
    } else if (data?.kind === "node") {
      const root = store.currentRoot();
      if (!root) return;
      const selected = store.selectedNodeIds;
      const bulk =
        selected.length > 1 && selected.includes(data.nodeId);
      if (bulk) {
        // Bulk move/nest: drop every selected node into the target container
        // (skip the target itself and any node that contains it).
        for (const id of selected) {
          if (id === res.parentId) continue;
          if (isAncestor(root, id, res.parentId)) continue;
          store.moveNode(id, res.parentId, -1);
        }
      } else {
        const loc = findParent(root, data.nodeId);
        let index = res.index;
        if (loc && loc.parent.id === res.parentId && loc.index < index) index -= 1;
        store.moveNode(data.nodeId, res.parentId, index);
      }
    } else if (data?.kind === "field") {
      handleFieldDrop(data, overId);
    }
  };

  const handleFieldDrop = (
    data: { sourceId: string; path: string; fieldType: string },
    overId: string | null
  ) => {
    const store = useEditor.getState();
    const root = store.currentRoot();
    if (!root || !overId) return;
    const target = findNode(root, overId);
    if (!target) return;
    const binding = { sourceId: data.sourceId, path: data.path };
    const targetIsContainer = defFor(target.type).canHaveChildren;

    if (data.fieldType === "array") {
      // Arrays repeat a container.
      if (targetIsContainer) {
        store.setNodeRepeat(target.id, binding);
        store.setSelected(target.id);
      }
      return;
    }

    const textProp = TEXT_PROP[target.type];
    if (textProp) {
      // Bind the dropped-on text element directly.
      store.setNodeBinding(target.id, textProp, binding);
      store.setSelected(target.id);
    } else if (targetIsContainer) {
      // Insert a new bound Text into the container.
      const id = store.addNode(target.id, "Text");
      if (id) store.setNodeBinding(id, "content", binding);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setIsDragging(false);
        setActiveLabel(null);
        setDropParentId(null);
      }}
    >
      <DragStateContext.Provider value={{ dropParentId, isDragging }}>
        <motion.div
          className="app-wash flex h-screen overflow-hidden bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          {/* Full-height rail — brand at the very top */}
          <NavRail />
          <div className="flex min-h-0 flex-1 flex-col">
            <TopBar project={project} />
            <div className="flex min-h-0 flex-1">
              <EditorBody project={project} view={editorView} />
            </div>
          </div>
        </motion.div>
      </DragStateContext.Provider>

      <CommandPalette project={project} />
      <ShortcutsDialog />
      <FindReplaceDialog />
      <QuickInsertDialog />

      <DragOverlay dropAnimation={null}>
        {activeLabel ? (
          <div className="pointer-events-none rounded-md border bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground shadow-lg">
            {activeLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

type EditorView = "overview" | "design" | "flow" | "system" | "architecture";

/** The panel body for the active view: Overview/Flow are full-width; others are Left | Main | (Right in Design). */
function EditorBody({
  project,
  view,
}: {
  project: import("@/types").Project;
  view: EditorView;
}) {
  const editingComponentId = useEditor((s) => s.editingComponentId);
  if (view === "overview") return <OverviewView project={project} />;
  if (view === "flow") return <FlowMap project={project} />;
  // Editing a component definition (launched from Design System) hosts the full
  // design editing layout in-place, regardless of the active view.
  const editing = !!editingComponentId;
  const hasRight = view === "design" || editing;
  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      <ResizablePanel defaultSize={18} minSize={14} maxSize={28}>
        <LeftPanel project={project} view={view} editing={editing} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={hasRight ? 56 : 82}>
        <MainArea project={project} view={view} editing={editing} />
      </ResizablePanel>
      {hasRight && (
        <>
          <ResizableHandle />
          <ResizablePanel defaultSize={26} minSize={20} maxSize={36}>
            <RightPanel />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}

function MainArea({
  project,
  view,
  editing,
}: {
  project: import("@/types").Project;
  view: EditorView;
  editing: boolean;
}) {
  // Component edit mode: the Canvas renders ComponentEditCanvas when editing.
  if (editing)
    return (
      <div className="relative h-full">
        <Canvas project={project} />
      </div>
    );
  if (view === "system") return <SystemMain project={project} />;
  if (view === "architecture") return <ArchMain project={project} />;
  return (
    <div className="relative h-full">
      <Canvas project={project} />
      <GettingStarted project={project} />
    </div>
  );
}

const TOOL_META: Record<string, { label: string; icon: LucideIcon }> = {
  insert: { label: "Insert", icon: Blocks },
  layers: { label: "Layers", icon: Layers },
  pages: { label: "Pages", icon: LayoutTemplate },
  data: { label: "Data", icon: Database },
  tokens: { label: "Tokens", icon: Palette },
  components: { label: "Components", icon: Component },
  services: { label: "Services", icon: Network },
  sequences: { label: "Sequences", icon: GitBranch },
};

/** Contextual left panel: a sub-tool tab strip + the active sub-tool's content. */
function LeftPanel({
  project,
  view,
  editing,
}: {
  project: import("@/types").Project;
  view: EditorView;
  editing: boolean;
}) {
  const leftTool = useEditor((s) => s.leftTool);
  const setLeftTool = useEditor((s) => s.setLeftTool);
  const systemTool = useEditor((s) => s.systemTool);
  const setSystemTool = useEditor((s) => s.setSystemTool);
  const archTool = useEditor((s) => s.archTool);
  const setArchTool = useEditor((s) => s.setArchTool);
  const editingComponentId = useEditor((s) => s.editingComponentId);

  // While editing a component, use the design tools (Insert/Layers) regardless
  // of which view launched the edit.
  const v: EditorView = editing ? "design" : view;

  let tabs: { id: string; onSelect: () => void }[] = [];
  let activeId = "";
  if (v === "system") {
    activeId = systemTool;
    tabs = [
      { id: "tokens", onSelect: () => setSystemTool("tokens") },
      { id: "components", onSelect: () => setSystemTool("components") },
    ];
  } else if (v === "architecture") {
    activeId = archTool;
    tabs = [
      { id: "services", onSelect: () => setArchTool("services") },
      { id: "sequences", onSelect: () => setArchTool("sequences") },
    ];
  } else {
    // Data doesn't apply while editing a component; fall back to Insert.
    const designTool =
      editingComponentId && (leftTool === "data" || leftTool === "pages")
        ? "insert"
        : leftTool;
    activeId = designTool;
    tabs = [
      { id: "insert", onSelect: () => setLeftTool("insert") },
      { id: "layers", onSelect: () => setLeftTool("layers") },
      ...(editingComponentId
        ? []
        : [
            { id: "pages", onSelect: () => setLeftTool("pages") },
            { id: "data", onSelect: () => setLeftTool("data") },
          ]),
    ];
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Sub-tool tabs */}
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-2.5">
        {tabs.map((t) => {
          const meta = TOOL_META[t.id];
          const Icon = meta.icon;
          const active = activeId === t.id;
          return (
            <button
              key={t.id}
              onClick={t.onSelect}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1">
        {v === "design" && (
          <>
            {activeId === "insert" && <PaletteTab />}
            {activeId === "layers" && <LayersTab />}
            {activeId === "pages" && <PagesTab />}
            {activeId === "data" && <DataTab />}
          </>
        )}
        {v === "system" && <SystemLeft project={project} />}
        {v === "architecture" && <ArchLeft project={project} />}
      </div>
    </div>
  );
}

function RightPanel() {
  return (
    <Tabs
      defaultValue="properties"
      className="flex h-full flex-col bg-card"
    >
      <div className="flex h-12 shrink-0 items-center border-b border-border px-2.5">
        <TabsList className="h-8 w-full">
          <TabsTrigger value="properties" className="h-7 flex-1 text-[13px]">
            Properties
          </TabsTrigger>
          <TabsTrigger value="code" className="h-7 flex-1 text-[13px]">
            Code
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="properties" className="min-h-0 flex-1">
        <PropertiesPanel />
      </TabsContent>
      <TabsContent value="code" className="min-h-0 flex-1">
        <CodePanel />
      </TabsContent>
    </Tabs>
  );
}

function useKeyboardShortcuts() {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      const store = useEditor.getState();
      // Keyboard-shortcuts cheatsheet: "?" (Shift+/) toggles it.
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        store.setShortcutsOpen(!store.shortcutsOpen);
        return;
      }
      // Quick-insert palette: ⌘/ (Ctrl+/).
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        store.setQuickInsertOpen(!store.quickInsertOpen);
        return;
      }
      // Undo / redo (no node selection required).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      // Clipboard: copy / cut the selection, paste into the selection or root.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        store.pasteNode();
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "c" &&
        store.selectedNodeId
      ) {
        e.preventDefault();
        store.copyNode(store.selectedNodeId);
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "x" &&
        store.selectedNodeId
      ) {
        e.preventDefault();
        store.cutNode(store.selectedNodeId);
        return;
      }
      const id = store.selectedNodeId;
      if (!id) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (store.selectedNodeIds.length > 1) store.deleteSelection();
        else store.deleteNode(id);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        store.duplicateNode(id);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        store.wrapSelection(id);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "ArrowUp") {
        e.preventDefault();
        store.reorderNode(id, -1);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "ArrowDown") {
        e.preventDefault();
        store.reorderNode(id, 1);
      } else if (e.key === "Escape") {
        // Step up the tree: select the parent, or deselect at the root.
        const root = store.currentRoot();
        const p = root ? findParent(root, id) : null;
        store.setSelected(p ? p.parent.id : null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3">
      <p className="text-lg font-semibold">Project not found</p>
      <button
        onClick={onBack}
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        Back to projects
      </button>
    </div>
  );
}
