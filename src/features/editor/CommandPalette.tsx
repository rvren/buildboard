import { useEffect, useMemo, useRef, useState } from "react";
import {
  MonitorSmartphone,
  Play,
  Database,
  Workflow,
  LayoutDashboard,
  Github,
  Plus,
  Zap,
  FileText,
  Search,
  CornerDownLeft,
} from "lucide-react";
import type { NodeType, Project } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEditor } from "@/store/editorStore";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
  keywords?: string;
}

export function CommandPalette({ project }: { project: Project }) {
  const open = useEditor((s) => s.commandOpen);
  const setOpen = useEditor((s) => s.setCommandOpen);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useEditor.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const s = useEditor.getState();
    const list: Command[] = [];

    for (const screen of project.screens) {
      list.push({
        id: `screen:${screen.id}`,
        label: `Go to ${screen.name}`,
        hint: "Screen",
        icon: MonitorSmartphone,
        keywords: "screen navigate open",
        run: () => {
          s.setEditorView("design");
          s.selectScreen(screen.id);
        },
      });
    }

    list.push(
      {
        id: "preview",
        label: s.previewMode ? "Exit preview" : "Enter preview",
        hint: "Toggle",
        icon: Play,
        keywords: "preview run interactive",
        run: () => s.setPreviewMode(!s.previewMode),
      },
      {
        id: "view-design",
        label: "Switch to Design view",
        icon: LayoutDashboard,
        keywords: "design canvas edit",
        run: () => s.setEditorView("design"),
      },
      {
        id: "view-flow",
        label: "Switch to Flow view",
        icon: Workflow,
        keywords: "flow map workflow",
        run: () => s.setEditorView("flow"),
      },
      {
        id: "data",
        label: "Open data sources",
        icon: Database,
        keywords: "data api source",
        run: () => s.setDataDialogOpen(true),
      },
      {
        id: "push",
        label: "Push to GitHub",
        icon: Github,
        keywords: "git commit pr pull request deploy",
        run: () => s.setGithubDialogOpen(true),
      },
      {
        id: "mode",
        label:
          project.mode === "dynamic"
            ? "Set mode: Static"
            : "Set mode: Dynamic",
        icon: project.mode === "dynamic" ? FileText : Zap,
        keywords: "mode static dynamic",
        run: () =>
          s.setProjectMode(
            project.id,
            project.mode === "dynamic" ? "static" : "dynamic"
          ),
      }
    );

    const add = (type: NodeType, label: string) => {
      const screen = s.currentScreen();
      if (screen) s.addNode(screen.root.id, type);
    };
    (
      [
        ["Container", "Add container"],
        ["Text", "Add text"],
        ["Button", "Add button"],
        ["Card", "Add card"],
      ] as [NodeType, string][]
    ).forEach(([type, label]) =>
      list.push({
        id: `add:${type}`,
        label,
        hint: "Insert",
        icon: Plus,
        keywords: `add insert ${type}`,
        run: () => add(type, label),
      })
    );

    return list;
  }, [project]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q)
    );
  }, [commands, query]);

  const runAt = (i: number) => {
    const cmd = filtered[i];
    if (!cmd) return;
    cmd.run();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3.5 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runAt(active);
              }
            }}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
        <div ref={listRef} className="max-h-80 overflow-auto scrollbar-thin p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No commands found.
            </p>
          ) : (
            filtered.map((c, i) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => runAt(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    i === active ? "bg-accent" : "hover:bg-accent/60"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{c.label}</span>
                  {c.hint && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {c.hint}
                    </span>
                  )}
                  {i === active && (
                    <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
