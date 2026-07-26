import { create } from 'zustand'
import { produce } from 'immer'
import { nanoid } from 'nanoid'
import {
  type Project,
  type Selection,
  type CameraMode,
  type Wall,
  type Opening,
  type Room,
  type Item,
  emptyProject,
  emptyAirconPlan,
} from '../types/project'
import { pointInPolygon } from '../geometry/vec'
import { autoRoute, elbowOfRun, routeTrunking, pruneRuns } from '../features/aircon/aircon'
import { clearForItems } from '../features/catalog/placement'
import { getFocusPoint } from '../features/scene/focus'

export type EditorMode = 'trace' | 'design'
export type TraceTool = 'select' | 'scale' | 'wall' | 'door' | 'window' | 'room'

const HISTORY_LIMIT = 60

interface AppState {
  project: Project
  past: Project[]
  future: Project[]

  editorMode: EditorMode
  tool: TraceTool
  selection: Selection
  cameraMode: CameraMode
  saveState: 'idle' | 'saving' | 'saved'
  helpOpen: boolean
  hdbOpen: boolean
  compareOpen: boolean

  setSaveState: (s: 'idle' | 'saving' | 'saved') => void
  setHelpOpen: (v: boolean) => void
  setHdbOpen: (v: boolean) => void
  setCompareOpen: (v: boolean) => void

  // ----- meta / mode -----
  setEditorMode: (m: EditorMode) => void
  setTool: (t: TraceTool) => void
  setCameraMode: (m: CameraMode) => void
  select: (sel: Selection) => void
  clearSelection: () => void
  selectedItemIds: string[] // multi-selection of furniture
  toggleItem: (id: string) => void // shift-click add/remove
  // Copy/paste buffer for furniture. Deliberately not part of `project`: it is
  // session scratch, so it neither autosaves nor lands in a share link, and it
  // survives switching projects (paste a sofa from one flat into another).
  clipboard: Omit<Item, 'id'>[]

  // ----- project-level -----
  loadProject: (p: Project) => void
  newProject: () => void
  renameProject: (name: string) => void

  // ----- history -----
  commit: (recipe: (p: Project) => void) => void // pushes undo
  update: (recipe: (p: Project) => void) => void // no history (transient, e.g. drag)
  pushPast: (prev: Project) => void // push a captured snapshot as an undo step
  checkpoint: () => void // snapshot current state as one undo step (call before an update gesture)
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

function withStamp(p: Project): Project {
  return produce(p, (d) => {
    d.updatedAt = Date.now()
  })
}

export const useStore = create<AppState>((set, get) => ({
  project: emptyProject(nanoid()),
  past: [],
  future: [],

  editorMode: 'trace',
  tool: 'select',
  selection: { type: null, id: null },
  selectedItemIds: [],
  clipboard: [],
  cameraMode: 'orbit',
  saveState: 'idle',
  helpOpen: false,
  hdbOpen: false,
  compareOpen: false,

  setSaveState: (s) => set({ saveState: s }),
  setHelpOpen: (v) => set({ helpOpen: v }),
  setHdbOpen: (v) => set({ hdbOpen: v }),
  setCompareOpen: (v) => set({ compareOpen: v }),

  setEditorMode: (m) => set({ editorMode: m }),
  setTool: (t) =>
    set({ tool: t, selection: { type: null, id: null }, selectedItemIds: [] }),
  setCameraMode: (m) => set({ cameraMode: m }),
  select: (sel) =>
    set({
      selection: sel,
      selectedItemIds: sel.type === 'item' && sel.id ? [sel.id] : [],
    }),
  clearSelection: () =>
    set({ selection: { type: null, id: null }, selectedItemIds: [] }),
  toggleItem: (id) =>
    set((state) => {
      const has = state.selectedItemIds.includes(id)
      const ids = has
        ? state.selectedItemIds.filter((x) => x !== id)
        : [...state.selectedItemIds, id]
      return {
        selectedItemIds: ids,
        selection: ids.length
          ? { type: 'item', id: ids[ids.length - 1] }
          : { type: null, id: null },
      }
    }),

  loadProject: (p) =>
    set({
      project: p,
      past: [],
      future: [],
      selection: { type: null, id: null },
      selectedItemIds: [],
    }),
  newProject: () =>
    set({
      project: emptyProject(nanoid()),
      past: [],
      future: [],
      selection: { type: null, id: null },
      selectedItemIds: [],
      tool: 'select',
      editorMode: 'trace',
    }),
  // Renaming is one gesture, not one edit per character — committing per
  // keystroke used to spend a 20-name's worth of the history limit and evict
  // real work. The name field takes a checkpoint when it gains focus, so this
  // only has to apply the change (still stamped, so the projects list reorders).
  renameProject: (name) =>
    set((state) => ({
      project: withStamp(
        produce(state.project, (p) => {
          p.name = name
        }),
      ),
    })),

  commit: (recipe) =>
    set((state) => {
      const next = withStamp(produce(state.project, recipe))
      return {
        project: next,
        past: [...state.past, state.project].slice(-HISTORY_LIMIT),
        future: [],
      }
    }),

  update: (recipe) =>
    set((state) => ({ project: produce(state.project, recipe) })),

  pushPast: (prev) =>
    set((state) => ({
      past: [...state.past, prev].slice(-HISTORY_LIMIT),
      future: [],
    })),

  checkpoint: () =>
    set((state) => ({
      past: [...state.past, state.project].slice(-HISTORY_LIMIT),
      future: [],
    })),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        project: previous,
        past: state.past.slice(0, -1),
        future: [state.project, ...state.future].slice(0, HISTORY_LIMIT),
      }
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state
      const next = state.future[0]
      return {
        project: next,
        past: [...state.past, state.project].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
      }
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}))

// ---- convenient entity helpers (thin wrappers over commit) ----------------

export const storeApi = {
  addWall(w: Omit<Wall, 'id'>): string {
    const id = nanoid()
    useStore.getState().commit((p) => {
      p.walls.push({ ...w, id })
    })
    return id
  },
  addOpening(o: Omit<Opening, 'id'>): string {
    const id = nanoid()
    useStore.getState().commit((p) => {
      p.openings.push({ ...o, id })
    })
    return id
  },
  addRoom(r: Omit<Room, 'id'>): string {
    const id = nanoid()
    useStore.getState().commit((p) => {
      p.rooms.push({ ...r, id })
    })
    return id
  },
  addView(name: string, pose: { pos: [number, number, number]; target: [number, number, number] }) {
    const id = nanoid()
    useStore.getState().commit((p) => {
      p.views = [...(p.views ?? []), { id, name, ...pose }]
    })
    return id
  },
  removeView(id: string) {
    useStore.getState().commit((p) => {
      p.views = (p.views ?? []).filter((v) => v.id !== id)
    })
  },
  addItem(it: Omit<Item, 'id'>): string {
    const id = nanoid()
    useStore.getState().commit((p) => {
      p.items.push({ ...it, id })
    })
    return id
  },
  // Drop a whole furniture set (or any batch) in one undo step, and leave them
  // all selected so the group can be nudged into place immediately.
  addItems(its: Omit<Item, 'id'>[]): string[] {
    if (!its.length) return []
    const ids = its.map(() => nanoid())
    useStore.getState().commit((p) => {
      its.forEach((it, i) => p.items.push({ ...it, id: ids[i] }))
    })
    useStore.setState({
      selectedItemIds: ids,
      selection: { type: 'item', id: ids[ids.length - 1] },
    })
    return ids
  },
  // Copy a room's floor plus the furniture standing on it, offset a little so the
  // copy is visible and grabbable. Walls are left alone — they're shared edges,
  // not owned by one room, so cloning them would double every partition.
  duplicateRoom(id: string) {
    const st = useStore.getState()
    const room = st.project.rooms.find((r) => r.id === id)
    if (!room) return
    const OFF = 0.5
    const inside = st.project.items.filter((it) => pointInPolygon(it.position, room.loop))
    const newRoomId = nanoid()
    st.commit((p) => {
      p.rooms.push({
        ...room,
        id: newRoomId,
        name: `${room.name} copy`,
        loop: room.loop.map((v) => ({ x: v.x + OFF, z: v.z + OFF })),
        floorMaterial: { ...room.floorMaterial },
        ceilingMaterial: { ...room.ceilingMaterial },
      })
      for (const it of inside) {
        p.items.push({
          ...it,
          id: nanoid(),
          position: { x: it.position.x + OFF, z: it.position.z + OFF },
          material: { ...it.material },
          params: it.params ? { ...it.params } : undefined,
        })
      }
    })
    useStore.setState({ selection: { type: 'room', id: newRoomId }, selectedItemIds: [] })
  },
  // Flip a room and its furniture left-to-right across the room's own centre, in
  // place. The everyday use is a mirror-image bedroom in a symmetric HDB layout:
  // arrange one side, then mirror it. Reflecting x negates a Y-rotation.
  mirrorRoom(id: string) {
    const st = useStore.getState()
    const room = st.project.rooms.find((r) => r.id === id)
    if (!room || room.loop.length < 3) return
    const cx = room.loop.reduce((s, v) => s + v.x, 0) / room.loop.length
    const inside = new Set(
      st.project.items.filter((it) => pointInPolygon(it.position, room.loop)).map((it) => it.id),
    )
    st.commit((p) => {
      const r = p.rooms.find((x) => x.id === id)
      if (r) r.loop = r.loop.map((v) => ({ x: 2 * cx - v.x, z: v.z }))
      for (const it of p.items) {
        if (!inside.has(it.id)) continue
        it.position = { x: 2 * cx - it.position.x, z: it.position.z }
        it.rotationY = -it.rotationY
      }
    })
  },
  // ---- aircon ----
  // Re-route every fan coil back to a condenser. Safe to call repeatedly: runs
  // are keyed by fan coil, so re-routing after moving a unit updates its path
  // instead of stacking up duplicates.
  autoRouteTrunking() {
    const st = useStore.getState()
    const runs = autoRoute(st.project)
    st.commit((p) => {
      p.aircon = { ...emptyAirconPlan(), ...(p.aircon ?? {}), runs }
    })
    return runs.length
  },
  /** Send a run round the other side of the corner. */
  flipTrunkingElbow(runId: string) {
    useStore.getState().commit((p) => {
      const run = p.aircon?.runs.find((r) => r.id === runId)
      if (!run) return
      const next = elbowOfRun(run) === 'x' ? 'z' : 'x'
      const from = run.points[0]
      const to = run.points[run.points.length - 1]
      if (!from || !to) return
      run.points = routeTrunking(from, to, p.walls, next)
      run.elbowOf = next
    })
  },
  clearTrunking() {
    useStore.getState().commit((p) => {
      if (p.aircon) p.aircon.runs = []
    })
  },
  setTrunkingSize(w: number, h: number) {
    useStore.getState().commit((p) => {
      p.aircon = { ...emptyAirconPlan(), ...(p.aircon ?? {}), trunkingW: w, trunkingH: h }
    })
  },

  // ---- clipboard ----
  /** Snapshot the selected furniture into the clipboard. Returns how many. */
  copyItems(): number {
    const st = useStore.getState()
    const items = targetItemIds()
      .map((id) => st.project.items.find((i) => i.id === id))
      .filter((i): i is Item => !!i)
    if (!items.length) return 0
    useStore.setState({ clipboard: items.map(snapshotItem) })
    return items.length
  },
  /**
   * Drop the clipboard into the scene and leave the copies selected, so they can
   * be nudged straight away. Returns how many were pasted.
   */
  pasteItems(): number {
    const st = useStore.getState()
    const clip = st.clipboard
    if (!clip.length) return 0

    // Paste where the camera is looking, so you can copy a chair in one room,
    // orbit to another and paste it there. With no 3D view live (tracing in 2D)
    // there is nothing to aim at, so fall back to the small offset Duplicate uses.
    const cx = clip.reduce((s, it) => s + it.position.x, 0) / clip.length
    const cz = clip.reduce((s, it) => s + it.position.z, 0) / clip.length
    const base = getFocusPoint() ?? { x: cx + PASTE_OFFSET, z: cz + PASTE_OFFSET }

    // Offsets from the group's centre, so a copied arrangement keeps its layout.
    // Both paths get the declutter: the fallback anchor is derived from the
    // clipboard, which never moves, so without it every paste in 2D would land on
    // the exact same spot and bury the previous one.
    const offsets = clip.map((it) => ({
      x: it.position.x - cx,
      z: it.position.z - cz,
    }))
    const anchor = clearForItems(
      base,
      clip.map((item, i) => ({ item, offset: offsets[i] })),
      { items: st.project.items, walls: st.project.walls, rooms: st.project.rooms },
    )

    return storeApi.addItems(
      clip.map((it, i) => ({
        ...snapshotItem(it),
        position: { x: anchor.x + offsets[i].x, z: anchor.z + offsets[i].z },
      })),
    ).length
  },

  duplicateSelectedItem() {
    const st = useStore.getState()
    const ids = targetItemIds()
    if (!ids.length) return
    const newIds: string[] = []
    st.commit((p) => {
      for (const id of ids) {
        const src = p.items.find((i) => i.id === id)
        if (!src) continue
        const nid = nanoid()
        newIds.push(nid)
        p.items.push({
          ...src,
          id: nid,
          position: { x: src.position.x + 0.4, z: src.position.z + 0.4 },
          material: { ...src.material },
          params: src.params ? { ...src.params } : undefined,
        })
      }
    })
    useStore.setState({
      selectedItemIds: newIds,
      selection: newIds.length
        ? { type: 'item', id: newIds[newIds.length - 1] }
        : { type: null, id: null },
    })
    return newIds[0]
  },
  removeSelected() {
    const { selection, selectedItemIds, commit, clearSelection } = useStore.getState()
    // multi-selected furniture
    if (selectedItemIds.length > 0) {
      commit((p) => {
        p.items = p.items.filter((i) => !selectedItemIds.includes(i.id))
        dropOrphanRuns(p)
      })
      clearSelection()
      return
    }
    if (!selection.id) return
    // warn before hacking a wall marked structural (HDB load-bearing)
    if (selection.type === 'wall') {
      const w = useStore.getState().project.walls.find((x) => x.id === selection.id)
      if (
        w?.structural &&
        !confirm(
          'This wall is marked STRUCTURAL / load-bearing.\nHDB does not allow hacking structural walls or the household shelter.\n\nRemove it from the model anyway?',
        )
      )
        return
    }
    commit((p) => {
      if (selection.type === 'wall') {
        p.walls = p.walls.filter((w) => w.id !== selection.id)
        p.openings = p.openings.filter((o) => o.wallId !== selection.id)
      } else if (selection.type === 'opening') {
        p.openings = p.openings.filter((o) => o.id !== selection.id)
      } else if (selection.type === 'room') {
        p.rooms = p.rooms.filter((r) => r.id !== selection.id)
      } else if (selection.type === 'item') {
        p.items = p.items.filter((i) => i.id !== selection.id)
        dropOrphanRuns(p)
      }
    })
    clearSelection()
  },
}

/**
 * Deleting a fan coil or condenser leaves its trunking pointing at nothing, so
 * those runs go with it. Call inside a commit recipe, after the items are gone.
 */
function dropOrphanRuns(p: Project) {
  if (!p.aircon) return
  p.aircon.runs = pruneRuns(p)
}

/** How far a pasted copy sits from its original when there's no camera to aim at. */
const PASTE_OFFSET = 0.4

/**
 * The furniture an action applies to: the multi-selection if there is one, else
 * the single selected item. Copy, duplicate and the arrow-key nudge all need the
 * same answer.
 */
function targetItemIds(): string[] {
  const st = useStore.getState()
  if (st.selectedItemIds.length) return st.selectedItemIds
  return st.selection.type === 'item' && st.selection.id ? [st.selection.id] : []
}

/**
 * A detached copy of an item, without its id. Nested objects are cloned so a
 * pasted copy never shares a material or params object with its original (or with
 * the clipboard, which would let a later edit mutate the buffer). Listing the
 * fields out means a new required field on Item fails to compile here rather than
 * being silently dropped from every copy.
 */
function snapshotItem(it: Omit<Item, 'id'>): Omit<Item, 'id'> {
  return {
    catalogId: it.catalogId,
    kind: it.kind,
    name: it.name,
    position: { ...it.position },
    y: it.y,
    rotationY: it.rotationY,
    scale: it.scale,
    material: { ...it.material },
    params: it.params ? { ...it.params } : undefined,
    modelUrl: it.modelUrl,
  }
}
