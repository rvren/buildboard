import { useMemo, useState } from "react";
import type { DesignNode, Screen } from "@/types";
import { useEditor } from "@/store/editorStore";
import { defFor } from "@/lib/nodeDefs";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TEXT_KEYS = ["content", "label", "placeholder", "alt", "href", "icon"];

interface Hit {
  screenId: string;
  screenName: string;
  nodeId: string;
  type: string;
  label: string;
}

function nodeText(n: DesignNode): string {
  for (const k of TEXT_KEYS) {
    const v = n.props?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return n.name || "";
}

/** Global search across every node in every screen; jump to a match. */
export function NodeSearchDialog() {
  const open = useEditor((s) => s.nodeSearchOpen);
  const setOpen = useEditor((s) => s.setNodeSearchOpen);
  const selectScreen = useEditor((s) => s.selectScreen);
  const setSelected = useEditor((s) => s.setSelected);
  const setEditorView = useEditor((s) => s.setEditorView);
  const project = useEditor((s) => s.currentProject());
  const [q, setQ] = useState("");

  const hits = useMemo<Hit[]>(() => {
    const query = q.trim().toLowerCase();
    if (!query || !project) return [];
    const out: Hit[] = [];
    const walk = (n: DesignNode, screen: Screen) => {
      const text = nodeText(n);
      if (
        n.type.toLowerCase().includes(query) ||
        text.toLowerCase().includes(query)
      ) {
        out.push({
          screenId: screen.id,
          screenName: screen.name,
          nodeId: n.id,
          type: n.type,
          label: text || n.type,
        });
      }
      for (const c of n.children ?? []) walk(c, screen);
    };
    for (const screen of project.screens) walk(screen.root, screen);
    return out.slice(0, 50);
  }, [q, project]);

  const jump = (hit: Hit) => {
    setEditorView("design");
    selectScreen(hit.screenId);
    // Selection happens after the screen switch settles.
    setTimeout(() => setSelected(hit.nodeId), 0);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Search nodes</DialogTitle>
        </DialogHeader>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search elements by text or type…"
          className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none"
        />
        <div className="max-h-80 overflow-y-auto p-1.5">
          {q.trim() === "" ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              Type to search every element across all screens.
            </p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No elements match “{q}”.
            </p>
          ) : (
            hits.map((hit) => {
              const Icon = defFor(hit.type as DesignNode["type"]).icon;
              return (
                <button
                  key={hit.nodeId}
                  onClick={() => jump(hit)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{hit.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                    {hit.type}
                  </span>
                  <span className="max-w-[30%] truncate text-[11px] text-muted-foreground">
                    {hit.screenName}
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
