#!/usr/bin/env node
/* Headless boot check: build, boot the real app with BB_BOOTCHECK=1 so the main
 * process verifies the renderer mounted + the window.api bridge round-trips, then
 * quits. Exits non-zero on failure. Opens a window briefly. */
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const root = path.join(__dirname, "..");
if (!fs.existsSync(path.join(root, "out", "main", "index.js"))) {
  console.error("[bootcheck] run `npm run build` first.");
  process.exit(1);
}

const electron = require("electron");
const child = spawn(electron, [root], {
  env: { ...process.env, BB_BOOTCHECK: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});

let out = "";
child.stdout.on("data", (d) => (out += d));
child.stderr.on("data", (d) => (out += d));

const timer = setTimeout(() => {
  console.error("[bootcheck] timed out");
  console.error(out);
  child.kill("SIGKILL");
  process.exit(1);
}, 25000);

child.on("exit", () => {
  clearTimeout(timer);
  process.stdout.write(out);
  process.exit(/\[bootcheck\] PASS/.test(out) ? 0 : 1);
});
