import { motion } from "framer-motion";
import { LayoutTemplate } from "lucide-react";
import type { Screen } from "@/types";
import { cn } from "@/lib/utils";
import { STARTERS, type Starter } from "@/lib/starters";
import { useEditor } from "@/store/editorStore";
import { spring } from "@/lib/motion";
import { tokenStyle } from "@/lib/designSystem";
import { useTheme } from "@/store/theme";
import { NodeRenderer } from "./NodeRenderer";
import { ComponentDefsProvider } from "./componentDefs";

export function ScreenFrame({ screen }: { screen: Screen }) {
  const currentScreenId = useEditor((s) => s.currentScreenId);
  const selectScreen = useEditor((s) => s.selectScreen);
  const setSelected = useEditor((s) => s.setSelected);
  const previewMode = useEditor((s) => s.previewMode);
  const insertStarter = useEditor((s) => s.insertStarter);
  const tokens = useEditor((s) => s.currentProject()?.designSystem.tokens);
  const theme = useTheme((s) => s.theme);
  const components = useEditor(
    (s) => s.currentProject()?.designSystem.components
  );
  const active = currentScreenId === screen.id;

  return (
    <motion.div
      className="absolute"
      style={{ left: screen.x, top: screen.y }}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring}
      onMouseDown={() => {
        if (!active) selectScreen(screen.id);
      }}
    >
      {/* Label */}
      <button
        className={cn(
          "mb-2 flex items-center gap-2 text-xs font-medium transition-colors",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        onClick={(e) => {
          e.stopPropagation();
          selectScreen(screen.id);
          setSelected(null);
        }}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            active ? "bg-primary" : "bg-muted-foreground/40"
          )}
        />
        {screen.name}
        <span className="text-muted-foreground/60">
          {screen.width}×{screen.height}
        </span>
      </button>

      {/* Artboard */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl bg-white ring-1 transition-shadow dark:bg-card",
          active ? "ring-primary/30 shadow-soft-lg" : "ring-border shadow-soft"
        )}
        style={{ width: screen.width, height: screen.height }}
        onClick={() => setSelected(null)}
      >
        <div
          className="h-full w-full overflow-auto scrollbar-thin"
          style={tokens ? tokenStyle(tokens, theme) : undefined}
        >
          <ComponentDefsProvider components={components ?? []}>
            <NodeRenderer node={screen.root} isRoot />
          </ComponentDefsProvider>
        </div>
        {active && !previewMode && screen.root.children.length === 0 && (
          <EmptyScreenOverlay onPick={(st) => insertStarter(st.build())} />
        )}
      </div>
    </motion.div>
  );
}

/** Guided empty state for a blank screen: a drag hint + one-click starter layouts. */
function EmptyScreenOverlay({ onPick }: { onPick: (starter: Starter) => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-dashed border-border bg-card/85 p-5 text-center shadow-soft backdrop-blur">
        <div className="mx-auto mb-2.5 grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <LayoutTemplate className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-foreground">Start your page</p>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Drag components from the left panel, or drop in a starter layout to
          build on:
        </p>
        <div className="mt-3.5 grid grid-cols-2 gap-2 text-left">
          {STARTERS.map((st) => (
            <button
              key={st.id}
              onClick={() => onPick(st)}
              className="rounded-lg border border-border bg-background/60 p-2.5 transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <span className="block text-xs font-medium text-foreground">
                {st.name}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                {st.hint}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
