import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Zap, Check } from "lucide-react";
import type { ProjectMode } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEditor } from "@/store/editorStore";
import { PROJECT_TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";

const MODES: {
  value: ProjectMode;
  title: string;
  desc: string;
  icon: typeof FileText;
}[] = [
  {
    value: "static",
    title: "Static",
    desc: "Pages, constants, and navigation. No live APIs.",
    icon: FileText,
  },
  {
    value: "dynamic",
    title: "Dynamic",
    desc: "Bind UI to live API data and trigger requests.",
    icon: Zap,
  },
];

export function NewProjectDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<ProjectMode>("static");
  const [template, setTemplate] = useState("blank");
  const addProject = useEditor((s) => s.addProject);
  const addProjectFromTemplate = useEditor((s) => s.addProjectFromTemplate);
  const openProject = useEditor((s) => s.openProject);
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || "Untitled project";
    const id =
      template === "blank"
        ? addProject(finalName, mode)
        : addProjectFromTemplate(finalName, mode, template);
    openProject(id);
    setOpen(false);
    setName("");
    setMode("static");
    setTemplate("blank");
    navigate(`/project/${id}/overview`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="brand">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Create a project</DialogTitle>
            <DialogDescription>
              Choose how your app gets its data. You can convert static → dynamic
              later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                autoFocus
                placeholder="Marketing site"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {MODES.map((m) => {
                  const Icon = m.icon;
                  const active = mode === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMode(m.value)}
                      className={cn(
                        "relative flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      {active && (
                        <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-primary" />
                      )}
                      <span
                        className={cn(
                          "grid h-7 w-7 place-items-center rounded-md",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold">{m.title}</span>
                      <span className="text-xs leading-snug text-muted-foreground">
                        {m.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Start from</Label>
              <div className="grid grid-cols-2 gap-2">
                {PROJECT_TEMPLATES.map((t) => {
                  const active = template === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplate(t.id)}
                      className={cn(
                        "relative flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-all",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      {active && (
                        <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-primary" />
                      )}
                      <span className="text-[13px] font-semibold">{t.name}</span>
                      <span className="text-[11px] leading-snug text-muted-foreground">
                        {t.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" variant="brand">
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
