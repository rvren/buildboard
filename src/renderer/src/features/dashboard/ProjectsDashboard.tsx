import { useMemo, useState } from "react";
import {
  Plus,
  Sparkles,
  LayoutTemplate,
  Database,
  Code2,
  ArrowDown,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEditor } from "@/store/editorStore";
import type { ProjectMode } from "@/types";
import { Logo, ThemeToggle } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { pageVariants, staggerContainer, riseItem } from "@/lib/motion";
import { NewProjectDialog } from "./NewProjectDialog";
import { ProjectCard } from "./ProjectCard";

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: LayoutTemplate,
    title: "Infinite canvas",
    desc: "Drag, drop, and arrange components across screens with real layout.",
  },
  {
    icon: Database,
    title: "Live data",
    desc: "Bind UI to real APIs, preview responses, and drive repeaters.",
  },
  {
    icon: Code2,
    title: "Export React",
    desc: "Generate clean, typed React + Tailwind — or push to GitHub.",
  },
];

function scrollToProjects() {
  document
    .getElementById("projects")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ProjectsDashboard() {
  const projects = useEditor((s) => s.projects);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | ProjectMode>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (mode !== "all" && p.mode !== mode) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [projects, query, mode]);

  const filtering = query.trim() !== "" || mode !== "all";
  const clearFilters = () => {
    setQuery("");
    setMode("all");
  };

  return (
    <motion.div
      className="app-wash min-h-screen bg-background"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NewProjectDialog />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-14">
        {/* Ambient brand glow behind the hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden"
        >
          <div className="absolute -top-24 left-[15%] h-72 w-72 rounded-full bg-brand opacity-[0.10] blur-3xl" />
          <div className="absolute -top-10 right-[12%] h-64 w-64 rounded-full bg-brand opacity-[0.07] blur-3xl" />
        </div>

        {/* Hero */}
        <section className="relative mb-14">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Design-to-code studio
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
            Design, then <span className="text-brand">ship</span>.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Build interfaces on an infinite canvas, wire in live data, and export
            clean React + Tailwind code — or push a pull request in one click.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <NewProjectDialog
              trigger={
                <Button size="lg" variant="brand" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  New project
                </Button>
              }
            />
            {projects.length > 0 && (
              <Button
                size="lg"
                variant="outline"
                className="gap-1.5"
                onClick={scrollToProjects}
              >
                <ArrowDown className="h-4 w-4" />
                Browse projects
              </Button>
            )}
          </div>
        </section>

        {/* Feature highlights */}
        <motion.div
          className="relative mb-16 grid gap-4 sm:grid-cols-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={riseItem}
              className="rounded-2xl border border-border/70 bg-card p-5"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-[18px] w-[18px]" />
              </span>
              <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Your projects */}
        <div
          id="projects"
          className="mb-5 flex flex-wrap items-center gap-3 scroll-mt-20"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
              Your projects
            </h2>
            {projects.length > 0 && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                {filtering ? `${filtered.length}/${projects.length}` : projects.length}
              </span>
            )}
          </div>

          {projects.length > 0 && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects…"
                  aria-label="Search projects"
                  className="h-9 w-52 pl-8 pr-8"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 grid -translate-y-1/2 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-card p-0.5">
                {(["all", "static", "dynamic"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                      mode === m
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {projects.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <NoMatches onClear={clearFilters} />
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  variants={riseItem}
                  exit="exit"
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <ProjectCard project={p} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </motion.div>
  );
}

function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/50 py-16 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Search className="h-5 w-5" />
      </div>
      <h2 className="text-base font-semibold">No matching projects</h2>
      <p className="mb-5 mt-1 max-w-sm text-sm text-muted-foreground">
        Try a different search term or filter.
      </p>
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/50 py-20 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand text-white">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold">Create your first project</h2>
      <p className="mb-6 mt-1 max-w-sm text-sm text-muted-foreground">
        Every project opens on an infinite canvas with a starter screen. Drag
        components, tweak styles, and grab the generated code.
      </p>
      <NewProjectDialog
        trigger={
          <Button size="lg" variant="brand">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        }
      />
    </div>
  );
}
