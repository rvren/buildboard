import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles, X, ChevronDown } from "lucide-react";
import type { DesignNode, Project } from "@/types";
import { useEditor } from "@/store/editorStore";
import { cn } from "@/lib/utils";

const KEY = "buildboard-onboarding-dismissed";

function treeHasBinding(node: DesignNode): boolean {
  if (node.bindings && Object.keys(node.bindings).length) return true;
  if (node.repeat) return true;
  return node.children.some(treeHasBinding);
}

export function GettingStarted({ project }: { project: Project }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(KEY) === "1"
  );
  const [collapsed, setCollapsed] = useState(false);
  const setDataOpen = useEditor((s) => s.setDataDialogOpen);
  const setEditorView = useEditor((s) => s.setEditorView);

  if (dismissed) return null;

  const steps = [
    {
      label: "Add a data source",
      done: (project.dataSources ?? []).length > 0,
      onClick: () => setDataOpen(true),
    },
    {
      label: "Bind UI to data or repeat a list",
      done: project.screens.some((s) => treeHasBinding(s.root)),
    },
    {
      label: "Map your app flow",
      done: project.screens.length > 1,
      onClick: () => setEditorView("flow"),
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  const close = () => {
    localStorage.setItem(KEY, "1");
    setDismissed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-4 left-4 z-20 w-72 overflow-hidden rounded-2xl border bg-card/95 shadow-soft-lg backdrop-blur"
    >
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="flex-1 text-sm font-semibold">Getting started</span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {doneCount}/{steps.length}
        </span>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")}
          />
        </button>
        <button
          onClick={close}
          className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-1 p-2">
              {steps.map((s) => (
                <button
                  key={s.label}
                  onClick={s.onClick}
                  disabled={!s.onClick}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                    s.onClick && "hover:bg-muted",
                    !s.onClick && "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
                      s.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    )}
                  >
                    {s.done && <Check className="h-3 w-3" />}
                  </span>
                  <span
                    className={cn(
                      "flex-1",
                      s.done && "text-muted-foreground line-through"
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              ))}
              <p className="px-2 pb-1 pt-1 text-[11px] text-muted-foreground">
                Press <kbd className="rounded border bg-muted px-1">⌘K</kbd> any
                time for commands.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
