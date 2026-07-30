#!/usr/bin/env node
/* Headless data-layer smoke: build first, then boot the app with BB_SMOKE=1 so
 * the main process round-trips a project through SQLite and quits. Exits non-zero
 * on failure. Run after `npm run build`. */
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const root = path.join(__dirname, "..");
const mainJs = path.join(root, "out", "main", "index.js");
if (!fs.existsSync(mainJs)) {
  console.error("[smoke] out/main/index.js not found — run `npm run build` first.");
  process.exit(1);
}

const electron = require("electron");
const child = spawn(electron, [root], {
  env: { ...process.env, BB_SMOKE: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});

let out = "";
child.stdout.on("data", (d) => (out += d));
child.stderr.on("data", (d) => (out += d));

const timer = setTimeout(() => {
  console.error("[smoke] timed out waiting for result");
  console.error(out);
  child.kill("SIGKILL");
  process.exit(1);
}, 20000);

child.on("exit", () => {
  clearTimeout(timer);
  process.stdout.write(out);
  process.exit(/\[smoke\] PASS/.test(out) ? 0 : 1);
});
