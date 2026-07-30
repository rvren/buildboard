import { useState } from "react";
import { Plus, Copy, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { useEditor } from "@/store/editorStore";
import { useTheme } from "@/store/theme";
import { MiniPreview } from "@/features/dashboard/MiniPreview";
import { cn } from "@/lib/utils";

/** Pages panel: screen thumbnails with select / rename / reorder / duplicate. */
export function PagesTab() {
  const project = useEditor((s) => s.currentProject());
  const currentScreenId = useEditor((s) => s.currentScreenId);
  const selectScreen = useEditor((s) => s.selectScreen);
  const addScreen = useEditor((s) => s.addScreen);
  const renameScreen = useEditor((s) => s.renameScreen);
  const moveScreen = useEditor((s) => s.moveScreen);
  const duplicateScreen = useEditor((s) => s.duplicateScreen);
  const deleteScreen = useEditor((s) => s.deleteScreen);
  useTheme((s) => s.theme);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");

  if (!project) return null;
  const screens = project.screens;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
          Pages · {screens.length}
        </span>
        <button
          onClick={() => addScreen()}
          className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Add page"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scrollbar-thin p-2.5">
        {screens.map((screen, i) => {
          const active = currentScreenId === screen.id;
          return (
            <div
              key={screen.id}
              className={cn(
                "group overflow-hidden rounded-lg border transition-colors",
                active
                  ? "border-primary ring-1 ring-primary"
                  : "border-border hover:border-primary/40"
              )}
            >
              <button
                onClick={() => selectScreen(screen.id)}
                className="block h-24 w-full overflow-hidden bg-muted/40"
              >
                <MiniPreview
                  screen={screen}
                  tokens={project.designSystem.tokens}
                  components={project.designSystem.components}
                />
              </button>
              <div className="flex items-center gap-1 border-t border-border/60 px-1.5 py-1">
                {editing === screen.id ? (
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => {
                      renameScreen(screen.id, name.trim() || screen.name);
                      setEditing(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        renameScreen(screen.id, name.trim() || screen.name);
                        setEditing(null);
                      }
                    }}
                    className="min-w-0 flex-1 bg-transparent text-[11px] font-medium outline-none"
                  />
                ) : (
                  <button
                    onDoubleClick={() => {
                      setName(screen.name);
                      setEditing(screen.id);
                    }}
                    onClick={() => selectScreen(screen.id)}
                    className="min-w-0 flex-1 truncate text-left text-[11px] font-medium"
                    title="Double-click to rename"
                  >
                    {screen.name}
                  </button>
                )}
                <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                  <IconBtn
                    title="Move up"
                    disabled={i === 0}
                    onClick={() => moveScreen(screen.id, -1)}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </IconBtn>
                  <IconBtn
                    title="Move down"
                    disabled={i === screens.length - 1}
                    onClick={() => moveScreen(screen.id, 1)}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </IconBtn>
                  <IconBtn title="Duplicate" onClick={() => duplicateScreen(screen.id)}>
                    <Copy className="h-3 w-3" />
                  </IconBtn>
                  <IconBtn
                    title="Delete"
                    disabled={screens.length <= 1}
                    danger
                    onClick={() => deleteScreen(screen.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </IconBtn>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-5 w-5 place-items-center rounded text-muted-foreground disabled:opacity-30",
        danger ? "hover:text-destructive" : "hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
