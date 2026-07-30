import {
  Plus,
  Sparkles,
  LayoutTemplate,
  Database,
  Code2,
  ArrowDown,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEditor } from "@/store/editorStore";
import { Logo, ThemeToggle } from "@/components/common";
import { Button } from "@/components/ui/button";
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
          className="mb-5 flex items-center gap-2 scroll-mt-20"
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
            Your projects
          </h2>
          {projects.length > 0 && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
              {projects.length}
            </span>
          )}
        </div>

        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <AnimatePresence mode="popLayout">
              {projects.map((p) => (
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
