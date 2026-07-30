import { BrowserWindow, ipcMain } from "electron";
import type { Project, ThemeMode } from "@shared/types";
import { CH } from "@shared/constants";
import { db, getSetting, setSetting } from "./db";
import { deleteProject, listProjects, saveProject } from "./store";

// All ipcMain handlers — the renderer's only path to the database. The renderer
// has no Node/DB access; it calls these through the preload's typed window.api.

export function registerIpc(_getWindow: () => BrowserWindow | null): void {
  // ---- theme (sync read for no-flash boot + async write) ----
  ipcMain.on(CH.themeSync, (event) => {
    event.returnValue = { mode: (getSetting(db(), "theme") as ThemeMode) || "light" };
  });
  ipcMain.handle(CH.themeSet, (_e, mode: ThemeMode) => {
    setSetting(db(), "theme", mode);
  });

  // ---- projects ----
  ipcMain.handle(CH.listProjects, () => listProjects(db()));
  ipcMain.handle(CH.saveProject, (_e, project: Project) => {
    saveProject(db(), project);
  });
  ipcMain.handle(CH.deleteProject, (_e, id: string) => {
    deleteProject(db(), id);
  });
}
