import { motion } from "framer-motion";
import type { Screen } from "@/types";
import { cn } from "@/lib/utils";
import { useEditor } from "@/store/editorStore";
import { spring } from "@/lib/motion";
import { tokenStyle } from "@/lib/designSystem";
import { NodeRenderer } from "./NodeRenderer";
import { ComponentDefsProvider } from "./componentDefs";

export function ScreenFrame({ screen }: { screen: Screen }) {
  const currentScreenId = useEditor((s) => s.currentScreenId);
  const selectScreen = useEditor((s) => s.selectScreen);
  const setSelected = useEditor((s) => s.setSelected);
  const tokens = useEditor((s) => s.currentProject()?.designSystem.tokens);
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
          "overflow-hidden rounded-xl bg-white ring-1 transition-shadow dark:bg-card",
          active ? "ring-primary/30 shadow-soft-lg" : "ring-border shadow-soft"
        )}
        style={{ width: screen.width, height: screen.height }}
        onClick={() => setSelected(null)}
      >
        <div
          className="h-full w-full overflow-auto scrollbar-thin"
          style={tokens ? tokenStyle(tokens) : undefined}
        >
          <ComponentDefsProvider components={components ?? []}>
            <NodeRenderer node={screen.root} isRoot />
          </ComponentDefsProvider>
        </div>
      </div>
    </motion.div>
  );
}
