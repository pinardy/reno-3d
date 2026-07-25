import { useEffect, useRef } from 'react'
import { useStore } from '../../store/store'
import { saveProject, lastProjectId, loadProject } from './db'
import { migrateProject } from './io'

/** Load the most-recently-used project from IndexedDB on first mount. */
export function useLoadLast() {
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    ;(async () => {
      const id = await lastProjectId()
      if (!id) return
      const p = await loadProject(id)
      if (p) useStore.getState().loadProject(migrateProject(p))
    })()
  }, [])
}

/** Debounced autosave to IndexedDB whenever the project changes. */
export function useAutosave() {
  const project = useStore((s) => s.project)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      // Only persist projects that have some content or a name change.
      saveProject(project).catch((e) => console.warn('autosave failed', e))
    }, 600)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [project])
}
