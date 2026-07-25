import { useEffect } from 'react'
import { useStore } from '../../store/store'
import { saveProject, lastProjectId, loadProject } from './db'
import { migrateProject } from './io'

const DEBOUNCE_MS = 400

/**
 * Local persistence: restore the last project on load, then autosave to
 * IndexedDB. Saving is gated until the initial restore completes so the empty
 * bootstrap project can never overwrite real work. Project *switches* (new id)
 * persist immediately; edits to the current project are debounced. A flush on
 * tab-hide/close captures the final edits within the debounce window.
 */
export function usePersistence() {
  useEffect(() => {
    let ready = false
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const save = () => {
      timer = null
      const st = useStore.getState()
      st.setSaveState('saving')
      saveProject(st.project)
        .then(() => useStore.getState().setSaveState('saved'))
        .catch((e) => console.warn('autosave failed', e))
    }
    const flush = () => {
      if (!ready) return
      if (timer) clearTimeout(timer)
      save()
    }

    // 1. restore the most recently used project before enabling saves
    ;(async () => {
      try {
        const id = await lastProjectId()
        if (cancelled) return
        if (id) {
          const p = await loadProject(id)
          if (p && !cancelled) useStore.getState().loadProject(migrateProject(p))
        }
      } catch (e) {
        console.warn('restore failed', e)
      } finally {
        ready = true
      }
    })()

    // 2. autosave on project changes (ignore selection/tool/camera churn)
    const unsub = useStore.subscribe((s, prev) => {
      if (!ready || s.project === prev.project) return
      if (s.project.id !== prev.project.id) {
        // switched/created/loaded a project — persist the pointer right away
        if (timer) clearTimeout(timer)
        save()
      } else {
        if (timer) clearTimeout(timer)
        timer = setTimeout(save, DEBOUNCE_MS)
      }
    })

    // 3. flush pending edits when the tab is hidden or unloaded
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      unsub()
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
