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

Click **✨ Load sample home** to explore a furnished 2-room flat immediately, or
follow the workflow below with your own floor plan.

Other scripts: `npm run build` (production build), `npm run preview`.

## Workflow

1. **Trace 2D** — upload your floor plan image.
2. **Set scale** (Scale tool `S`) — draw a line across a known dimension and enter
   its real length in metres. This calibrates everything. _(Required before tracing
   when an image is loaded.)_
3. **Trace walls** (Wall tool `W`) — click corners; walls snap to existing points,
   grid, and right angles. Enter / double-click to finish, click the start point to
   close a loop.
4. **Doors & windows** (`D` / `N`) — click on a wall to place an opening.
5. **Rooms** — click **Detect rooms from walls**, or draw floors by hand with the
   Room tool (`R`).
6. **Design 3D** — switch modes (top bar). Walls extrude, room floors fill in.
   **Orbit** to look around or **Walk** (click to lock the mouse, WASD / arrows).
7. **Furnish** — drag furniture from the left catalog onto the floor; drag to move,
   switch to **Rotate** to spin, hold **Shift** to snap to grid. The catalog spans
   Living, Bedroom, Kitchen, Dining, Bathroom, Office and Decor.
8. **Materials** — select any wall, floor or item and edit its colour / roughness /
   texture on the right. "Apply colour to all walls" repaints the whole home.
9. **Measure** — toggle **Dimensions** (ruler icon, 3D view) to overlay every wall
   length and each room's size + area in the scene.
10. **Save / share** — autosaves to your browser (IndexedDB). From the top bar:
    export/import `.json`, export a **top-down floor plan PNG** (map icon: walls,
    door/window symbols, room areas, furniture footprints, dimensions + scale bar),
    or capture a **3D screenshot** (camera icon, in 3D view).

### Keyboard shortcuts

`V` select · `S` scale · `W` wall · `D` door · `N` window · `R` room ·
`Cmd/Ctrl+Z` undo · `Shift+Cmd/Ctrl+Z` redo · `Delete` remove selection · `Esc`
cancel / deselect · Space-drag or right-drag to pan · scroll to zoom.

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
- **Materials** (`src/features/materials/`): procedural canvas textures (wood, tile,
  marble, carpet, …) so nothing is fetched over the network.
- **Persistence** (`src/features/persistence/`): debounced autosave to IndexedDB
  via `idb-keyval`, plus JSON export/import.

## Stack

Vite · React + TypeScript · React Three Fiber / three.js · @react-three/drei ·
Zustand (+ immer) for state with undo/redo · Tailwind CSS · idb-keyval.
