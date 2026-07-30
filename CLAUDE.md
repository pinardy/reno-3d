# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-only 3D home designer for planning an HDB/BTO renovation: upload a floor
plan image, trace walls, then furnish and walk through the result. No backend, no
accounts — everything lives in IndexedDB and the URL. Deployed to GitHub Pages.

## Commands

```bash
npm run dev                      # Vite dev server on :5173
npm run build                    # tsc -b && vite build
npm run lint                     # oxlint
npm test                         # vitest run
npm run test:watch

npx tsc -b                       # typecheck alone (covers src AND src/__tests__)
npx vitest run src/__tests__/aircon.test.ts        # one file
npx vitest run -t 'routes at right angles'         # one test by name
```

CI (`.github/workflows/ci.yml`) runs typecheck → lint → test → build on every push
and PR, so all four must pass. `VITE_BASE` overrides the GitHub Pages base path
(`/reno-3d/`) if you need to serve from root.

### Commit messages are linted

A husky `commit-msg` hook runs commitlint against Conventional Commits, so a
message like `added some stuff` is rejected at commit time. Use
`feat|fix|docs|perf|refactor|test|build|ci|chore|style|revert: subject`, subject in
lower case (an opening acronym like HDB is fine), no trailing full stop, and keep
lines under 100 characters.

The hook is installed by `npm install` via the `prepare` script — `.husky/_/` is
generated and gitignored, so a fresh clone has no hooks until dependencies are
installed. `git commit --no-verify` bypasses it, and `HUSKY=0` disables husky for a
whole shell. Config lives in `commitlint.config.js`; the only rule overridden is
`subject-case`, and the comment there explains why.

## Architecture

### One source of truth, in metres

`src/types/project.ts` defines `Project` — walls, openings, rooms, items, plus
optional plan/aircon state. **Every coordinate is metres**, Y is up, and the 2D plan
lives on the X/Z ground plane. Both the 2D tracing editor (`features/trace/`, Canvas
2D) and the 3D scene (`features/scene/`, React Three Fiber) are pure derivations of
this object — never a second copy of the truth.

### The rotationY convention

The single most important invariant, and the easiest thing to get silently wrong.
Rotating by `rotationY` sends:

- local **+z** (an item's **front**) to world `(sin θ, cos θ)`
- local **+x** (its **width**) to world `(cos θ, −sin θ)`

Standing in front of a run looking at it, that width axis points to the viewer's
right. This is documented on `Rect` in `src/geometry/rect.ts` and relied on by
`snapCabinetToWall` (`features/scene/collision.ts`), the canvas floor plan
(`ctx.rotate(-rotationY)`), and `frontAxis`/`widthAxis` in `features/elevation/`.
Derive from these helpers rather than re-deriving the trigonometry; a sign error
here produces footprints that look plausible but don't match what renders.

### Store: three mutators, not one

`src/store/store.ts` is Zustand + Immer with hand-rolled undo/redo (`past`/`future`
arrays of whole `Project` snapshots, capped at 60). Which mutator you pick decides
whether the user's undo history stays usable:

- `commit(recipe)` — one discrete edit, pushes an undo step. Default choice.
- `update(recipe)` — mutates with **no** history entry. For continuous input:
  pointer drags, sliders, number-input typing.
- `checkpoint()` / `pushPast(prev)` — bracket a continuous gesture with a single
  undo step. Call `checkpoint()` on focus/pointer-down, then `update()` throughout.

Committing per keystroke or per pointermove burns the history limit and evicts real
work — see the `renameProject` comment for the incident that motivated this.

`storeApi` at the bottom of the file holds the entity helpers (`addItem`,
`duplicateRoom`, `autoRouteTrunking`, …) as thin wrappers over these.

### Schema evolution

New `Project` fields must be **optional**, and `migrateProject`
(`features/persistence/io.ts`) normalizes anything old or partial on load. Every
entry point funnels through it: IndexedDB restore, `.json` import, and share links.
Don't add non-optional fields — saved projects and shared links predate them.
`views`, `aircon` and `variantOf` are all optional for this reason.

Also check `stripHeavy` in `features/persistence/share.ts` when adding a field: a
share link crosses to another machine, so anything referring to local state (an
imported `.glb` blob URL, a `variantOf` pointing at a project id that only exists
in the sender's IndexedDB) has to be dropped rather than shipped dangling.

### Persistence and sharing

- Autosave: debounced 400ms to IndexedDB via `idb-keyval`, **gated until the initial
  restore completes** so the empty bootstrap project can't clobber real work.
  Flushes on tab hide/unload. See `features/persistence/autosave.ts`.
- Share links: whole project gzipped + base64url into the URL fragment (`#s=…`),
  with the background image and imported `.glb` URLs stripped as too large. Handy
  for reproducing a specific project state when driving the app in a browser.

### Feature folders: pure logic + a panel

`features/checks/`, `features/aircon/`, `features/elevation/`, `features/takeoff/`
and `features/variants/` each pair pure `.ts` analysis with a `*Panel.tsx` (or
modal). Keep the analysis pure and side-effect free — that's what makes it
unit-testable and cheap to recompute under `useMemo` on every project change.

Two of these sample geometry rather than solving it exactly, which is a deliberate
tradeoff to know about before "fixing" a number that looks slightly off:

- **Takeoff** walks each wall in 5 cm steps and probes 25 cm off each face for the
  room behind it. That's what lets one wall bordering three rooms be split between
  them, and what makes areas follow the **inner face** perimeter (a 4×3 m box of
  100 mm walls gives 13.6 m of wall, not 14 m — the centreline would double-count
  every corner). Openings subtract their own height at the offsets they cover, so a
  window leaves wall above and below.
- **Trunking routing** scores candidate elbows by sampling along the route.

**Panels mount in two places.** `app/RightPanel.tsx` (desktop) and
`app/MobilePanels.tsx` (below 900px) both compose the same panel list. Adding a
panel to only one is the standard mistake.

### 3D specifics

- Walls are built as solid box pieces around openings (`geometry/walls.ts`) — no
  CSG. Floors/ceilings are triangulated with `THREE.ShapeUtils`.
- The `homeRef` group in `features/scene/SceneRoot.tsx` is exactly what glTF export
  captures. Geometry that should be exported has to live inside it; overlays
  (dimension labels, measure tool) deliberately don't.
- `features/scene/Effects.tsx` is lazy-loaded — postprocessing + AO is ~820KB and
  starts off on small screens. `DesignView` is itself lazy so the initial 2D bundle
  stays small.
- Items are memoized per item; Immer preserving unchanged references is what keeps
  a drag from re-rendering the whole scene.
- Textures (`features/materials/`) are procedurally drawn to canvas — nothing is
  fetched over the network. Cloned textures are cached by `(id, repeatX, repeatY)`
  so meshes share GPU textures.

### Adding a new ItemKind

Touching one file isn't enough. The full set:

1. `types/project.ts` — add to the `ItemKind` union.
2. `features/catalog/catalog.ts` — `PRICE_BY_KIND` is an **exhaustive**
   `Record<ItemKind, number>`, so this won't compile until you add it. Then add the
   catalog entries themselves.
3. `features/catalog/models/*.tsx` — the parametric model, re-exported via
   `models/index.ts`.
4. `features/catalog/FurnitureModel.tsx` — a `case` in the dispatch switch.
5. `src/__tests__/catalog.test.ts` — the `HANDLED` set; a guard test fails if a
   catalog kind has no render case.
6. Optionally `WALL_SNAP_KINDS` (`features/scene/collision.ts`) for wall-hugging
   pieces, `KIND_ICON` (`CatalogPanel.tsx`), and the clearance sets in
   `features/checks/clearance.ts`.

## Testing

`vitest.config.ts` uses the **node** environment and only picks up
`src/**/*.test.ts` — pure logic, no DOM and no WebGL. That is a deliberate
constraint, not an oversight: it keeps the suite fast, and the geometry and analysis
layers are written to be testable without a browser.

The consequence is that **canvas-drawing code is not unit-testable here** —
`persistence/floorplanExport.ts`, `elevation/elevationDraw.ts` and the 3D components
have no coverage. Verify those by running the app and looking at the output. The
share-link mechanism above is the easiest way to load a known project state into a
headless browser without clicking through the UI.

Tests live in `src/__tests__/` (excluded from `tsconfig.app.json`, covered by
`tsconfig.test.json`, so `tsc -b` typechecks both).

## Style

- oxlint is the **only** linter and there is no formatter — style is hand-maintained.
  Don't propose ESLint, Prettier, or a repo-wide reformat; both were declined.
- No semicolons, single quotes, ~90–100 columns. Match the surrounding file.
- `noUnusedLocals` and `noUnusedParameters` are on, so dead locals break the build.
- Comments in this codebase explain *why* a constraint exists, often naming the bug
  or user-facing consequence that motivated it (see `clearance.ts` on why walkway
  widths are deliberately not checked). Match that register — don't narrate what the
  next line does.

## Domain notes

The HDB/BTO framing is load-bearing, not decoration: walls carry a `structural`
flag that blocks hacking, the catalog has an HDB fixtures category (household
shelter, aircon ledge, bay window), aircon is modelled as a Singapore "System N"
(one condenser driving N fan coils) with BTU sizing at ~650 BTU/m², and carpentry
elevations report a **foot run**, which is the unit Singapore carpenters quote in.
The takeoff counts bathroom and kitchen walls as **tile rather than paint**, because
that's how an HDB flat is actually finished and how the two line items are quoted —
`WET_ROOM` in `takeoff.ts` is a separate list from the aircon module's
`UNCONDITIONED_NAME` on purpose (a store room is unconditioned but painted).
`app/HdbRulesPanel.tsx` is general guidance to confirm with HDB — deliberately
hedged, not legal advice. Keep that hedging when touching it.

The templates in `features/sample/templates.ts` are named "(approx)" and mean it.
`FlatBuilder`'s room sets **leave a piece out rather than draw it overlapping** when
it won't fit with its clearances — the 2-room Flexi has no dining table for exactly
this reason. `templates.test.ts` asserts every shipped layout passes `findIssues`
with zero warnings, so a new template with a clash fails the suite; fix the layout,
don't relax the test.
