import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "@/store/editorStore";
import { nodeDefList, defFor } from "@/lib/nodeDefs";
import { findNode, findParent } from "@/lib/tree";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Quick-insert palette (⌘/): type a node name and Enter to add it at the current
 * selection — into the selected container, else its parent, else the screen root.
 */
export function QuickInsertDialog() {
  const open = useEditor((s) => s.quickInsertOpen);
  const setOpen = useEditor((s) => s.setQuickInsertOpen);
  const addNode = useEditor((s) => s.addNode);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = nodeDefList.filter((d) => d.type !== "Instance");
    if (!q) return list;
    return list.filter(
      (d) =>
        d.label.toLowerCase().includes(q) || d.type.toLowerCase().includes(q)
    );
  }, [query]);

  const insert = (type: (typeof nodeDefList)[number]["type"]) => {
    const s = useEditor.getState();
    const root = s.currentRoot();
    if (!root) return;
    const selId = s.selectedNodeId;
    // Target: selected node if it can nest, else its parent, else the root.
    let targetId = root.id;
    if (selId) {
      const sel = findNode(root, selId);
      if (sel && defFor(sel.type).canHaveChildren) targetId = sel.id;
      else {
        const parent = findParent(root, selId);
        targetId = parent ? parent.parent.id : root.id;
      }
    }
    addNode(targetId, type);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[active];
      if (pick) insert(pick.type);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>Quick insert</DialogTitle>
        </DialogHeader>
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Insert element…"
          className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none"
        />
        <div className="max-h-72 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No elements match “{query}”
            </p>
          ) : (
            results.map((d, i) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.type}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => insert(d.type)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    i === active ? "bg-muted" : "hover:bg-muted/60"
                  )}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{d.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                    {d.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
