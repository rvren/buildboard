import type {
  BuildBoardApi,
  Project,
  SnapshotMeta,
  ThemeMode,
  ThemeState,
} from "@shared/types";

// The renderer talks to persistence through this one interface so the SAME code
// runs in two targets: the Electron desktop app (SQLite via the preload bridge)
// and the browser web app (localStorage). The adapter is chosen at runtime by
// whether the preload bridge (`window.api`) exists.

export type Persistence = Pick<
  BuildBoardApi,
  | "listProjects"
  | "saveProject"
  | "deleteProject"
  | "getThemeSync"
  | "setTheme"
  | "listSnapshots"
  | "createSnapshot"
  | "restoreSnapshot"
  | "deleteSnapshot"
>;

// ---- Electron: delegate to the typed window.api bridge → SQLite ----
const electronAdapter: Persistence = {
  listProjects: () => window.api.listProjects(),
  saveProject: (p) => window.api.saveProject(p),
  deleteProject: (id) => window.api.deleteProject(id),
  getThemeSync: () => window.api.getThemeSync(),
  setTheme: (mode) => window.api.setTheme(mode),
  listSnapshots: (projectId) => window.api.listSnapshots(projectId),
  createSnapshot: (projectId, label) => window.api.createSnapshot(projectId, label),
  restoreSnapshot: (snapshotId) => window.api.restoreSnapshot(snapshotId),
  deleteSnapshot: (snapshotId) => window.api.deleteSnapshot(snapshotId),
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

const SNAPSHOTS_KEY = "buildboard.snapshots";
type StoredSnapshot = SnapshotMeta & { data: Project };
function readSnapshots(): StoredSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? (JSON.parse(raw) as StoredSnapshot[]) : [];
  } catch {
    return [];
  }
}
function writeSnapshots(snaps: StoredSnapshot[]): void {
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snaps));
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
  listSnapshots: async (projectId) =>
    readSnapshots()
      .filter((s) => s.projectId === projectId)
      .map(({ id, projectId: pid, label, createdAt }) => ({
        id,
        projectId: pid,
        label,
        createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt),
  createSnapshot: async (projectId, label) => {
    const project = readProjects().find((p) => p.id === projectId);
    if (!project) return null;
    const createdAt = Date.now();
    const id = `snap_${createdAt.toString(36)}`;
    const snaps = readSnapshots();
    snaps.push({
      id,
      projectId,
      label,
      createdAt,
      data: JSON.parse(JSON.stringify(project)) as Project,
    });
    writeSnapshots(snaps);
    return { id, projectId, label, createdAt };
  },
  restoreSnapshot: async (snapshotId) => {
    const snap = readSnapshots().find((s) => s.id === snapshotId);
    if (!snap) return null;
    const project = { ...snap.data, updatedAt: Date.now() };
    const all = readProjects();
    const i = all.findIndex((p) => p.id === project.id);
    if (i >= 0) all[i] = project;
    else all.unshift(project);
    writeProjects(all);
    return project;
  },
  deleteSnapshot: async (snapshotId) => {
    writeSnapshots(readSnapshots().filter((s) => s.id !== snapshotId));
  },
};

/** Whether we're running inside the Electron shell (preload bridge present). */
export const isDesktop =
  typeof window !== "undefined" && typeof window.api !== "undefined";

/** The active persistence backend for this target. */
export const persistence: Persistence = isDesktop ? electronAdapter : webAdapter;
