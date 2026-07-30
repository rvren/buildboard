import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Component as ComponentIcon } from "lucide-react";
import type { ComponentPreset, NodeType } from "@/types";
import { categoryOrder, nodeDefList, type NodeCategory } from "@/lib/nodeDefs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEditor } from "@/store/editorStore";
import { findNode } from "@/lib/tree";
import { defFor } from "@/lib/nodeDefs";

export function PaletteTab() {
  const editingComponentId = useEditor((s) => s.editingComponentId);
  const [filter, setFilter] = useState<"all" | "custom">("all");
  const componentCount =
    useEditor((s) => s.currentProject()?.designSystem.components.length) ?? 0;
  const presetCount =
    useEditor((s) => s.currentProject()?.designSystem.presets.length) ?? 0;
  const hasCustom = componentCount + presetCount > 0;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-2.5">
        {/* Filter: your custom components only, or all (custom + base building blocks). */}
        <div className="flex rounded-lg border border-border/70 bg-muted p-0.5 text-[12px] font-medium">
          {(["all", "custom"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 rounded-md px-2 py-1 transition-colors",
                filter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" ? "All" : "Custom"}
            </button>
          ))}
        </div>

        {/* Custom (user-authored) — components + presets. */}
        {!editingComponentId && <ComponentsGroup />}
        <PresetsGroup />

        {filter === "custom" && !hasCustom && (
          <p className="px-2 py-6 text-center text-[12px] leading-relaxed text-muted-foreground">
            No custom components yet. Create one in the Design System view.
          </p>
        )}

        {/* Base building blocks (the defaults we provide). */}
        {filter === "all" &&
          categoryOrder.map((cat) => (
            <CategorySection key={cat} category={cat} />
          ))}
      </div>
    </ScrollArea>
  );
}

const EMPTY_COMPONENTS: import("@/types").ComponentDefinition[] = [];

function ComponentsGroup() {
  const components =
    useEditor((s) => s.currentProject()?.designSystem.components) ??
    EMPTY_COMPONENTS;
  if (components.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/70">
        Custom components
      </p>
      <div className="space-y-0.5">
        {components.map((c) => (
          <ComponentRow key={c.id} id={c.id} name={c.name} />
        ))}
      </div>
    </div>
  );
}

function ComponentRow({ id, name }: { id: string; name: string }) {
  const createInstance = useEditor((s) => s.createInstance);
  const selectedNodeId = useEditor((s) => s.selectedNodeId);
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `instance:${id}`,
    data: { kind: "instance", defId: id },
  });
  const quickAdd = () => {
    const root = useEditor.getState().currentRoot();
    if (!root) return;
    let parentId = root.id;
    if (selectedNodeId) {
      const sel = findNode(root, selectedNodeId);
      if (sel && defFor(sel.type).canHaveChildren) parentId = sel.id;
    }
    createInstance(parentId, id);
  };
  return (
    <motion.button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={quickAdd}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group flex h-9 w-full cursor-grab items-center gap-2.5 rounded-md px-2.5 text-left transition-colors hover:bg-muted active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <ComponentIcon className="h-4 w-4 shrink-0 text-primary" />
      <span className="flex-1 truncate text-[13px] font-medium">{name}</span>
      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
        Custom
      </span>
    </motion.button>
  );
}

const EMPTY_PRESETS: ComponentPreset[] = [];

function PresetsGroup() {
  const presets =
    useEditor((s) => s.currentProject()?.designSystem.presets) ?? EMPTY_PRESETS;
  if (presets.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/70">
        Presets
      </p>
      <div className="space-y-0.5">
        {presets.map((p) => (
          <PresetRow key={p.id} id={p.id} name={p.name} type={p.type} />
        ))}
      </div>
    </div>
  );
}

function PresetRow({
  id,
  name,
  type,
}: {
  id: string;
  name: string;
  type: NodeType;
}) {
  const Icon = defFor(type).icon;
  const createNodeFromPreset = useEditor((s) => s.createNodeFromPreset);
  const selectedNodeId = useEditor((s) => s.selectedNodeId);
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `preset:${id}`,
    data: { kind: "preset", presetId: id },
  });
  const quickAdd = () => {
    const root = useEditor.getState().currentRoot();
    if (!root) return;
    let parentId = root.id;
    if (selectedNodeId) {
      const sel = findNode(root, selectedNodeId);
      if (sel && defFor(sel.type).canHaveChildren) parentId = sel.id;
    }
    createNodeFromPreset(parentId, id);
  };
  return (
    <motion.button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={quickAdd}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group flex h-9 w-full cursor-grab items-center gap-2.5 rounded-md px-2.5 text-left transition-colors hover:bg-muted active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <span className="flex-1 truncate text-[13px] font-medium">{name}</span>
    </motion.button>
  );
}

function CategorySection({ category }: { category: NodeCategory }) {
  const items = nodeDefList.filter((d) => d.category === category);
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/70">
        {category}
      </p>
      <div className="space-y-0.5">
        {items.map((def) => (
          <PaletteItem key={def.type} type={def.type} />
        ))}
      </div>
    </div>
  );
}

function PaletteItem({ type }: { type: NodeType }) {
  const def = defFor(type);
  const Icon = def.icon;
  const addNode = useEditor((s) => s.addNode);
  const selectedNodeId = useEditor((s) => s.selectedNodeId);

  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { kind: "palette", type },
  });

  const quickAdd = () => {
    // Add into the selected container if it accepts children, else the active root.
    const root = useEditor.getState().currentRoot();
    if (!root) return;
    let parentId = root.id;
    if (selectedNodeId) {
      const sel = findNode(root, selectedNodeId);
      if (sel && defFor(sel.type).canHaveChildren) parentId = sel.id;
    }
    addNode(parentId, type);
  };

  return (
    <motion.button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={quickAdd}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group flex h-9 w-full cursor-grab items-center gap-2.5 rounded-md px-2.5 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground/80 transition-colors group-hover:text-primary" />
      <span className="flex-1 truncate text-[13px] font-medium text-foreground/90">
        {def.label}
      </span>
    </motion.button>
  );
}
