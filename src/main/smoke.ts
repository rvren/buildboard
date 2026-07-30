import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import type { DesignNode, Project, ThemePalette } from "@shared/types";
import { openDb, PALETTE_KEYS } from "./dbCore";
import { deleteProject, getProject, listProjects, saveProject } from "./store";

// Headless data-layer smoke: round-trip a fully-populated Project through the
// normalized SQLite schema (save → reload) and assert the deep tree survives.
// Runs under Electron (native better-sqlite3 ABI) via `npm run smoke`.

function palette(hex: string): ThemePalette {
  return Object.fromEntries(PALETTE_KEYS.map((k) => [k, hex])) as unknown as ThemePalette;
}

function sampleProject(): Project {
  const input: DesignNode = { id: "n-input", type: "Input", props: { placeholder: "Email" }, styles: { width: "full" }, responsive: { md: { width: "1/2" }, lg: { width: "1/3" } }, children: [] };
  const text: DesignNode = { id: "n-text", type: "Text", props: { text: "Hi" }, styles: {}, children: [] };
  const inner: DesignNode = { id: "n-inner", type: "Container", props: {}, styles: { direction: "col", gap: 2 }, children: [text, input] };
  const button: DesignNode = {
    id: "n-btn", type: "Button", props: { text: "Go" }, styles: {}, children: [], variant: "vp",
    action: { trigger: "click", type: "navigate", targetScreenId: "s1" },
  };
  const heading: DesignNode = { id: "n-h", type: "Heading", name: "Title", props: { text: "Welcome" }, styles: { fontSize: "2xl" }, children: [] };
  const root: DesignNode = { id: "n-root", type: "Container", props: {}, styles: { padding: 4 }, children: [heading, button, inner] };

  const compRoot: DesignNode = { id: "c-root", type: "Card", props: {}, styles: {}, children: [
    { id: "c-badge", type: "Badge", props: { text: "New" }, styles: {}, children: [] },
  ] };

  return {
    id: "p1",
    name: "Smoke Project",
    description: "round-trip",
    mode: "dynamic",
    createdAt: 1000,
    updatedAt: 2000,
    screens: [
      { id: "s1", name: "Home", width: 1200, height: 800, x: 10, y: 20, root, dataSourceId: "d1" },
    ],
    dataSources: [
      {
        id: "d1", name: "API", kind: "api", method: "GET", url: "https://example.com",
        headers: [ { key: "Authorization", value: "Bearer x" }, { key: "Accept", value: "application/json" } ],
        auth: { type: "bearer", token: "tok" },
        body: undefined,
        lastResult: { status: 200, ok: true, timeMs: 42, body: "{}", at: 999 },
        schema: [ { path: "items[].id", type: "number" }, { path: "items[].name", type: "string" } ],
      },
    ],
    designSystem: {
      tokens: { light: palette("#ffffff"), dark: palette("#111111"), radius: 10, font: "Inter" },
      presets: [ { id: "pr1", name: "CTA", type: "Button", props: { text: "Buy" }, styles: { bg: "primary" } } ],
      components: [
        {
          id: "cd1", name: "Card", root: compRoot,
          variants: [{ id: "vp", name: "Primary", styles: { bg: "primary" } }],
        },
      ],
    },
    architecture: {
      services: [ { id: "svc1", name: "Web", kind: "frontend", description: "UI" } ],
      interactions: [ { id: "int1", from: "svc1", to: "svc1", label: "self" } ],
      sequences: [ { id: "seq1", name: "Login", steps: [
        { id: "st1", from: "User", to: "Web", message: "open", type: "sync" },
        { id: "st2", from: "Web", to: "User", message: "ok", type: "response" },
      ] } ],
    },
  };
}

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

export function runSmoke(): void {
  const dbFile = join(tmpdir(), `bb-smoke-${process.pid}.db`);
  const cleanup = () => ["", "-wal", "-shm"].forEach((s) => rmSync(dbFile + s, { force: true }));
  try {
    cleanup();
    const db = openDb(dbFile);
    const orig = sampleProject();
    saveProject(db, orig);

    const list = listProjects(db);
    assert(list.length === 1, "one project persisted");

    const p = getProject(db, "p1");
    assert(p, "project reloads");
    assert(p!.name === orig.name && p!.mode === "dynamic", "scalar fields");
    // node tree
    const root = p!.screens[0].root;
    assert(root.children.length === 3, "root has 3 children (order preserved)");
    assert(root.children[0].type === "Heading" && root.children[0].name === "Title", "heading + name");
    assert(root.children[1].action?.type === "navigate", "button action survives");
    assert(root.children[2].children[1].type === "Input", "nested input at depth 3");
    assert(root.children[2].children[1].styles.width === "full", "nested styles survive");
    assert(
      root.children[2].children[1].responsive?.md?.width === "1/2" &&
        root.children[2].children[1].responsive?.lg?.width === "1/3",
      "responsive overrides survive",
    );
    // design system
    assert(p!.designSystem.tokens.radius === 10, "ds radius");
    assert(p!.designSystem.tokens.light.background === "#ffffff", "light palette");
    assert(p!.designSystem.tokens.dark.background === "#111111", "dark palette");
    assert(p!.designSystem.components[0].root.children[0].type === "Badge", "component def tree");
    assert(
      p!.designSystem.components[0].variants?.[0]?.name === "Primary" &&
        p!.designSystem.components[0].variants?.[0]?.styles.bg === "primary",
      "component variants survive",
    );
    assert(root.children[1].variant === "vp", "instance variant selection survives");
    assert(p!.designSystem.presets[0].name === "CTA", "preset");
    // data sources
    const d = p!.dataSources[0];
    assert(d.headers.length === 2 && d.headers[0].key === "Authorization", "headers order");
    assert(d.auth.type === "bearer" && d.auth.token === "tok", "auth");
    assert(d.schema?.length === 2, "schema fields");
    assert(d.lastResult?.status === 200, "last result json");
    assert(p!.screens[0].dataSourceId === "d1", "screen data source link");
    // architecture
    assert(p!.architecture.sequences[0].steps.length === 2, "sequence steps");
    assert(p!.architecture.interactions[0].from === "svc1", "interaction");

    // delete cascades
    deleteProject(db, "p1");
    assert(listProjects(db).length === 0, "delete removes project");
    assert(
      (db.prepare("SELECT COUNT(*) c FROM nodes").get() as { c: number }).c === 0,
      "delete cascades to nodes",
    );

    db.close();
    console.log("[smoke] PASS — normalized save/hydrate round-trips + cascade");
  } catch (e) {
    console.error("[smoke] FAIL:", (e as Error).message);
    process.exitCode = 1;
  } finally {
    cleanup();
  }
}
