import { useState } from "react";
import {
  Plus,
  Download,
  FileCode,
  Package,
  Database,
  MonitorSmartphone,
  Github,
  Play,
  Square,
  FileText,
  Zap,
  Check,
  ChevronDown,
  Search,
  Undo2,
  Redo2,
  Copy,
  ArrowLeft,
  ArrowRight,
  Trash2,
  AppWindow,
  Smartphone,
  Tablet,
  Monitor,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Breakpoint, ProjectMode } from "@/types";
import { toast } from "sonner";
import type { Project } from "@/types";

/** Breakpoint switcher tabs: base = design width; sm/md/lg preview at the width. */
const BREAKPOINT_TABS: { id: "base" | Breakpoint; icon: LucideIcon; tip: string }[] = [
  { id: "base", icon: AppWindow, tip: "Base — applies at all widths (your design canvas)" },
  { id: "sm", icon: Smartphone, tip: "sm · ≥640px — preview the active screen at 640px" },
  { id: "md", icon: Tablet, tip: "md · ≥768px — preview the active screen at 768px" },
  { id: "lg", icon: Monitor, tip: "lg · ≥1024px — preview the active screen at 1024px" },
];
import { useEditor } from "@/store/editorStore";
import { useTheme } from "@/store/theme";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { generatePageCode } from "@/lib/codegen";
import {
  downloadText,
  exportProjectZip,
  exportNextProjectZip,
  exportViteProjectZip,
  exportStaticHtmlZip,
} from "@/lib/export";
import { DataSourcesDialog } from "./data/DataSourcesDialog";
import { GitHubDialog } from "./publish/GitHubDialog";
import { AiDialog } from "./ai/AiDialog";
import { isDesktop } from "@/lib/persistence";

export function TopBar({ project }: { project: Project }) {
  const currentScreenId = useEditor((s) => s.currentScreenId);
  const selectScreen = useEditor((s) => s.selectScreen);
  const addScreen = useEditor((s) => s.addScreen);
  const duplicateScreen = useEditor((s) => s.duplicateScreen);
  const moveScreen = useEditor((s) => s.moveScreen);
  const deleteScreen = useEditor((s) => s.deleteScreen);
  const renameProject = useEditor((s) => s.renameProject);
  const setProjectMode = useEditor((s) => s.setProjectMode);
  const previewMode = useEditor((s) => s.previewMode);
  const setPreviewMode = useEditor((s) => s.setPreviewMode);
  const editorView = useEditor((s) => s.editorView);
  const dataOpen = useEditor((s) => s.dataDialogOpen);
  const setDataOpen = useEditor((s) => s.setDataDialogOpen);
  const githubOpen = useEditor((s) => s.githubDialogOpen);
  const setGithubOpen = useEditor((s) => s.setGithubDialogOpen);
  const setCommandOpen = useEditor((s) => s.setCommandOpen);
  const currentScreen = useEditor((s) => s.currentScreen());
  const canUndo = useEditor((s) => s.canUndo);
  const canRedo = useEditor((s) => s.canRedo);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const activeBreakpoint = useEditor((s) => s.activeBreakpoint);
  const setActiveBreakpoint = useEditor((s) => s.setActiveBreakpoint);
  useTheme((s) => s.theme);

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(project.name);
  const [aiOpen, setAiOpen] = useState(false);
  const dataCount = project.dataSources?.length ?? 0;

  const commitName = () => {
    renameProject(project.id, name.trim() || project.name);
    setEditingName(false);
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-border bg-card px-4">
      {editingName ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && commitName()}
          className="w-44 rounded-md border bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <button
          className="rounded-md px-2 py-1 text-sm font-medium hover:bg-muted"
          onClick={() => {
            setName(project.name);
            setEditingName(true);
          }}
        >
          {project.name}
        </button>
      )}

      <ModeSwitcher
        mode={project.mode}
        onChange={(m) => setProjectMode(project.id, m)}
      />

      {/* Undo / redo */}
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (⌘Z)"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={redo}
        disabled={!canRedo}
        title="Redo (⌘⇧Z)"
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      {/* Responsive breakpoint switcher — resizes the active artboard to preview
          each width; edits made here export as sm:/md:/lg: Tailwind. */}
      {editorView === "design" && (
        <>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <div className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-card p-0.5">
            {BREAKPOINT_TABS.map((bp) => (
              <button
                key={bp.id}
                type="button"
                onClick={() => setActiveBreakpoint(bp.id)}
                title={bp.tip}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  activeBreakpoint === bp.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <bp.icon className="h-3.5 w-3.5" />
                <span className="uppercase">{bp.id}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Screen switcher (design view only) */}
      <Separator orientation="vertical" className="mx-1 h-5" />
      <div
        className={cn(
          "flex items-center gap-1 overflow-x-auto scrollbar-thin",
          editorView !== "design" && "pointer-events-none opacity-40"
        )}
      >
        {project.screens.map((screen, i) => (
          <div
            key={screen.id}
            className={cn(
              "flex h-7 items-center whitespace-nowrap rounded-md text-xs font-medium transition-colors",
              currentScreenId === screen.id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            <button
              onClick={() => selectScreen(screen.id)}
              className="flex h-full items-center gap-1.5 rounded-l-md pl-2.5 pr-1.5"
            >
              <MonitorSmartphone className="h-3.5 w-3.5" />
              {screen.name}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="grid h-full place-items-center rounded-r-md pr-1.5 pl-0.5 opacity-60 hover:opacity-100"
                  title="Screen options"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={() => duplicateScreen(screen.id)}>
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={i === 0}
                  onClick={() => moveScreen(screen.id, -1)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Move left
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={i === project.screens.length - 1}
                  onClick={() => moveScreen(screen.id, 1)}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Move right
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={project.screens.length <= 1}
                  onClick={() => deleteScreen(screen.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => addScreen()}
          title="Add screen"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => setCommandOpen(true)}
          className="mr-1 hidden items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground shadow-soft transition-colors hover:bg-muted lg:flex"
          title="Command palette"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <kbd className="rounded border bg-background px-1 py-0.5 text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
        {isDesktop && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-primary hover:text-primary"
            onClick={() => setAiOpen(true)}
            title="Generate UI with AI"
          >
            <Sparkles className="h-4 w-4" />
            AI
          </Button>
        )}
        {isDesktop && <AiDialog open={aiOpen} onOpenChange={setAiOpen} />}
        <Button
          variant={previewMode ? "default" : "ghost"}
          size="sm"
          className="gap-1.5"
          onClick={() => setPreviewMode(!previewMode)}
        >
          {previewMode ? (
            <Square className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {previewMode ? "Exit preview" : "Preview"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => setDataOpen(true)}
        >
          <Database className="h-4 w-4" />
          Data
          {dataCount > 0 && (
            <span className="rounded bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {dataCount}
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => setGithubOpen(true)}
        >
          <Github className="h-4 w-4" />
          Push
        </Button>
        <DataSourcesDialog open={dataOpen} onOpenChange={setDataOpen} />
        <GitHubDialog
          project={project}
          open={githubOpen}
          onOpenChange={setGithubOpen}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="brand">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => {
                if (!currentScreen) return;
                downloadText(
                  `${currentScreen.name.replace(/\s+/g, "")}Page.tsx`,
                  generatePageCode(currentScreen, project)
                );
                toast.success("Screen exported");
              }}
            >
              <FileCode className="h-4 w-4" />
              Current screen (.tsx)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await exportProjectZip(project);
                toast.success("Project exported");
              }}
            >
              <Package className="h-4 w-4" />
              Whole project (.zip)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await exportNextProjectZip(project);
                toast.success("Next.js app exported");
              }}
            >
              <AppWindow className="h-4 w-4" />
              Next.js app (App Router)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await exportViteProjectZip(project);
                toast.success("Vite app exported");
              }}
            >
              <AppWindow className="h-4 w-4" />
              Vite + React Router (SPA)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await exportStaticHtmlZip(project);
                toast.success("Static HTML exported");
              }}
            >
              <FileCode className="h-4 w-4" />
              Static HTML (no framework)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: ProjectMode;
  onChange: (m: ProjectMode) => void;
}) {
  const isDynamic = mode === "dynamic";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-medium transition-colors",
            isDynamic
              ? "border-primary/30 bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {isDynamic ? (
            <Zap className="h-3 w-3" />
          ) : (
            <FileText className="h-3 w-3" />
          )}
          {isDynamic ? "Dynamic" : "Static"}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <ModeItem
          active={mode === "static"}
          icon={<FileText className="h-4 w-4" />}
          title="Static"
          desc="Constants + navigation only"
          onClick={() => onChange("static")}
        />
        <ModeItem
          active={mode === "dynamic"}
          icon={<Zap className="h-4 w-4" />}
          title="Dynamic"
          desc="Live API data + requests"
          onClick={() => onChange("dynamic")}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ModeItem({
  active,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem onClick={onClick} className="items-start gap-2 py-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span className="flex-1">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {title}
          {active && <Check className="h-3.5 w-3.5 text-primary" />}
        </span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </DropdownMenuItem>
  );
}
