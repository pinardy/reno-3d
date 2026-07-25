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
} from '../types/project'

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

  // ----- meta / mode -----
  setEditorMode: (m: EditorMode) => void
  setTool: (t: TraceTool) => void
  setCameraMode: (m: CameraMode) => void
  select: (sel: Selection) => void
  clearSelection: () => void

  // ----- project-level -----
  loadProject: (p: Project) => void
  newProject: () => void
  renameProject: (name: string) => void

  // ----- history -----
  commit: (recipe: (p: Project) => void) => void // pushes undo
  update: (recipe: (p: Project) => void) => void // no history (transient, e.g. drag)
  pushPast: (prev: Project) => void // push a captured snapshot as an undo step
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
  cameraMode: 'orbit',

  setEditorMode: (m) => set({ editorMode: m }),
  setTool: (t) => set({ tool: t, selection: { type: null, id: null } }),
  setCameraMode: (m) => set({ cameraMode: m }),
  select: (sel) => set({ selection: sel }),
  clearSelection: () => set({ selection: { type: null, id: null } }),

  loadProject: (p) =>
    set({
      project: p,
      past: [],
      future: [],
      selection: { type: null, id: null },
    }),
  newProject: () =>
    set({
      project: emptyProject(nanoid()),
      past: [],
      future: [],
      selection: { type: null, id: null },
      tool: 'select',
      editorMode: 'trace',
    }),
  renameProject: (name) =>
    get().commit((p) => {
      p.name = name
    }),

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
  addItem(it: Omit<Item, 'id'>): string {
    const id = nanoid()
    useStore.getState().commit((p) => {
      p.items.push({ ...it, id })
    })
    return id
  },
  duplicateSelectedItem() {
    const st = useStore.getState()
    if (st.selection.type !== 'item' || !st.selection.id) return
    const src = st.project.items.find((i) => i.id === st.selection.id)
    if (!src) return
    const id = nanoid()
    const copy: Item = {
      ...src,
      id,
      position: { x: src.position.x + 0.4, z: src.position.z + 0.4 },
      material: { ...src.material },
      params: src.params ? { ...src.params } : undefined,
    }
    st.commit((p) => {
      p.items.push(copy)
    })
    st.select({ type: 'item', id })
    return id
  },
  removeSelected() {
    const { selection, commit, clearSelection } = useStore.getState()
    if (!selection.id) return
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
      }
    })
    clearSelection()
  },
}
