import { Plus, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEditor } from "@/store/editorStore";
import { Logo, ThemeToggle } from "@/components/common";
import { Button } from "@/components/ui/button";
import { pageVariants, staggerContainer, riseItem } from "@/lib/motion";
import { NewProjectDialog } from "./NewProjectDialog";
import { ProjectCard } from "./ProjectCard";

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

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Hero */}
        <div className="mb-10">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Design-to-code studio
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Design, then <span className="text-brand">ship</span>.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Build interfaces on an infinite canvas, wire in live data, and export
            clean React + Tailwind code — or push a pull request in one click.
          </p>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
            Your projects
          </h2>
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
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/50 py-24 text-center backdrop-blur">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand text-white glow">
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
