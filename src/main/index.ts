import { existsSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow, nativeImage, shell } from "electron";
import { APP_NAME } from "@shared/constants";
import { closeDb, initDb } from "./db";
import { registerIpc } from "./ipc";
import { runSmoke } from "./smoke";

// App lifecycle: initialize SQLite (source of truth), create the window, register IPC.
// The renderer has no Node/DB access — everything flows through the preload's typed
// window.api into the handlers in ipc.ts.

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: APP_NAME,
    backgroundColor: "#fafbfc",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.BB_BOOTCHECK === "1") {
    mainWindow.webContents.on("console-message", (_e, level, message) => {
      if (level >= 2) console.error("[renderer]", message);
    });
  }

  mainWindow.once("ready-to-show", async () => {
    mainWindow?.show();
    // Headless boot check (npm run bootcheck): verify the renderer mounted and the
    // window.api bridge round-trips, then quit.
    if (process.env.BB_BOOTCHECK === "1" && mainWindow) {
      try {
        await new Promise((r) => setTimeout(r, 2500));
        const res = await mainWindow.webContents.executeJavaScript(
          `(async () => {
            const mounted = document.getElementById("root")?.childElementCount ?? 0;
            const projects = await window.api.listProjects();
            return JSON.stringify({ hasApi: !!window.api, mounted, projectCount: projects.length });
          })()`,
        );
        console.log("[bootcheck] PASS", res);
      } catch (e) {
        console.error("[bootcheck] FAIL", (e as Error).message);
        process.exitCode = 1;
      }
      app.quit();
    }
  });

  // External links open in the default browser; never navigate the app window away.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const isDev = !!process.env.ELECTRON_RENDERER_URL;
    if (isDev && url.startsWith(process.env.ELECTRON_RENDERER_URL!)) return;
    // Allow in-app hash-router navigation (same file), block everything else.
    if (url.startsWith("file://")) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function setDevDockIcon(): void {
  if (process.platform !== "darwin" || !app.dock) return;
  const png = join(process.cwd(), "build", "icon.png");
  if (existsSync(png)) {
    const img = nativeImage.createFromPath(png);
    if (!img.isEmpty()) app.dock.setIcon(img);
  }
}

app.whenReady().then(() => {
  app.setName(APP_NAME);

  // Headless data-layer smoke (npm run smoke): round-trip a project and quit.
  if (process.env.BB_SMOKE === "1") {
    runSmoke();
    app.quit();
    return;
  }

  setDevDockIcon();
  initDb();
  registerIpc(() => mainWindow);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  closeDb();
});
