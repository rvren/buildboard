import type { DesignNode, Project, ProjectMode } from "@/types";
import { createProject } from "@/lib/factory";
import { STARTERS } from "@/lib/starters";

// Dashboard "start from a template" projects. Each template composes the
// existing one-click STARTERS (single source of truth for starter layouts) into
// a project's first screen, so a new project opens with real, editable content
// instead of a blank canvas.

export interface ProjectTemplate {
  id: string;
  name: string;
  hint: string;
  /** STARTER ids stacked into the first screen (empty = keep the demo screen). */
  starterIds: string[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  { id: "blank", name: "Blank", hint: "Start from an empty canvas", starterIds: [] },
  {
    id: "landing",
    name: "Landing page",
    hint: "Navbar, hero, and a feature grid",
    starterIds: ["navbar", "hero", "cards"],
  },
  {
    id: "signup",
    name: "Sign-up",
    hint: "Navbar with a centered sign-up form",
    starterIds: ["navbar", "form"],
  },
  {
    id: "catalog",
    name: "Catalog",
    hint: "Navbar over a responsive card grid",
    starterIds: ["navbar", "cards"],
  },
];

/** Build the first-screen root children for a template from its starters. */
function templateChildren(starterIds: string[]): DesignNode[] {
  const out: DesignNode[] = [];
  for (const id of starterIds) {
    const starter = STARTERS.find((s) => s.id === id);
    if (starter) out.push(...starter.build());
  }
  return out;
}

/** Create a project seeded from a template (falls back to the blank demo screen). */
export function createProjectFromTemplate(
  name: string,
  mode: ProjectMode,
  templateId: string
): Project {
  const project = createProject(name, mode);
  const tpl = PROJECT_TEMPLATES.find((t) => t.id === templateId);
  if (tpl && tpl.starterIds.length && project.screens[0]) {
    project.screens[0].root.children = templateChildren(tpl.starterIds);
  }
  return project;
}
