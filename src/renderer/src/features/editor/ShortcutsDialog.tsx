import { Keyboard } from "lucide-react";
import { useEditor } from "@/store/editorStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const MOD = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "General",
    items: [
      [`${MOD} K`, "Command palette"],
      [`${MOD} /`, "Quick-insert element"],
      ["?", "This shortcuts cheatsheet"],
      [`${MOD} Z`, "Undo"],
      [`${MOD} ⇧ Z`, "Redo"],
    ],
  },
  {
    title: "Nodes",
    items: [
      [`${MOD} C`, "Copy selection"],
      [`${MOD} X`, "Cut selection"],
      [`${MOD} V`, "Paste"],
      [`${MOD} D`, "Duplicate selection"],
      [`${MOD} G`, "Group selection in a Container"],
      [`${MOD} ↑ / ↓`, "Move node up / down among siblings"],
      ["Shift-click", "Add to multi-selection"],
      ["Delete", "Delete selection"],
      ["Esc", "Select parent / deselect"],
    ],
  },
  {
    title: "Canvas",
    items: [
      [`${MOD} 0`, "Fit to screen"],
      [`${MOD} =`, "Zoom in"],
      [`${MOD} -`, "Zoom out"],
      ["Space + drag", "Pan canvas"],
    ],
  },
];

/** Keyboard-shortcuts cheatsheet, opened with "?". */
export function ShortcutsDialog() {
  const open = useEditor((s) => s.shortcutsOpen);
  const setOpen = useEditor((s) => s.setShortcutsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <Kbd>?</Kbd> any time to open this list.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g.title} className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                {g.title}
              </p>
              <div className="space-y-1.5">
                {g.items.map(([keys, label]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                    <Kbd>{keys}</Kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground">
      {children}
    </kbd>
  );
}
