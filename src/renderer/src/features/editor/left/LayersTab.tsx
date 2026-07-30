import { useState } from "react";
import type { DesignNode } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { listRow } from "@/lib/motion";
import { defFor } from "@/lib/nodeDefs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditor } from "@/store/editorStore";

export function LayersTab() {
  const screen = useEditor((s) => s.currentScreen());
  if (!screen) return null;
  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <LayerRow node={screen.root} depth={0} isRoot />
      </div>
    </ScrollArea>
  );
}

function LayerRow({
  node,
  depth,
  isRoot = false,
}: {
  node: DesignNode;
  depth: number;
  isRoot?: boolean;
}) {
  const def = defFor(node.type);
  const Icon = def.icon;
  const selectedId = useEditor((s) => s.selectedNodeId);
  const setSelected = useEditor((s) => s.setSelected);
  const reorderNode = useEditor((s) => s.reorderNode);
  const duplicateNode = useEditor((s) => s.duplicateNode);
  const deleteNode = useEditor((s) => s.deleteNode);
  const renameNode = useEditor((s) => s.renameNode);
  const toggleNodeHidden = useEditor((s) => s.toggleNodeHidden);
  const selected = selectedId === node.id;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.name || def.label);

  const commit = () => {
    renameNode(node.id, name.trim() || def.label);
    setEditing(false);
  };

  return (
    <motion.div layout="position" variants={listRow} initial="initial" animate="animate" exit="exit">
      <div
        onClick={() => setSelected(node.id)}
        style={{ paddingLeft: depth * 14 + 6 }}
        className={cn(
          "group flex h-8 cursor-pointer items-center gap-2 rounded-md pr-1 text-sm transition-colors",
          selected
            ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          node.hidden && "opacity-50"
        )}
      >
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            selected && "text-primary"
          )}
        />
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded bg-background px-1 text-sm outline-none ring-1 ring-primary/40"
          />
        ) : (
          <span
            className="flex-1 truncate"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setName(node.name || def.label);
              setEditing(true);
            }}
          >
            {node.name || def.label}
          </span>
        )}

        {!isRoot && (
          <IconBtn
            onClick={() => toggleNodeHidden(node.id)}
            title={node.hidden ? "Show" : "Hide"}
            className={node.hidden ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
          >
            {node.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </IconBtn>
        )}

        {!isRoot && (
          <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
            <IconBtn onClick={() => reorderNode(node.id, -1)} title="Move up">
              <ChevronUp className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn onClick={() => reorderNode(node.id, 1)} title="Move down">
              <ChevronDown className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn
              onClick={() => duplicateNode(node.id)}
              title="Duplicate"
            >
              <Copy className="h-3 w-3" />
            </IconBtn>
            <IconBtn
              onClick={() => deleteNode(node.id)}
              title="Delete"
              className="hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </IconBtn>
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {node.children.map((child) => (
          <LayerRow key={child.id} node={child} depth={depth + 1} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-6 w-6 text-muted-foreground", className)}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}
