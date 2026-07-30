#!/usr/bin/env node
/* Generate build/icon.png and build/icon.icns from build/icon.svg using Electron's own
 * renderer (no native image deps). Runs as a tiny Electron app: renders the SVG in an
 * offscreen window, captures it, resizes to each iconset size, then iconutil → .icns.
 * Run: npm run icons   (macOS; needs a display session)
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { app, BrowserWindow, nativeImage } = require("electron");

const BUILD = path.join(__dirname, "..", "build");
const SVG = path.join(BUILD, "icon.svg");

async function run() {
  if (!fs.existsSync(SVG)) {
    console.error("[make-icon] build/icon.svg not found");
    app.exit(1);
    return;
  }
  const svg = fs.readFileSync(SVG, "utf8").replace(/<svg /, '<svg width="1024" height="1024" ');
  const html = `<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`;

  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true },
  });
  await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 400));
  const captured = await win.webContents.capturePage();

  const master = captured.resize({ width: 1024, height: 1024, quality: "best" });
  fs.writeFileSync(path.join(BUILD, "icon.png"), master.toPNG());
  console.log("[make-icon] wrote build/icon.png");

  const iconset = path.join(BUILD, "icon.iconset");
  fs.rmSync(iconset, { recursive: true, force: true });
  fs.mkdirSync(iconset, { recursive: true });
  const specs = [
    [16, "icon_16x16.png"],
    [32, "icon_16x16@2x.png"],
    [32, "icon_32x32.png"],
    [64, "icon_32x32@2x.png"],
    [128, "icon_128x128.png"],
    [256, "icon_128x128@2x.png"],
    [256, "icon_256x256.png"],
    [512, "icon_256x256@2x.png"],
    [512, "icon_512x512.png"],
    [1024, "icon_512x512@2x.png"],
  ];
  for (const [size, name] of specs) {
    const img = nativeImage.createFromBuffer(master.toPNG()).resize({ width: size, height: size, quality: "best" });
    fs.writeFileSync(path.join(iconset, name), img.toPNG());
  }

  try {
    execFileSync("iconutil", ["-c", "icns", iconset, "-o", path.join(BUILD, "icon.icns")]);
    console.log("[make-icon] wrote build/icon.icns");
  } catch (e) {
    console.warn("[make-icon] iconutil failed (non-macOS?); icon.png is still available.", e.message);
  }
  fs.rmSync(iconset, { recursive: true, force: true });

  win.destroy();
  app.quit();
}

app.whenReady().then(run).catch((e) => {
  console.error(e);
  app.exit(1);
});
