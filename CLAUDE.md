# CLAUDE.md — BuildBoard

Guidance for working in this repo. BuildBoard is a **local-first, offline design-to-code studio**
desktop app (Electron + React): build interfaces on an infinite canvas, wire in live data, manage a
themed design system, sketch architecture — then export clean React + Tailwind. Everything runs
on-device; projects live in a local SQLite database.

## Product doctrine — DESIGN-TO-CODE FIDELITY (applies to EVERY new feature)

BuildBoard's edge: what you build on the canvas **is** the code you ship — no redraw, no drift. Every
feature must protect that promise. If a proposed feature doesn't advance one of these, reshape it or
don't ship it.

1. **What you see is what you export.** The canvas renderer and the code generator read the **same**
   `DesignNode` + `StyleTokens` source of truth (`lib/styles.ts`, `lib/nodeDefs.tsx`, `lib/codegen.ts`).
   A visual change must never diverge from its generated Tailwind. Never fork the mapping.
2. **Edit once, update everywhere.** Design-system **components** are canonical subtrees; page nodes
   with `instanceOf` render through the definition, so editing a definition fans out to every instance
   (`editorStore.ts` `withActiveRoot`). Tokens (`designSystem.tokens`, light+dark) drive the whole app.
   Prefer definition/token edits over per-node duplication.
3. **The project is data you own.** State is a plain, serializable `Project` tree (`shared/types.ts`)
   persisted to a normalized local DB — no lock-in, no cloud. Any feature that adds state adds it to
   the typed model + the schema, never to an opaque blob.
4. **Zero-config, offline-first.** Opening the app requires no login or setup. Network is used only for
   what the user asked for (data-source requests, web fonts). Keep it that way.
5. **Additive & zero-regression.** New value = new node types / views / DB tables / export paths,
   reusing the patterns below. Don't alter the core data flow (renderer store → `window.api` → SQLite)
   except to add capabilities. Risky work ships behind a flag.
6. **Nav stays lean.** New surfaces go into the existing editor views (Overview · Design System ·
   Architecture · Design · Flow) as tabs/sections, not new top-level rails, unless a batch says so.

## Tech stack

electron-vite · Electron (contextIsolation, no nodeIntegration) · React 18 + TypeScript · Tailwind CSS
(shadcn/Radix primitives, TechCrunch-green) · Zustand · framer-motion · @dnd-kit (canvas drag) ·
mermaid (architecture diagrams) · jszip + prism-react-renderer (code export) · **better-sqlite3**
(WAL; native, rebuilt for Electron via `electron-rebuild` postinstall).

## Commands

```bash
npm run dev        # electron-vite dev (hot reload)
npm run build      # bundle main / preload / renderer → out/
npm run lint       # tsc --noEmit for node + web tsconfigs (the typecheck)
npm run smoke      # build + headless SQLite save/hydrate round-trip (data-layer gate)
npm run bootcheck  # build + boot the app headless; assert renderer mounts + window.api round-trips
npm run package    # local macOS .dmg + .zip via electron-builder
```

Releases: push a `v*` tag → `.github/workflows/release.yml` (macOS CI → lint + build →
electron-builder → **draft** GitHub Release with `.dmg`/`.zip` for arm64 + x64). Publishing the draft
is a manual step. Repo: `rvren/buildboard`.

## Process architecture

- **src/main/** (Node, privileged): app lifecycle + SQLite. `index.ts` (window, load renderer),
  `db.ts` (single main-thread connection, `userData/buildboard.db`), `dbCore.ts` (open + WAL/pragmas +
  the normalized schema + `PRAGMA user_version` migration gate), `store.ts` (serialize/hydrate a
  `Project` to/from the tables), `ipc.ts` (all `ipcMain` handlers), `smoke.ts` (the data-layer gate).
- **src/preload/index.ts**: the only renderer↔main surface — `contextBridge` exposes the typed
  `window.api` (`BuildBoardApi` in `shared/types.ts`). No Node/DB in the renderer.
- **src/renderer/**: the React app (moved wholesale here). `@` → `src/renderer/src`. A `types/index.ts`
  shim re-exports `@shared/types` so existing `@/types` imports keep working.
- **src/shared/**: `types.ts` (the domain model + `BuildBoardApi` + `Window.api` global) and
  `constants.ts` (`CH` channel names, `APP_NAME`).

Data flow: renderer store → `window.api.*` (invoke/sendSync) → `ipc.ts` → `store.ts` → SQLite.

## Database (READ BEFORE CHANGING PERSISTENCE)

**Fully normalized.** A `Project` is broken into relational tables — `projects → screens → nodes`
(the recursive `DesignNode` tree via `parent_id` + `order_index`, `owner_kind` distinguishing screen
roots from component-definition roots), `data_sources` (+ `data_source_headers`,
`data_source_schema_fields`), `design_system` + `theme_palettes` (one row per light/dark, one column
per palette token — see `PALETTE_KEYS`), `component_presets`, `component_definitions`, and
`arch_services` / `arch_interactions` / `sequences` + `seq_steps`. Inherently schemaless value-bags
(`props`, `styles`, `bindings`, `action`, `repeat`, `overrides`, request results, constant data) are
stored as **JSON columns** — the correct normalization boundary, not EAV.

- **Save is full-rewrite-per-project in one transaction** (`store.ts` `saveProject`): delete the
  project row (FK `ON DELETE CASCADE` clears every child table) then reinsert from the in-memory
  `Project`. Correct and cheap at single-user local scale; avoids tree-diffing.
- **Hydrate reconstructs the `Project`** (`getProject`/`listProjects`): rebuild each node tree from
  `parent_id`+`order_index`, fold palette rows into `DesignTokens`, regroup headers/schema/steps.
- **Renderer persistence** (`store/editorStore.ts`): boot calls `initEditorStore()` →
  `window.api.listProjects()`; a `useEditor.subscribe` watcher diffs `projects` **by reference**
  (immutable updates give changed projects new refs) and autosaves changed projects on a ~400ms
  debounce, deleting removed ones. **All store action signatures are unchanged** — only the backend
  moved off `localStorage`. Add new persisted state by extending the typed model + schema + serialize/
  hydrate, then cover it in `smoke.ts`.
- Bump `SCHEMA_VERSION` in `dbCore.ts` and add `ALTER TABLE`/backfill behind the `user_version` gate
  for future migrations — never rescan on every boot.

## Frontend conventions

- **Routing**: `createHashRouter` (works under `file://`) with two routes — dashboard `#/` and editor
  `#/project/:projectId/:view?`. The five editor **views** are state-driven sub-nav (`editorStore.ts`
  `EDITOR_VIEWS`, mirrored to the `:view` URL segment via a navigator registry), rendered by the
  switch in `EditorPage`. A new per-project view = add to `EDITOR_VIEWS` + `NavRail` + the render
  switch, modeled on `features/editor/overview/OverviewView.tsx`.
- **UI primitives**: shadcn/Radix components in `components/ui`. Use the `Button` `brand` variant for
  green-gradient CTAs. Motion variants (`pageVariants`, `staggerContainer`, `riseItem`) live in
  `lib/motion.ts`.
- **Canvas**: `@dnd-kit` drag; node types are defined once in `lib/nodeDefs.tsx` (`defFor`) with both
  a `render` and a `codegen` — add new node types there so the canvas and export stay in lockstep.

## Theming

- Light/dark via a `dark` class on `<html>`. The window is created `show: false` and revealed on
  `ready-to-show`, so there is no theme flash without a bootstrap script. `store/theme.ts` reads the
  persisted mode synchronously via `window.api.getThemeSync()` and applies the class at module load;
  writes go to the `settings` table via `window.api.setTheme`.
- App-chrome design tokens are HSL CSS custom properties in `index.css` (light `:root` / `.dark`),
  mapped to Tailwind via `hsl(var(--token))`; primary is TechCrunch green. A **per-project** design
  system (`project.designSystem.tokens`, light+dark palettes) is separate — page/preview content reads
  the project palette; the app shell reads the global tokens.

## Constraints & gotchas

- **CommonJS output.** `package.json` intentionally has **no** `"type": "module"` so electron-vite
  emits `out/preload/index.js` (CJS) — main loads `../preload/index.js`. ESM preload (`.mjs`) has
  load-order/timing pitfalls; don't reintroduce `"type": "module"`. `postcss.config.js` is CommonJS
  for the same reason.
- **CSP** (`src/renderer/index.html`) allows `'unsafe-eval'` — Mermaid (Architecture view) needs it —
  and `https:`/`http:` `connect-src` for data-source requests + web fonts. It's a local-first app that
  only loads its own bundle; keep the policy as tight as those two needs allow.
- **Native module**: `better-sqlite3` must be rebuilt for Electron's ABI (`postinstall`
  `electron-rebuild`) and shipped unpacked from asar (`build.asarUnpack` in `package.json`).
  **Gotcha:** `npm run package` rebuilds the native binding for each target arch and leaves
  `node_modules/better-sqlite3` on the **last** one (x64), which breaks local `dev`/`smoke` on Apple
  Silicon. Restore with `npx electron-rebuild -f -w better-sqlite3` after packaging.
- **Verify every change** with `npm run lint` + `npm run smoke` + `npm run bootcheck` (and
  `npm run build` before packaging). For data-layer changes, extend `smoke.ts` to cover the new
  fields.
- App icon: `build/icon.svg` → regenerate `icon.icns`/`icon.png` via `npm run icons`.
