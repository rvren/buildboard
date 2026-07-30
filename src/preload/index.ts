import { contextBridge, ipcRenderer } from "electron";
import type { BuildBoardApi, Project, ThemeMode, ThemeState } from "@shared/types";
import { CH } from "@shared/constants";

// The single renderer↔main surface. Everything the renderer can do to persist state
// is here; there is no Node/DB access in the renderer itself.

const api: BuildBoardApi = {
  listProjects: (): Promise<Project[]> => ipcRenderer.invoke(CH.listProjects),
  saveProject: (project: Project): Promise<void> => ipcRenderer.invoke(CH.saveProject, project),
  deleteProject: (id: string): Promise<void> => ipcRenderer.invoke(CH.deleteProject, id),
  getThemeSync: (): ThemeState => ipcRenderer.sendSync(CH.themeSync),
  setTheme: (mode: ThemeMode): Promise<void> => ipcRenderer.invoke(CH.themeSet, mode),
  aiHasKey: () => ipcRenderer.invoke(CH.aiHasKey),
  aiSetKey: (key: string) => ipcRenderer.invoke(CH.aiSetKey, key),
  aiClearKey: () => ipcRenderer.invoke(CH.aiClearKey),
  aiGenerate: (prompt: string) => ipcRenderer.invoke(CH.aiGenerate, prompt),
  listSnapshots: (projectId: string) => ipcRenderer.invoke(CH.listSnapshots, projectId),
  createSnapshot: (projectId: string, label: string) =>
    ipcRenderer.invoke(CH.createSnapshot, projectId, label),
  restoreSnapshot: (snapshotId: string) =>
    ipcRenderer.invoke(CH.restoreSnapshot, snapshotId),
  deleteSnapshot: (snapshotId: string) =>
    ipcRenderer.invoke(CH.deleteSnapshot, snapshotId),
};

contextBridge.exposeInMainWorld("api", api);
