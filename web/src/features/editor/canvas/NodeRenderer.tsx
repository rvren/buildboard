import * as React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";
import type { DesignNode } from "@/types";
import { defFor } from "@/lib/nodeDefs";
import { stylesToTailwind, sizeStyle } from "@/lib/styles";
import {
  resolveBindingDisplay,
  resolveArray,
  runRequest,
  type BindingContext,
} from "@/lib/dataSource";
import { cn } from "@/lib/utils";
import { useEditor } from "@/store/editorStore";
import { useDragState } from "./dragContext";
import { RepeaterContext, useRepeaterItem } from "./repeaterContext";
import { StaticNode } from "./renderTree";
import { useComponentDefs, resolveInstance } from "./componentDefs";

interface Props {
  node: DesignNode;
  isRoot?: boolean;
}

export function NodeRenderer({ node, isRoot = false }: Props) {
  // Instances are their own interactive wrapper around a read-only definition.
  if (node.instanceOf) return <InstanceNode node={node} isRoot={isRoot} />;
  const def = defFor(node.type);
  const selectedId = useEditor((s) => s.selectedNodeId);
  const setSelected = useEditor((s) => s.setSelected);
  const previewMode = useEditor((s) => s.previewMode);
  const project = useEditor((s) => s.currentProject());
  const screen = useEditor((s) => s.currentScreen());
  const selectScreen = useEditor((s) => s.selectScreen);
  const { dropParentId, isDragging } = useDragState();
  const repeaterItem = useRepeaterItem();

  const bindCtx: BindingContext = {
    sources: project?.dataSources ?? [],
    screenSourceId: screen?.dataSourceId,
    item: repeaterItem,
  };

  const [hovered, setHovered] = React.useState(false);
  const selected = selectedId === node.id;
  const isDropTarget = dropParentId === node.id;
  const hasBindings = !!node.bindings && Object.keys(node.bindings).length > 0;

  const { setNodeRef: setDropRef } = useDroppable({
    id: node.id,
    data: { nodeId: node.id, type: node.type },
    disabled: previewMode,
  });

  const {
    setNodeRef: setDragRef,
    attributes,
    listeners,
    isDragging: selfDragging,
  } = useDraggable({
    id: node.id,
    data: { kind: "node", nodeId: node.id },
    disabled: isRoot || previewMode,
  });

  const setRef = (el: HTMLElement | null) => {
    if (previewMode) return;
    setDropRef(el);
    if (!isRoot) setDragRef(el);
  };

  // Resolve bound props (content/src/label/…) from data for the live preview.
  const resolvedNode = React.useMemo(() => {
    if (!hasBindings) return node;
    const props = { ...node.props };
    for (const [prop, b] of Object.entries(node.bindings!)) {
      const val = resolveBindingDisplay(b, bindCtx);
      if (val !== undefined) props[prop] = val;
    }
    return { ...node, props };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, hasBindings, project, repeaterItem, screen?.dataSourceId]);

  const runAction = async () => {
    const action = node.action;
    if (!action || action.type === "none") return;
    if (action.type === "navigate" && action.targetScreenId) {
      selectScreen(action.targetScreenId);
    } else if (action.type === "request" && action.dataSourceId) {
      const ds = project?.dataSources?.find(
        (d) => d.id === action.dataSourceId
      );
      if (!ds) return;
      toast.loading(`Calling ${ds.name}…`, { id: ds.id });
      try {
        const res = await runRequest(ds);
        toast.success(`${ds.name} → ${res.status} (${res.timeMs}ms)`, {
          id: ds.id,
        });
      } catch (e: any) {
        toast.error(`${ds.name} failed: ${e?.message ?? "error"}`, {
          id: ds.id,
        });
      }
    }
  };

  const styleClasses = stylesToTailwind(node.styles);

  const selectionClasses = cn(
    "outline-none transition-[box-shadow,opacity]",
    !previewMode &&
      selected &&
      "ring-2 ring-primary ring-offset-1 ring-offset-background",
    !previewMode && !selected && hovered && !isDragging && "ring-1 ring-primary/50",
    !previewMode && isDropTarget && "ring-2 ring-primary ring-dashed",
    selfDragging && "opacity-40"
  );

  const className = cn(
    styleClasses,
    def.canHaveChildren && node.children.length === 0 && "min-h-[52px]",
    selectionClasses
  );

  const rootProps: Record<string, any> = previewMode
    ? {
        style: sizeStyle(node.styles),
        onClick: node.action
          ? (e: React.MouseEvent) => {
              e.stopPropagation();
              runAction();
            }
          : undefined,
      }
    : {
        ref: setRef,
        "data-node-id": node.id,
        style: sizeStyle(node.styles),
        ...attributes,
        ...listeners,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setSelected(node.id);
        },
        onMouseEnter: (e: React.MouseEvent) => {
          e.stopPropagation();
          setHovered(true);
        },
        onMouseLeave: (e: React.MouseEvent) => {
          e.stopPropagation();
          setHovered(false);
        },
      };

  let children: React.ReactNode = undefined;
  if (def.canHaveChildren) {
    if (node.children.length === 0) {
      children = previewMode ? undefined : [<EmptyHint key="__hint" />];
    } else if (previewMode && node.repeat) {
      // In preview, expand the template once per array item.
      const arr = resolveArray(node.repeat, bindCtx);
      children = arr.length
        ? arr.flatMap((item, i) =>
            node.children.map((c) => (
              <RepeaterContext.Provider key={`${i}:${c.id}`} value={item}>
                <NodeRenderer node={c} />
              </RepeaterContext.Provider>
            ))
          )
        : node.children.map((c) => <NodeRenderer key={c.id} node={c} />);
    } else {
      children = node.children.map((c) => <NodeRenderer key={c.id} node={c} />);
    }
  }

  return (
    <>{def.render({ node: resolvedNode, className, children, rootProps })}</>
  );
}

function EmptyHint() {
  return (
    <div className="pointer-events-none flex w-full flex-1 items-center justify-center rounded-md border border-dashed border-muted-foreground/30 py-3 text-xs text-muted-foreground/70">
      Drop components here
    </div>
  );
}

/**
 * A design-system component instance: an interactive, selectable wrapper around
 * a read-only render of the definition. Selecting/dragging targets the instance;
 * the internals aren't individually editable (edit the component to change them).
 */
function InstanceNode({ node, isRoot }: Props) {
  const defs = useComponentDefs();
  const selectedId = useEditor((s) => s.selectedNodeId);
  const setSelected = useEditor((s) => s.setSelected);
  const previewMode = useEditor((s) => s.previewMode);
  const { dropParentId, isDragging } = useDragState();
  const [hovered, setHovered] = React.useState(false);

  const selected = selectedId === node.id;
  const isDropTarget = dropParentId === node.id;

  const { setNodeRef: setDropRef } = useDroppable({
    id: node.id,
    data: { nodeId: node.id, type: node.type },
    disabled: previewMode,
  });
  const {
    setNodeRef: setDragRef,
    attributes,
    listeners,
    isDragging: selfDragging,
  } = useDraggable({
    id: node.id,
    data: { kind: "node", nodeId: node.id },
    disabled: isRoot || previewMode,
  });
  const setRef = (el: HTMLElement | null) => {
    if (previewMode) return;
    setDropRef(el);
    if (!isRoot) setDragRef(el);
  };

  const resolved = resolveInstance(node, defs);

  const className = cn(
    "w-fit",
    stylesToTailwind(node.styles),
    "outline-none transition-[box-shadow,opacity]",
    !previewMode &&
      selected &&
      "ring-2 ring-primary ring-offset-1 ring-offset-background",
    !previewMode && !selected && hovered && !isDragging && "ring-1 ring-primary/50",
    !previewMode && isDropTarget && "ring-2 ring-primary ring-dashed",
    selfDragging && "opacity-40"
  );

  const rootProps: Record<string, any> = previewMode
    ? { style: sizeStyle(node.styles) }
    : {
        ref: setRef,
        "data-node-id": node.id,
        style: sizeStyle(node.styles),
        ...attributes,
        ...listeners,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setSelected(node.id);
        },
        onMouseEnter: (e: React.MouseEvent) => {
          e.stopPropagation();
          setHovered(true);
        },
        onMouseLeave: (e: React.MouseEvent) => {
          e.stopPropagation();
          setHovered(false);
        },
      };

  return (
    <div className={className} {...rootProps}>
      {resolved ? (
        <StaticNode node={resolved} />
      ) : (
        <span className="rounded border border-dashed border-destructive/40 px-2 py-1 text-xs text-destructive">
          missing component
        </span>
      )}
    </div>
  );
}
