import type { BuildBoardApi, Project, ThemeMode, ThemeState } from "@shared/types";

// The renderer talks to persistence through this one interface so the SAME code
// runs in two targets: the Electron desktop app (SQLite via the preload bridge)
// and the browser web app (localStorage). The adapter is chosen at runtime by
// whether the preload bridge (`window.api`) exists.

export type Persistence = Pick<
  BuildBoardApi,
  "listProjects" | "saveProject" | "deleteProject" | "getThemeSync" | "setTheme"
>;

// ---- Electron: delegate to the typed window.api bridge → SQLite ----
const electronAdapter: Persistence = {
  listProjects: () => window.api.listProjects(),
  saveProject: (p) => window.api.saveProject(p),
  deleteProject: (id) => window.api.deleteProject(id),
  getThemeSync: () => window.api.getThemeSync(),
  setTheme: (mode) => window.api.setTheme(mode),
};

// ---- Web: localStorage (projects as one JSON blob; theme as a key) ----
const PROJECTS_KEY = "buildboard.projects";
const THEME_KEY = "buildboard.theme";

function readProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}
function writeProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

const webAdapter: Persistence = {
  listProjects: async () => readProjects(),
  saveProject: async (project) => {
    const all = readProjects();
    const i = all.findIndex((p) => p.id === project.id);
    if (i >= 0) all[i] = project;
    else all.unshift(project);
    writeProjects(all);
  },
  deleteProject: async (id) => {
    writeProjects(readProjects().filter((p) => p.id !== id));
  },
  getThemeSync: (): ThemeState => ({
    mode: (localStorage.getItem(THEME_KEY) as ThemeMode) === "dark" ? "dark" : "light",
  }),
  setTheme: async (mode) => {
    localStorage.setItem(THEME_KEY, mode);
  },
};

/** Whether we're running inside the Electron shell (preload bridge present). */
export const isDesktop =
  typeof window !== "undefined" && typeof window.api !== "undefined";

/** The active persistence backend for this target. */
export const persistence: Persistence = isDesktop ? electronAdapter : webAdapter;
