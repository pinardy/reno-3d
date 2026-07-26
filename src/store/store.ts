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
  saveState: 'idle' | 'saving' | 'saved'
  helpOpen: boolean
  hdbOpen: boolean

  setSaveState: (s: 'idle' | 'saving' | 'saved') => void
  setHelpOpen: (v: boolean) => void
  setHdbOpen: (v: boolean) => void

  // ----- meta / mode -----
  setEditorMode: (m: EditorMode) => void
  setTool: (t: TraceTool) => void
  setCameraMode: (m: CameraMode) => void
  select: (sel: Selection) => void
  clearSelection: () => void
  selectedItemIds: string[] // multi-selection of furniture
  toggleItem: (id: string) => void // shift-click add/remove

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
  cameraMode: 'orbit',
  saveState: 'idle',
  helpOpen: false,
  hdbOpen: false,

  setSaveState: (s) => set({ saveState: s }),
  setHelpOpen: (v) => set({ helpOpen: v }),
  setHdbOpen: (v) => set({ hdbOpen: v }),

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
  duplicateSelectedItem() {
    const st = useStore.getState()
    const ids = st.selectedItemIds.length
      ? st.selectedItemIds
      : st.selection.type === 'item' && st.selection.id
        ? [st.selection.id]
        : []
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
      }
    })
    clearSelection()
  },
}
