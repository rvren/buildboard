import { useMemo } from "react";
import { MousePointerClick, Link2, TextCursorInput, ToggleRight } from "lucide-react";
import type { DesignNode, NodeType } from "@/types";
import { useEditor } from "@/store/editorStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Interactive/focusable node types, with a label accessor + icon. The tab order
// is document (pre-)order — exactly how a keyboard user moves through the page.
const FOCUSABLE: Partial<
  Record<NodeType, { icon: typeof Link2; label: (n: DesignNode) => string }>
> = {
  Link: { icon: Link2, label: (n) => n.props.content || "(link)" },
  Button: { icon: MousePointerClick, label: (n) => n.props.label || "(button)" },
  Input: { icon: TextCursorInput, label: (n) => n.props.placeholder || "(input)" },
  Textarea: { icon: TextCursorInput, label: (n) => n.props.placeholder || "(textarea)" },
  Checkbox: { icon: ToggleRight, label: () => "Checkbox" },
  Switch: { icon: ToggleRight, label: () => "Switch" },
};

interface FocusItem {
  id: string;
  type: NodeType;
  label: string;
  icon: typeof Link2;
}

/** Focus-order (tab order) list for the current screen — a keyboard-a11y aid. */
export function FocusOrderDialog() {
  const open = useEditor((s) => s.focusOrderOpen);
  const setOpen = useEditor((s) => s.setFocusOrderOpen);
  const setSelected = useEditor((s) => s.setSelected);
  const root = useEditor((s) => s.currentRoot());

  const items = useMemo<FocusItem[]>(() => {
    const out: FocusItem[] = [];
    const walk = (n: DesignNode) => {
      if (n.hidden) return;
      const f = FOCUSABLE[n.type];
      if (f) out.push({ id: n.id, type: n.type, label: f.label(n), icon: f.icon });
      for (const c of n.children ?? []) walk(c);
    };
    if (root) walk(root);
    return out;
  }, [root]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Focus order</DialogTitle>
          <DialogDescription>
            The order a keyboard user tabs through this screen (document order).
            Click an item to select it.
          </DialogDescription>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No focusable elements (buttons, links, inputs) on this screen.
          </p>
        ) : (
          <ol className="max-h-[60vh] space-y-1 overflow-y-auto">
            {items.map((it, i) => (
              <li key={it.id}>
                <button
                  onClick={() => {
                    setSelected(it.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-primary/10 text-[11px] font-semibold tabular-nums text-primary">
                    {i + 1}
                  </span>
                  <it.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">{it.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                    {it.type}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
