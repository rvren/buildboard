import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MoreHorizontal,
  Copy,
  Pencil,
  Trash2,
  Layers,
  Zap,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEditor } from "@/store/editorStore";
import { formatRelativeTime, cn } from "@/lib/utils";
import { MiniPreview } from "./MiniPreview";

export function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const openProject = useEditor((s) => s.openProject);
  const renameProject = useEditor((s) => s.renameProject);
  const deleteProject = useEditor((s) => s.deleteProject);
  const duplicateProject = useEditor((s) => s.duplicateProject);

  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draftName, setDraftName] = useState(project.name);

  const open = () => {
    openProject(project.id);
    navigate(`/project/${project.id}/overview`);
  };

  const commitRename = () => {
    renameProject(project.id, draftName.trim() || project.name);
    setRenaming(false);
    toast.success("Project renamed");
  };

  return (
    <>
      <Card
        onClick={open}
        className="group cursor-pointer overflow-hidden rounded-2xl border-border/70 shadow-soft transition-all hover:border-brand hover:glow"
      >
        <div className="relative aspect-[16/10] overflow-hidden border-b border-border/60 bg-brand-soft">
          <MiniPreview
            screen={project.screens[0]}
            tokens={project.designSystem?.tokens}
            components={project.designSystem?.components}
          />
          <div
            className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 shadow-sm"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setDraftName(project.name);
                    setRenaming(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    duplicateProject(project.id);
                    toast.success("Project duplicated");
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{project.name}</h3>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                  project.mode === "dynamic"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "text-muted-foreground"
                )}
              >
                {project.mode === "dynamic" ? (
                  <Zap className="h-2.5 w-2.5" />
                ) : (
                  <FileText className="h-2.5 w-2.5" />
                )}
                {project.mode === "dynamic" ? "Dynamic" : "Static"}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {project.screens.length} screen
                {project.screens.length === 1 ? "" : "s"}
              </span>
              <span>·</span>
              <span>{formatRelativeTime(project.updatedAt)}</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Rename dialog */}
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitRename()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
            <Button onClick={commitRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete “{project.name}”?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes the project and all its screens. This
            can't be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteProject(project.id);
                toast.success("Project deleted");
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
