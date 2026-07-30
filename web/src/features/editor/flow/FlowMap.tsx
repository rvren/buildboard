import { useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, MousePointerClick, ArrowRight, Database } from "lucide-react";
import type { DesignNode, Project, Screen } from "@/types";
import { useEditor } from "@/store/editorStore";
import { MiniPreview } from "@/features/dashboard/MiniPreview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { riseItem, staggerContainer } from "@/lib/motion";

const CARD_W = 300;
const CARD_H = 236;
const GAP_X = 96;
const GAP_Y = 72;
const COLS = 3;
const PAD = 48;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function collectNavTargets(root: DesignNode): string[] {
  const targets: string[] = [];
  const walk = (n: DesignNode) => {
    if (n.action?.type === "navigate" && n.action.targetScreenId)
      targets.push(n.action.targetScreenId);
    n.children.forEach(walk);
  };
  walk(root);
  return targets;
}

function borderPoint(rect: Rect, toward: { x: number; y: number }) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx !== 0 ? rect.w / 2 / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? rect.h / 2 / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

export function FlowMap({ project }: { project: Project }) {
  const addScreen = useEditor((s) => s.addScreen);

  const layout = useMemo(() => {
    const rects = new Map<string, Rect>();
    project.screens.forEach((sc, i) => {
      rects.set(sc.id, {
        x: PAD + (i % COLS) * (CARD_W + GAP_X),
        y: PAD + Math.floor(i / COLS) * (CARD_H + GAP_Y),
        w: CARD_W,
        h: CARD_H,
      });
    });
    const cols = Math.min(COLS, project.screens.length || 1);
    const rows = Math.ceil(project.screens.length / COLS) || 1;
    const width = PAD * 2 + cols * CARD_W + (cols - 1) * GAP_X;
    const height = PAD * 2 + rows * CARD_H + (rows - 1) * GAP_Y + 40;
    return { rects, width, height };
  }, [project.screens]);

  const edges = useMemo(() => {
    const out: { from: string; to: string }[] = [];
    const seen = new Set<string>();
    for (const sc of project.screens) {
      for (const to of collectNavTargets(sc.root)) {
        if (to === sc.id) continue;
        const key = `${sc.id}->${to}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ from: sc.id, to });
      }
    }
    return out;
  }, [project.screens]);

  return (
    <div className="relative min-h-0 flex-1 overflow-auto scrollbar-thin bg-background surface-wash">
      {/* dotted backdrop */}
      <div className="canvas-grid pointer-events-none absolute inset-0 [background-size:24px_24px] opacity-60" />

      <div
        className="relative"
        style={{ width: layout.width, height: layout.height }}
      >
        {/* edges */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={layout.width}
          height={layout.height}
        >
          <defs>
            <marker
              id="flow-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
            </marker>
          </defs>
          {edges.map(({ from, to }) => {
            const a = layout.rects.get(from);
            const b = layout.rects.get(to);
            if (!a || !b) return null;
            const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
            const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
            const start = borderPoint(a, bc);
            const end = borderPoint(b, ac);
            const mx = (start.x + end.x) / 2;
            return (
              <path
                key={`${from}->${to}`}
                d={`M ${start.x} ${start.y} C ${mx} ${start.y}, ${mx} ${end.y}, ${end.x} ${end.y}`}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeOpacity={0.55}
                markerEnd="url(#flow-arrow)"
              />
            );
          })}
        </svg>

        {/* screen cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {project.screens.map((sc) => {
            const r = layout.rects.get(sc.id)!;
            return (
              <motion.div
                key={sc.id}
                variants={riseItem}
                className="absolute"
                style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
              >
                <FlowCard project={project} screen={sc} />
              </motion.div>
            );
          })}
        </motion.div>

        {/* add screen */}
        <div
          className="absolute"
          style={{
            left:
              PAD +
              (project.screens.length % COLS) * (CARD_W + GAP_X),
            top:
              PAD +
              Math.floor(project.screens.length / COLS) * (CARD_H + GAP_Y),
            width: CARD_W,
            height: CARD_H,
          }}
        >
          <button
            onClick={() => addScreen()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/70 bg-card/40 text-muted-foreground transition-colors hover:border-brand hover:bg-brand-soft hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm font-medium">Add screen</span>
          </button>
        </div>
      </div>

      {/* legend */}
      <div className="pointer-events-none sticky bottom-0 left-0 flex items-center gap-2 p-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 rounded-full border bg-card/90 px-2.5 py-1 shadow-soft backdrop-blur">
          <ArrowRight className="h-3 w-3 text-primary" />
          Navigation from a button's on-click action
        </span>
      </div>
    </div>
  );
}

function FlowCard({ project, screen }: { project: Project; screen: Screen }) {
  const currentScreenId = useEditor((s) => s.currentScreenId);
  const selectScreen = useEditor((s) => s.selectScreen);
  const setEditorView = useEditor((s) => s.setEditorView);
  const setScreenData = useEditor((s) => s.setScreenData);
  const active = currentScreenId === screen.id;
  const sources = project.dataSources ?? [];

  const open = () => {
    selectScreen(screen.id);
    setEditorView("design");
  };

  return (
    <div
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-all",
        active ? "ring-2 ring-primary/40 glow" : "hover:shadow-soft-lg"
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open()}
        className="relative block h-32 w-full shrink-0 cursor-pointer overflow-hidden border-b border-border/60 bg-brand-soft text-left"
      >
        <MiniPreview
          screen={screen}
          tokens={project.designSystem?.tokens}
          components={project.designSystem?.components}
        />
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium opacity-0 shadow-soft backdrop-blur transition-opacity group-hover:opacity-100">
          <MousePointerClick className="h-3 w-3" />
          Open
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2 p-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              active ? "bg-primary" : "bg-muted-foreground/40"
            )}
          />
          <span className="flex-1 truncate text-sm font-semibold">
            {screen.name}
          </span>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {screen.width}×{screen.height}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Database className="h-3 w-3 shrink-0 text-muted-foreground" />
          <Select
            value={screen.dataSourceId ?? "__none__"}
            onValueChange={(v) =>
              setScreenData(screen.id, v === "__none__" ? null : v)
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="No data source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs">
                No data source
              </SelectItem>
              {sources.map((ds) => (
                <SelectItem key={ds.id} value={ds.id} className="text-xs">
                  {ds.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
