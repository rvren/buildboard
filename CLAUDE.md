# CLAUDE.md — BuildBoard

Guidance for working in this repo. BuildBoard is a **local-first design-to-code studio** desktop app
(Electron + React) **for product designers**: design **applications and websites** on an infinite
canvas — with a themed design system, live data, and architecture sketches — then **export them into
real, production code** (clean React + Tailwind). What you design **is** what ships: no redraw, no
handoff, no drift between the mockup and the codebase. Everything runs on-device; projects live in a
local SQLite database.

**Who it's for & the job it does:** a product designer opens BuildBoard, lays out the screens/pages of
an app or site, wires real data and a reusable design system, and walks away with a working React +
Tailwind codebase — not a static comp to be re-implemented by an engineer. Every feature should move a
designer closer to *shippable code from their design*.

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
`electron-builder --publish never` → attach `dist/*.dmg` + `*.zip` for arm64 + x64 to a **published**
GitHub Release via `softprops/action-gh-release`, `fail_on_unmatched_files` so it can never ship empty).
Repo: `rvren/buildboard`. The website reads `releases/latest`, so a new tag's installers list
automatically.

## Feature shipping — the `/next` loop

Features ship **on demand, one at a time**: run **`/next`** (or just say "next") and the next queued
feature below is built end-to-end, verified, ticked off, and committed as its own patch. **This
checklist is the source of truth for what ships next** — `ROADMAP.md` holds the methodology + the
backlog catalog that refills it.

**Every ship must:** stay additive / zero-regression (new node types · views · DB tables · export
paths, reusing existing patterns; never alter renderer → `window.api` → SQLite except to add
capability); extend the typed model (`shared/types.ts`) + schema (`dbCore.ts`) + serialize/hydrate
(`store.ts`) for any new persisted state and cover it in `smoke.ts`; pass `npm run lint` +
`npm run smoke` + `npm run bootcheck` + `npm run build`; then tick its box (with the version), bump the
patch version in `package.json`, and commit.

**75% refill (never runs dry):** when ≥75% of the current batch is shipped, append a fresh ~10-item
batch to this list — curated from the `ROADMAP.md` backlog, de-duped against everything already
shipped — and tell the maintainer the queue was refilled.

### Current batch — Batch 1 · shipped 11 / 11 (100%) 🎉
Curated for the designer → real-code job (apps **and** websites): richer canvas design, a stronger
design system, and higher-fidelity code export.
- [x] **0** — Desktop conversion (Electron + normalized SQLite) → `v0.1.0`
- [x] **1** — Local project search & filter on the dashboard → `v0.1.1`
- [x] **2** — Undo / redo (in-editor history) + autosave persistence → `v0.1.2`
      _(restorable DB version-timeline stays in the backlog: "version snapshots in the DB")_
- [x] **3** — Responsive breakpoints (per-node sm/md/lg overrides) → responsive Tailwind export → `v0.1.3`
- [x] **4** — Design-system component variants (named style variants, per-instance, exported) → `v0.1.4`
      _(also fixed instance overrides not exporting; prop-driven conditional variants remain a future extension)_
- [x] **5** — Design tokens import / export (JSON round-trip + copy CSS variables) → `v0.1.5`
- [x] **6** — Per-page metadata (title/path/description) → exported `export const metadata` → `v0.1.6`
      _(cross-page links already exist via the Button navigate action; a dedicated nav component stays in the backlog)_
      Canvas UX is the app's core; the maintainer flagged all four areas below as unintuitive, so the
      rest of Batch 1 focuses there (export-polish · assets · usage-insights moved to the backlog).
- [x] **7** — Canvas navigation: real fit-to-screen + auto-fit on entry, click-% → 100%, ⌘0/⌘=/⌘- shortcuts → `v0.1.7`
      _(space-drag pan + wheel zoom-to-cursor already existed)_
- [x] **8** — Getting started: guided empty-state overlay + 4 one-click starter layouts → `v0.1.8`
- [x] **9** — Adding & placing: drop-target fill + droppable-zone outlines while dragging, live empty-hint → `v0.1.10`
- [x] **10** — Select · move · nest: clickable ancestor breadcrumb + Esc-selects-parent → `v0.1.11`
      _(multi-select + snapping/smart-guides remain in the backlog)_

### Next batch — Batch 2 (refill; queued after Batch 1 #9–#10)
- [x] **Interactive preview** — single-screen click-through prototype (navigate actions walk pages) → `v0.1.15` (sticky)
- [x] **AI generate-from-prompt** — BYO Anthropic key (OS keychain via safeStorage), prompt → validated DesignNode[] → canvas; desktop-only → `v0.1.18` (flagship sticky)
> ⚠️ **75% refill fired** at Batch 1 = 9/11 (82%). Curated ~10, de-duped against everything shipped,
> balanced across the themes and anchored to the vision (designers → apps/websites → real code).
- [x] **B2-1** — Layers panel: inline rename (dbl-click) + hide/show toggle (persisted) + reorder → `v0.1.12`
- [x] **B2-2** — Copy / cut / paste nodes across screens (⌘C/⌘X/⌘V, app clipboard) → `v0.1.13`
- [x] **B2-3** — Link primitive (<a href>, editable text/href, exported) + Navbar starter uses it → `v0.1.14`
- [x] **B2-4** — Device-width presets → covered by the breakpoint switcher (resizes the active artboard sm/md/lg); per-screen device sizing deferred
- [x] **B2-5** — Production export: per-component files + Tailwind/globals/package.json scaffold + Copy JSX → `v0.1.17`
- [x] **B2-6** — Image upload → data URI (PNG/JPG/SVG/WebP/GIF, ≤2 MB) w/ thumbnail; self-contained so it bundles on export → `v0.1.20`
- [x] **B2-7** — Component usage insights: per-component "N× · M screens" (or "Unused") badge in the components manager → `v0.1.21`
- [x] **B2-8** — WCAG contrast checker in the tokens editor: live AA/AAA grade + ratio per fg/bg token pair (per active mode) → `v0.1.22`
- [x] **B2-9** — Shortcuts cheatsheet (press `?`) + 7 new command-palette actions (views, add screen, shortcuts, theme toggle) → `v0.1.23`
- [x] **B2-10** — Dashboard "Start from" templates (Blank · Landing · Sign-up · Catalog) — composes existing STARTERS into a seeded first screen → `v0.1.24`

### Next batch — Batch 3 (refill; Batch 2 = 10/10 → 75% refill fired)
> Curated de-duped against everything shipped, balanced across the themes and anchored to the vision
> (designers → apps/websites → real, accessible code). Screen ops + selection ergonomics + a11y.
- [x] **B3-1** — Accessibility audit panel: walks the tree, flags missing alt text, empty headings/buttons/links, link-without-href, heading-level skips → `v0.1.25`
- [x] **B3-2** — Duplicate screen (deep-clone with fresh ids) from the screen switcher → `v0.1.26`
- [x] **B3-3** — Reorder screens (move left/right) in the screen switcher → `v0.1.27`
- [x] **B3-4** — Theme preset gallery: apply a curated light+dark palette to the design system in one click → `v0.1.28`
- [x] **B3-5** — Wrap selection in a Container ("Group", ⌘G) → `v0.1.29`
- [x] **B3-6** — Multi-select on canvas (shift-click) + bulk delete → `v0.1.31` _(bulk move deferred: flow layout has no free positioning)_
- [x] **B3-7** — Component content slots: override a definition's descendant text (Heading/Button/Link…) per-instance, resolved in renderer + codegen → `v0.1.32`
- [x] **B3-8** — One-click Next.js (App Router) scaffold export: app/<route>/page.tsx per screen + layout, globals/tokens, components, next/tailwind/tsconfig → `v0.1.33`
- [x] **B3-9** — Reshaped: keyboard reorder of the selected node among siblings (⌘↑/⌘↓) → `v0.1.34` _(pixel snapping/smart-guides N/A: flow layout + auto-positioned artboards, not free positioning)_
- [x] **B3-10** — Per-project favicon + theme-color (Overview settings; new v6 `projects.meta` column) → exported PWA manifest + Next `<head>` metadata → `v0.1.35`

### Next batch — Batch 4 (refill; Batch 3 = 10/10 → 75% refill fired)
> Curated de-duped against everything shipped, balanced across themes and anchored to the vision
> (designers → apps/websites → real, accessible code). Completes selection/design-system/export threads.
- [x] **B4-1** — Bulk move/nest: dragging one of a multi-selection moves every selected node into the target container → `v0.1.42`
- [x] **B4-2** — Per-node ARIA authoring (aria-label / role) in Properties → exported as aria-label/role attrs → `v0.1.36`
- [x] **B4-3** — Exported component files take typed React props for their text (default = the design text) → `v0.1.41`
- [x] **B4-4** — One-click Vite + React Router (SPA) scaffold export: src/pages per screen + App.tsx route table, main.tsx, config → `v0.1.40`
- [x] **B4-5** — Reshaped: heading (display) font token — separate font for headings, wired canvas + codegen + export (schema v7) → `v0.1.44` _(custom spacing/type scales deferred: would drift canvas vs. export)_
- [x] **B4-6** — Left "Pages" panel: screen thumbnails + select/rename/reorder/duplicate/delete → `v0.1.43`
- [x] **B4-7** — Global find & replace of text across all screens + components (case option, live match count) → `v0.1.38`
- [x] **B4-8** — Quick-insert palette (⌘/): type a node name → inserts at the selection (into container, else parent, else root) → `v0.1.39`
- [x] **B4-9** — DB version snapshots: save/restore/delete a per-project timeline (new `project_snapshots` table, no-cascade; works web + desktop) → `v0.1.45`
- [x] **B4-10** — One-click alignment presets (left/center/right/space-between) that set up flexbox for you → `v0.1.37`

### Next batch — Batch 5 (refill; Batch 4 = 10/10 → 75% refill fired)
> Curated de-duped against everything shipped, balanced across themes and anchored to the vision
> (designers → apps/websites → real, accessible code). New node types + export targets + safety.
- [x] **B5-1** — Icon node: searchable lucide-icon primitive (69 curated icons), rendered on canvas + exported as a real lucide import → `v0.1.47`
- [x] **B5-2** — Component library export/import as JSON (fresh id remap on import) — share components between projects → `v0.1.49`
- [x] **B5-3** — Static HTML export: one self-contained .html per screen (rendered from the canvas tree via renderToStaticMarkup) + index → `v0.1.48`
- [x] **B5-4** — Reshaped: per-node opacity style (canvas + export, shared class map) → `v0.1.50` _(shadow scale already exists per-node; custom var-based shadow scales deferred — would risk the core style mapping)_
- [x] **B5-5** — Per-node conditional visibility (`visibleIf` binding, schema v8): hidden in preview + wrapped in `{cond && (…)}` on export → `v0.1.51`
- [x] **B5-6** — Reshaped: live selection dimensions badge (measured W×H in design px, zoom-aware) on the canvas → `v0.1.54` _(rulers deferred — pan/zoom overlay complexity)_
- [x] **B5-7** — Duplicate project from the dashboard (deep-clone with instance/def id remap) — already shipped (store `duplicateProject` + ProjectCard menu); verified
- [x] **B5-8** — Side-by-side responsive preview: the active screen at sm/md/lg at once (breakpoint-aware StaticNode) → `v0.1.52`
- [x] **B5-9** — Auto-snapshot ("Before restore") the live project before every restore, so a restore is itself undoable → `v0.1.46` _(interval snapshots deferred)_
- [x] **B5-10** — Reshaped: focus-order (tab order) list for the current screen — numbered, click-to-select → `v0.1.53` _(canvas overlay → list to avoid pan/zoom positioning fragility)_

### Next batch — Batch 6 (refill; Batch 5 = 10/10 → 75% refill fired)
> Curated de-duped against everything shipped, balanced across themes and anchored to the vision
> (designers → apps/websites → real, accessible code). New node types + interactions + portability.
- [x] **B6-1** — Project export/import as a single `.buildboard.json` file (fresh-id deep clone on import) → `v0.1.55`
- [x] **B6-2** — Table node: editable headers + cell grid, rendered + exported as a real `<table>` → `v0.1.62` _(data-bound rows deferred: needs data-context plumbing in the core renderer)_
- [x] **B6-3** — Per-node hover effect preset (lift/grow/darken/glow) → literal `hover:` Tailwind classes (native on canvas + exported) → `v0.1.60`
- [ ] **B6-4** — Canvas minimap for quick navigation of a busy board (canvas UX)
- [x] **B6-5** — Breakpoint-specific visibility: "Hidden" toggle per active breakpoint → `display:none` → responsive `hidden` (e.g. `sm:hidden`) on export → `v0.1.57`
- [x] **B6-6** — Mock-data generator: "Generate sample" fills a constant source with realistic rows (name-aware, from the schema) → `v0.1.61`
- [x] **B6-7** — Node lock (schema v9): a Layers-panel lock toggle disables dragging/moving the node → `v0.1.59`
- [x] **B6-8** — Reshaped: built-in animation presets (spin/ping/pulse/bounce) → `animate-*` classes (canvas + export) → `v0.1.60` _(custom fade/slide keyframes deferred: need CSS beyond Tailwind built-ins)_
- [x] **B6-9** — Color-blindness simulation (protan/deutan/tritan/grayscale) via SVG filters over the canvas, from the command palette → `v0.1.58`
- [x] **B6-10** — Keyboard canvas navigation: ←/→ select parent/first-child, ↑/↓ select prev/next sibling → `v0.1.56`

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

## One codebase, two targets (web + desktop)

`src/renderer/src` is the **single** app, built for both:
- **Desktop** — `electron-vite` bundles it into the Electron shell; persistence goes through
  `window.api` → SQLite. Build/run: `npm run dev` / `build` / `package`.
- **Web** — `npm run build:web` (plain Vite, `vite.web.config.ts`, base `/buildboard/app/`, output
  `dist-web`) builds the **same** renderer for the browser; persistence falls back to `localStorage`.
  Deployed by `.github/workflows/pages.yml` to `rvren.github.io/buildboard/app/` (the marketing landing
  stays at `/buildboard/`, static `site/`).

The only thing that differs is persistence: **`lib/persistence.ts`** defines one `Persistence`
interface with an Electron adapter (`window.api`) and a `localStorage` adapter, chosen at runtime by
whether `window.api` exists (`isDesktop`). The store (`editorStore.ts` persistence section) and
`theme.ts` talk only to `persistence.*` — never `window.api` directly — so both targets share every
feature and never drift. `public/theme-boot.js` is the no-flash theme bootstrap for both (same-origin
so the strict CSP allows it). Note: the web target has `localStorage`'s ~5 MB limit and no SQL
migrations (it stores the same `Project` JSON; `normalizeTokens`/`hydrateProject` backfill).

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
