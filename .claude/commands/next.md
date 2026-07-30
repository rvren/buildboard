---
description: Ship the next queued BuildBoard feature (the roadmap /next loop)
argument-hint: "[optional: feature number or name to ship instead of the next one]"
---

Ship the next roadmap feature end-to-end. Follow this exactly; do not skip verification.

## 1. Pick the feature
- Read the **"Current batch"** checklist in `CLAUDE.md` ("Feature shipping — the `/next` loop").
- Target = the **first unchecked `- [ ]` item**. If `$ARGUMENTS` names a number or feature, ship that
  item instead.
- If **every** item is checked, skip to step 6 (refill) and stop.
- State in one line: the feature, and the files you expect to touch.

## 2. Respect the doctrine (from `CLAUDE.md` + `ROADMAP.md`)
- **Additive & zero-regression.** New node types / views / DB tables / export paths, reusing existing
  patterns. Never alter the core data flow (renderer store → `window.api` → SQLite) except to add a
  capability. Risky work goes behind a flag.
- **WYSIWYG-export fidelity** and **edit-once components** stay intact — canvas and codegen read the
  one `DesignNode`/`StyleTokens` source of truth.
- **Any new persisted state** is added to the typed model (`src/shared/types.ts`) **and** the schema
  (`src/main/dbCore.ts`) **and** serialize/hydrate (`src/main/store.ts`) — never an opaque blob — and
  **covered in `src/main/smoke.ts`**.

## 3. Build it
Implement the feature, matching the surrounding code's conventions.

## 4. Verify — all four must pass (fix red before continuing)
```bash
npm run lint
npm run smoke
npm run bootcheck
npm run build
```

## 5. Record & commit
- Tick the item in `CLAUDE.md`: `- [x] **N** — … → \`vX.Y.Z\`` (the next patch version).
- Bump the patch `version` in `package.json`.
- Update the batch progress line (`shipped X / N (P%)`).
- Commit everything together with a clear message. Do **not** push or tag unless asked — a release is
  cut separately by pushing a `v*` tag (the release workflow attaches the installers).

## 6. Refill at 75%
After ticking, compute the batch progress. If **≥ 75%** of the current batch is shipped, append a
fresh **~10-item** batch to the "Current batch" list in `CLAUDE.md`, curated from the backlog catalog
in `ROADMAP.md`, de-duped against everything already shipped, balanced across the themes (Design
authoring · Design system · Data & logic · Export/ownership · App polish). Tell the maintainer the
queue was refilled.

## 7. Report
Say what shipped, the new version, and the batch progress (e.g. "shipped 2/11 · 18%").
