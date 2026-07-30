// App-wide constants shared across main, preload, and renderer.

export const APP_NAME = "BuildBoard";

/** IPC channel names — the single source of truth for both sides of the bridge. */
export const CH = {
  themeSync: "theme:sync",
  themeSet: "theme:set",
  listProjects: "projects:list",
  saveProject: "projects:save",
  deleteProject: "projects:delete",
} as const;
