# BuildBoard — Roadmap

Source of truth for shipping. BuildBoard grows as an **infinite loop of ~100-feature batches**;
features ship **on demand** (when the maintainer says go), each as its own gated patch release on top
of the existing app. This file is process-only — nothing here renders in the UI.

## The live queue lives in `CLAUDE.md`

The **current batch checklist** (what `/next` ships next, with progress + versions) is maintained in
`CLAUDE.md` → **"Feature shipping — the `/next` loop."** That is the source of truth for what ships.
**This file** holds the shipping **methodology** and the **backlog catalog** that the 75% refill draws
from. Run `/next` (or say "next") to ship the next queued feature end-to-end.

---

## Product principles (every feature obeys these — see `CLAUDE.md`)

1. **What-you-see-is-what-you-export.** Canvas and codegen share one `DesignNode`/`StyleTokens` source
   of truth; never let the visual and the generated Tailwind drift.
2. **Edit once, update everywhere.** Prefer design-system components + tokens over per-node
   duplication; instances render through their definition.
3. **The project is data you own.** New state goes into the typed `Project` model + the normalized
   schema (never an opaque blob), and is covered by `smoke.ts`.
4. **Offline-first, zero-config.** No login/setup to start; network only for what the user asked for.
5. **Additive & zero-regression.** New tables/views/node-types/export paths reusing existing patterns;
   don't alter the core data flow (renderer store → `window.api` → SQLite) except to add capabilities.
6. **Nav stays lean (~5 editor views).** New features become tabs/sections in existing views unless a
   batch explicitly adds a view.

## Execution model — on-demand, user-paced

- Features are **queued**, not auto-run. The next item ships only when the maintainer says so.
- Each shipped feature = the zero-regression checklist below + its own patch release.
- Keep the **ledger** current (checkbox, version, % line).

## Zero-regression checklist (per feature)

- Additive-only diff; new state added to `shared/types.ts` + the normalized schema (`dbCore.ts`) +
  serialize/hydrate (`store.ts`).
- `npm run lint` clean (node + web tsconfigs).
- `npm run smoke` green — extend `smoke.ts` to round-trip any new persisted fields.
- `npm run bootcheck` green — renderer mounts + `window.api` round-trips.
- `npm run build` clean; for release-bound work, `npm run package` boots.
- `CLAUDE.md` updated if any core decision changes; this ledger updated.
- If it can't meet the bar in one sitting, split it — never ship half-tested.

## Rolling roadmap — 75% refill loop (never runs dry)

- The roadmap is an endless series of ~100-feature batches; Batch 1 = the 11 items above + the backlog
  catalog (seeds future batches).
- **At ≥75% of the active batch shipped, WARN the maintainer** and append a fresh, curated batch of
  ~100 new features before the current one is exhausted.
- Every batch upholds the bar: WYSIWYG-export fidelity, edit-once components, own-your-data, offline
  zero-config, additive/zero-regression, genuinely useful, de-duplicated against shipped/queued items,
  balanced across the themes (Design authoring · Design system · Data & logic · Export/ownership ·
  App polish), prioritized (top ~10 surfaced).

## Backlog catalog (the "100s" — seeds future batches; all offline)

**Design authoring (canvas):** multi-select + group/ungroup · align/distribute · snapping &
smart guides · copy/paste across screens · keyboard nudge/resize · responsive breakpoints per screen ·
z-order controls · lock/hide layers · reusable sections · node search in the layers tree · grid &
ruler overlays · undo/redo everywhere.

**Design system:** token import/export · color-scale generator · contrast checker · typography scale ·
spacing scale editor · component variants (props-driven) · component props schema · preview a component
in light/dark side-by-side · usage/insights per definition · orphaned-token cleanup.

**Data & logic:** requests through main (CORS-free) · response caching · pagination/repeater
enhancements · mock/constant sources from schema · bindings preview inline · per-screen primary
source · request history · environment variables for URLs/tokens.

**Export / ownership:** multi-file project export · per-component file export · copy node JSX ·
Tailwind config export from tokens · portable `.bbproj` import/export · project duplicate/backup ·
version snapshots in the DB · "what's stored" inspector.

**Architecture:** more mermaid diagram kinds · derive services from screens/data sources · sequence
templates · export diagram as SVG/PNG (local).

**App polish (desktop):** native menu + shortcuts · recent projects · window state persistence ·
auto-update feed · in-app changelog (from releases) · crash-safe autosave · multi-window.
