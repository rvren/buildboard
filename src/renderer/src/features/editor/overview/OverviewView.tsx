import { motion } from "framer-motion";
import {
  LayoutTemplate,
  Component,
  Database,
  SwatchBook,
  Waypoints,
  Workflow,
  ArrowUpRight,
  ArrowRight,
  Clock,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";
import type { DesignNode, Project, DataSource } from "@/types";
import { useEditor } from "@/store/editorStore";
import { useTheme } from "@/store/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MiniPreview } from "@/features/dashboard/MiniPreview";
import { pageVariants, staggerContainer, riseItem } from "@/lib/motion";

/** Count every node in a subtree (root Container included). */
function countNodes(n: DesignNode): number {
  return 1 + n.children.reduce((sum, c) => sum + countNodes(c), 0);
}

/** Compact relative-time label from an epoch-ms timestamp. */
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function OverviewView({ project }: { project: Project }) {
  const selectScreen = useEditor((s) => s.selectScreen);
  const setEditorView = useEditor((s) => s.setEditorView);
  const setDataOpen = useEditor((s) => s.setDataDialogOpen);
  const theme = useTheme((s) => s.theme);
  const palette = project.designSystem.tokens[theme];

  const firstScreen = project.screens[0];
  const componentCount = project.screens.reduce(
    (sum, scr) => sum + Math.max(0, countNodes(scr.root) - 1),
    0
  );
  const dsComponents = project.designSystem.components.length;
  const dsPresets = project.designSystem.presets.length;
  const services = project.architecture.services.length;
  const sequences = project.architecture.sequences.length;

  const openDesign = () => {
    if (firstScreen) selectScreen(firstScreen.id);
    setEditorView("design");
  };

  const stats: {
    icon: LucideIcon;
    label: string;
    value: number;
    sub: string;
    onClick: () => void;
  }[] = [
    {
      icon: LayoutTemplate,
      label: "Screens",
      value: project.screens.length,
      sub: project.screens.length === 1 ? "screen" : "screens",
      onClick: openDesign,
    },
    {
      icon: Component,
      label: "Components",
      value: componentCount,
      sub: "on the canvas",
      onClick: openDesign,
    },
    {
      icon: Database,
      label: "Data Sources",
      value: project.dataSources.length,
      sub: project.mode === "dynamic" ? "live data" : "constants",
      onClick: () => setDataOpen(true),
    },
    {
      icon: SwatchBook,
      label: "Design System",
      value: dsComponents,
      sub: `${dsPresets} preset${dsPresets === 1 ? "" : "s"}`,
      onClick: () => setEditorView("system"),
    },
    {
      icon: Waypoints,
      label: "Architecture",
      value: services,
      sub: `${sequences} flow${sequences === 1 ? "" : "s"}`,
      onClick: () => setEditorView("architecture"),
    },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="h-full min-h-0 flex-1 overflow-y-auto scrollbar-thin bg-background"
    >
      <div className="relative mx-auto max-w-6xl px-8 py-10">
        {/* Soft brand glow behind the hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 right-4 h-64 w-64 rounded-full bg-brand opacity-[0.08] blur-3xl"
        />

        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="relative grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Project overview
            </span>

            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.02em]">
              {project.name}
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              {project.description?.trim() ||
                "An infinite-canvas project. Design screens, wire in data, and export clean React + Tailwind code."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium",
                  project.mode === "dynamic"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/70 bg-card/70"
                )}
              >
                {project.mode === "dynamic" ? "Dynamic" : "Static"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Edited {relativeTime(project.updatedAt)}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span>Created {relativeTime(project.createdAt)}</span>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Button variant="brand" onClick={openDesign} className="gap-1.5">
                <LayoutTemplate className="h-4 w-4" />
                Open design
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditorView("flow")}
                className="gap-1.5"
              >
                <Workflow className="h-4 w-4" />
                View flow
              </Button>
            </div>
          </div>

          {/* Live preview — the "primary resource" card */}
          <button
            onClick={openDesign}
            className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card text-left transition-colors hover:border-brand"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                {firstScreen ? firstScreen.name : "No screens yet"}
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="h-56 overflow-hidden bg-brand-soft">
              <MiniPreview
                screen={firstScreen}
                tokens={project.designSystem.tokens}
                components={project.designSystem.components}
              />
            </div>
          </button>
        </section>

        {/* ── Stat tiles ─────────────────────────────────────── */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
        >
          {stats.map((s) => (
            <motion.button
              key={s.label}
              variants={riseItem}
              whileHover={{ y: -4 }}
              onClick={s.onClick}
              className="group flex flex-col items-start rounded-2xl border border-border/70 bg-card p-4 text-left transition-colors hover:border-brand hover:bg-muted/30"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">
                {s.value}
              </span>
              <span className="text-[13px] font-medium">{s.label}</span>
              <span className="text-xs text-muted-foreground">{s.sub}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* ── Module panels ──────────────────────────────────── */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Screens */}
          <ModulePanel
            title="Screens"
            count={project.screens.length}
            action="Open design"
            onClick={openDesign}
          >
            {project.screens.length ? (
              <ul className="space-y-1.5">
                {project.screens.slice(0, 5).map((scr) => (
                  <li
                    key={scr.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-[13px]"
                  >
                    <span className="truncate font-medium">{scr.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {scr.width}×{scr.height}
                    </span>
                  </li>
                ))}
                {project.screens.length > 5 && (
                  <li className="px-1 pt-1 text-xs text-muted-foreground">
                    +{project.screens.length - 5} more
                  </li>
                )}
              </ul>
            ) : (
              <EmptyRow label="No screens yet" />
            )}
          </ModulePanel>

          {/* Data sources */}
          <ModulePanel
            title="Data Sources"
            count={project.dataSources.length}
            action="Manage data"
            onClick={() => setDataOpen(true)}
          >
            {project.dataSources.length ? (
              <ul className="space-y-1.5">
                {project.dataSources.slice(0, 5).map((ds) => (
                  <li
                    key={ds.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-[13px]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                        {ds.kind === "api" ? ds.method : "const"}
                      </span>
                      <span className="truncate font-medium">{ds.name}</span>
                    </span>
                    <HealthChip ds={ds} />
                  </li>
                ))}
                {project.dataSources.length > 5 && (
                  <li className="px-1 pt-1 text-xs text-muted-foreground">
                    +{project.dataSources.length - 5} more
                  </li>
                )}
              </ul>
            ) : (
              <EmptyRow
                label="No data sources"
                cta={
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDataOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add data source
                  </Button>
                }
              />
            )}
          </ModulePanel>

          {/* Design system */}
          <ModulePanel
            title="Design System"
            count={dsComponents}
            action="Open system"
            onClick={() => setEditorView("system")}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Swatch
                label="Brand"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${palette.brandFrom}, ${palette.brandTo})`,
                }}
              />
              <Swatch
                label="Primary"
                style={{ backgroundColor: palette.primary }}
              />
              <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {project.designSystem.tokens.font}
                </span>
                <span>{project.designSystem.tokens.radius}px radius</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {dsComponents} component{dsComponents === 1 ? "" : "s"} ·{" "}
              {dsPresets} preset{dsPresets === 1 ? "" : "s"}
            </p>
          </ModulePanel>

          {/* Architecture */}
          <ModulePanel
            title="Architecture"
            count={services}
            action="Open architecture"
            onClick={() => setEditorView("architecture")}
          >
            {services ? (
              <div className="flex flex-wrap gap-1.5">
                {project.architecture.services.slice(0, 8).map((svc) => (
                  <span
                    key={svc.id}
                    className="rounded-md border border-border/60 bg-background/40 px-2 py-1 text-xs font-medium"
                  >
                    {svc.name}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyRow label="No services defined" />
            )}
            {sequences > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {sequences} sequence diagram{sequences === 1 ? "" : "s"}
              </p>
            )}
          </ModulePanel>
        </div>
      </div>
    </motion.div>
  );
}

/** A clickable module card with header (title + count) and a footer action. */
function ModulePanel({
  title,
  count,
  action,
  onClick,
  children,
}: {
  title: string;
  count: number;
  action: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer flex-col rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-brand"
    >
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
          {action}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

/** Per-source health indicator derived from the last request result. */
function HealthChip({ ds }: { ds: DataSource }) {
  const r = ds.lastResult;
  if (!r) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <CircleDashed className="h-3.5 w-3.5" />
        Idle
      </span>
    );
  }
  if (r.ok) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[hsl(var(--success))]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {r.status} · {r.timeMs}ms
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[hsl(var(--warning))]">
      <AlertTriangle className="h-3.5 w-3.5" />
      {r.status || "error"}
    </span>
  );
}

function Swatch({
  label,
  style,
}: {
  label: string;
  style: React.CSSProperties;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="h-10 w-10 rounded-xl border border-border/60"
        style={style}
      />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function EmptyRow({
  label,
  cta,
}: {
  label: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-background/30 py-6 text-center text-xs text-muted-foreground">
      {label}
      {cta}
    </div>
  );
}
