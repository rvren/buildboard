import { Smartphone, Tablet, Monitor } from "lucide-react";
import { useEditor } from "@/store/editorStore";
import { useTheme } from "@/store/theme";
import { StaticNode } from "@/features/editor/canvas/renderTree";
import { ComponentDefsProvider } from "@/features/editor/canvas/componentDefs";
import { tokenStyle } from "@/lib/designSystem";
import { BREAKPOINT_WIDTHS, type ActiveBreakpoint } from "@/lib/styles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const VIEWS: { bp: ActiveBreakpoint; label: string; icon: typeof Smartphone; width: number }[] = [
  { bp: "sm", label: "sm · 640px", icon: Smartphone, width: BREAKPOINT_WIDTHS.sm },
  { bp: "md", label: "md · 768px", icon: Tablet, width: BREAKPOINT_WIDTHS.md },
  { bp: "lg", label: "lg · 1024px", icon: Monitor, width: BREAKPOINT_WIDTHS.lg },
];

/** Side-by-side preview of the active screen at each responsive breakpoint. */
export function ResponsivePreviewDialog() {
  const open = useEditor((s) => s.responsivePreviewOpen);
  const setOpen = useEditor((s) => s.setResponsivePreviewOpen);
  const project = useEditor((s) => s.currentProject());
  const screen = useEditor((s) => s.currentScreen());
  const theme = useTheme((s) => s.theme);

  if (!project || !screen) return null;
  const tokens = project.designSystem.tokens;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88vh] w-[min(96vw,1500px)] max-w-none overflow-hidden sm:max-w-none">
        <DialogHeader>
          <DialogTitle>Responsive preview — {screen.name}</DialogTitle>
          <DialogDescription>
            The same screen at each breakpoint, with your sm/md/lg overrides applied.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-4 overflow-auto pb-2">
          {VIEWS.map((v) => (
            <div key={v.bp} className="flex shrink-0 flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <v.icon className="h-3.5 w-3.5" />
                {v.label}
              </div>
              <div
                className="max-h-[64vh] overflow-auto rounded-lg border border-border bg-white shadow-soft dark:bg-card"
                style={{ width: v.width }}
              >
                <div style={tokenStyle(tokens, theme)}>
                  <ComponentDefsProvider components={project.designSystem.components}>
                    <StaticNode node={screen.root} bp={v.bp} />
                  </ComponentDefsProvider>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
