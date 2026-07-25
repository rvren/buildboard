import { useNavigate } from "react-router-dom";
import {
  Command,
  HelpCircle,
  LayoutTemplate,
  Workflow,
  SwatchBook,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { LogoMark, ThemeToggle } from "@/components/common";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditor } from "@/store/editorStore";
import { cn } from "@/lib/utils";

type EditorView = "design" | "flow" | "system" | "architecture";

// Order follows the enterprise workflow: define the system → architect →
// design screens → wire the flow.
const VIEWS: { id: EditorView; icon: LucideIcon; label: string }[] = [
  { id: "system", icon: SwatchBook, label: "Design System" },
  { id: "architecture", icon: Waypoints, label: "Architecture" },
  { id: "design", icon: LayoutTemplate, label: "Design" },
  { id: "flow", icon: Workflow, label: "Flow" },
];

export function NavRail() {
  const navigate = useNavigate();
  const editorView = useEditor((s) => s.editorView);
  const setEditorView = useEditor((s) => s.setEditorView);
  const setCommandOpen = useEditor((s) => s.setCommandOpen);

  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-card py-4">
      {/* Brand — topmost */}
      <button
        onClick={() => navigate("/")}
        title="Back to projects"
        className="mb-2 transition-transform hover:scale-105 active:scale-95"
      >
        <LogoMark />
      </button>

      {/* Primary views — icon only; names on hover. Sub-tools live in the left panel. */}
      <div className="flex flex-col items-center gap-1.5">
        {VIEWS.map((v) => (
          <RailButton
            key={v.id}
            icon={v.icon}
            tip={v.label}
            active={editorView === v.id}
            onClick={() => setEditorView(v.id)}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-1.5">
        <RailButton
          icon={Command}
          tip="Commands (⌘K)"
          onClick={() => setCommandOpen(true)}
        />
        <RailButton
          icon={HelpCircle}
          tip="Docs"
          onClick={() => setCommandOpen(true)}
        />
        <div className="my-1 h-px w-6 bg-border" />
        <ThemeToggle />
      </div>
    </div>
  );
}

function RailButton({
  icon: Icon,
  tip,
  active,
  onClick,
}: {
  icon: LucideIcon;
  tip: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "relative grid h-10 w-10 place-items-center rounded-lg transition-colors",
            active
              ? "bg-accent text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {active && (
            <span className="absolute -left-[9px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
          )}
          <Icon className="h-[18px] w-[18px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{tip}</TooltipContent>
    </Tooltip>
  );
}
