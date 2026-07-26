# Reno 3D — Home Designer

Turn a floor plan into an interactive 3D model of your home. Upload a floor plan
image, trace the walls, then furnish, recolour and walk through the space in real
time — all in the browser, with everything saved locally (no account, no backend).

Built for planning a new BTO / HDB flat, but works for any floor plan.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

Start from an **HDB template** (2-room Flexi, 3 / 4 / 5-room, or the 2021+ 4-room
with the household shelter) or **✨ Sample home** to explore a furnished flat
immediately, or follow the workflow below with your own floor plan.

Other scripts: `npm run build` (production build), `npm run preview`.

## Workflow

1. **Trace 2D** — upload your floor plan image.
2. **Set scale** (Scale tool `S`) — draw a line across a known dimension and enter
   its real length in metres. This calibrates everything. _(Required before tracing
   when an image is loaded.)_
3. **Trace walls** (Wall tool `W`) — click corners; walls snap to existing points,
   grid, and right angles. For an exact length, point with the mouse then **type a
   number + Enter**. Enter / double-click to finish, click the start point to close a
   loop. Select a wall to edit its **length/height/thickness** numerically.
4. **Doors & windows** (`D` / `N`) — click on a wall to place an opening.
5. **Rooms** — click **Detect rooms from walls**, or draw floors by hand with the
   Room tool (`R`).
6. **Design 3D** — switch modes (top bar). Walls extrude, room floors fill in.
   **Orbit** to look around or **Walk** (click to lock the mouse, WASD / arrows).
7. **Furnish** — **search** the catalog or browse by category; drag furniture onto the
   floor; drag to move, switch to **Rotate** to spin, hold **Shift** to snap to grid.
   **Arrow keys** nudge the selection (Shift = fine); **Shift-click** to multi-select
   and move a group; **Cmd/Ctrl+D** duplicates. Precise position/rotation/scale live in
   the right panel.
8. **Materials** — select any wall, floor or item and edit its colour / roughness /
   texture on the right. "Apply colour to all walls" repaints the whole home.
9. **View, light & measure** (3D toolbar) — **Dimensions** overlays wall lengths and
   room areas · **Dollhouse** cuts the walls down for a top-down look inside ·
   **Measure** clicks two points for a distance · **Ceilings** and **HQ** (ambient
   occlusion + bloom) toggles · the **time-of-day** slider + **compass** drive the
   sun to real directions (see which rooms get afternoon sun). Doors have a
   **hinge-side** control; openings can be door / window / cased / sliding. HDB
   fixtures (household shelter, gate, bay window, aircon ledge) live under the **HDB**
   catalog category.
10. **Carpentry elevations** — place cabinets, wardrobes or shelving against a wall
    and the right panel lists the **runs** it finds (base and wall units against one
    wall are one drawing, the way a carpenter draws them). Click a run for a
    dimensioned front elevation in millimetres — panel fronts, worktop, hatched
    appliance gaps, per-unit and overall dimension chains, heights above finished
    floor — and its **foot run**, which is what carpentry is quoted per. Download one
    elevation or all of them as a PNG sheet.
11. **Aircon** — drop fan coils and a condenser from the **Aircon** category, then
    **Route trunking**: each fan coil is routed to the nearest condenser with a spare
    port along a right-angled path that hugs a wall, and the casing is drawn in 3D at
    ceiling height so you can see where it actually runs before it's built. The panel
    reports the **System N** size, per-room **BTU sizing** (~650 BTU/m², up a fifth
    for west-facing rooms), pipe-run lengths, and checks for undersized or oversized
    units, too many fan coils for the condenser, over-long pipe runs, a condenser off
    the ledge, and a fan coil blowing straight onto a bed.
12. **Paint, tile & skirting** — quantities straight off the geometry: paintable wall
    area net of doors and windows (bathroom and kitchen walls counted as tile, not
    paint), ceiling area, litres and 5 L pails at your chosen number of coats, floor
    and wall tile in pieces for a 300 × 300 up to 800 × 800 tile with an editable
    wastage allowance, and the skirting run with doorways left out. Walls are
    measured face by face, so one shared between two rooms is split between them.
13. **Budget** — the right panel shows per-room + total floor area with a rough reno
    estimate, plus a **furniture total** and a **shopping-list CSV export** (ballpark
    per-item prices you can replace with real quotes).
14. **Compare layouts** — nobody settles a floor plan first time. **Duplicate as
    variant** (branch icon in the Projects menu) copies a layout as an alternative to
    weigh against the original and opens it ready to rearrange; **Compare** puts the
    family side by side on floor area, reno estimate, furniture, carpentry run, paint
    and tile area, aircon and the number of layout warnings, highlighting the better
    value in each row. You can widen it to every saved home.
15. **Save, share & export** — autosaves to your browser (IndexedDB). From the top
    bar: a printable **PDF spec sheet** (plan + render + carpentry elevations + paint
    and tile takeoff + aircon schedule + budget), a **top-down floor plan PNG** (walls,
    door/window symbols,
    room areas, furniture footprints, dashed aircon trunking, dimensions + scale bar),
    **glTF/.glb** export of the 3D model, a **3D screenshot** (camera icon, in 3D
    view), a **share link** (design without the background image), and `.json`
    import/export.

Installable as a **PWA** (works offline once loaded), and the 2D editor supports
**pinch-zoom / two-finger pan** on touch devices. New to it? The **? Help** button
(top bar) has a guided walkthrough and shortcuts.

**For HDB BTO owners:** mark walls as **structural / can't-hack** in the wall inspector
(shown amber on the plan; warns before you remove one — perimeter walls of the HDB
templates come pre-marked), and open the **HDB renovation checklist** (shield icon) for
a tick-off list of reno rules (permits, no hacking structural walls / the household
shelter, flooring weight, waterproofing, windows, aircon). It's general guidance to
confirm with HDB and a registered contractor — not legal advice.

Two things worth doing before you sign a quote: route the **aircon trunking** (the
casing is permanent and visible, and this is where you find out it crosses the
living room wall), and open the **carpentry elevations** — the foot run there is
directly comparable to what a carpenter quotes, and the drawing is what actually
gets built.

### Keyboard shortcuts

`V` select · `S` scale · `W` wall · `D` door · `N` window · `R` room ·
`Cmd/Ctrl+Z` undo · `Shift+Cmd/Ctrl+Z` redo · `Cmd/Ctrl+D` duplicate ·
`Cmd/Ctrl+C` / `Cmd/Ctrl+V` copy / paste furniture · `Delete` remove selection ·
`Esc` cancel / deselect · Space-drag or right-drag to pan · scroll to zoom.

Paste lands where the camera is looking, so you can copy a chair in one room,
orbit to another and paste it there; repeated pastes step aside instead of piling
up. Copying a multi-selection keeps the group's arrangement, and the clipboard
survives switching projects, so you can lift a furnished corner from one flat
into another.

## How it works

- **Single source of truth:** a `Project` object (`src/types/project.ts`) holds
  walls, openings, rooms and items in **metres**. Both the 2D editor and the 3D
  scene are pure derivations of it, so edits stay in sync.
- **Tracing** (`src/features/trace/`): a Canvas 2D editor. The scale tool sets
  `pxPerMeter` so the background image lines up with real-world metres.
- **3D** (`src/features/scene/`, `src/geometry/`): React Three Fiber. Walls are
  built as solid sub-segments around openings (no CSG); room floors/ceilings are
  triangulated with `THREE.ShapeUtils`. Room auto-detection uses planar-graph face
  traversal and splits walls at T-junctions.
- **Furniture** (`src/features/catalog/`): parametric models (no external assets);
  `.glb` import is supported via `useGLTF`.
- **Checks** (`src/features/checks/`): pure passes over the project that flag
  clashes, items sunk in walls, blocked door swings, tall units with no room to
  open, and pieces that won't fit through the door — plus which way each room's
  glazing faces, and so when it takes sun. Walkway widths are deliberately not
  checked (see the note in `clearance.ts`).
- **Elevations** (`src/features/elevation/`): carpentry items are grouped into wall
  runs by facing direction, back plane and adjacency along the wall (union-find), so
  base and wall units against one wall become one drawing. `elevationDraw.ts`
  renders each run to a canvas as a dimensioned shop drawing.
- **Aircon** (`src/features/aircon/`): fan coils and condensers are ordinary catalog
  items, so they inherit placement, wall snapping and pricing. Trunking is a separate
  polyline per run on the project; routing picks whichever right-angled elbow keeps
  more of the path within 0.45 m of a wall, sampled along the route.
- **Takeoff** (`src/features/takeoff/`): every wall is walked in 5 cm steps and each
  face attributed to the room behind it, so a wall bordering three rooms is split
  between them and an exterior face counts once. Openings subtract their own height
  at the offsets they cover, so a window still leaves wall above and below it.
- **Variants** (`src/features/variants/`): a project's optional `variantOf` points at
  the root of a family of alternatives, kept flat so a variant of a variant shares
  the same root. Comparison is a pure function over each project's metrics.
- **Materials** (`src/features/materials/`): procedural canvas textures (wood, tile,
  marble, carpet, …) so nothing is fetched over the network.
- **Persistence** (`src/features/persistence/`): debounced autosave to IndexedDB
  via `idb-keyval`, plus JSON export/import.

## Stack

Vite · React + TypeScript · React Three Fiber / three.js · @react-three/drei ·
Zustand (+ immer) for state with undo/redo · Tailwind CSS · idb-keyval.
