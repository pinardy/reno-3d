import { useEffect } from 'react'
import { useStore, storeApi } from '../store/store'

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return
      const meta = e.metaKey || e.ctrlKey
      const s = useStore.getState()

      // undo / redo
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) s.redo()
        else s.undo()
        return
      }
      if (meta && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        s.redo()
        return
      }

      // delete selection
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selection.id) {
        e.preventDefault()
        storeApi.removeSelected()
        return
      }

      // escape clears selection
      if (e.key === 'Escape') {
        s.clearSelection()
        return
      }

      // tool shortcuts (trace mode only)
      if (s.editorMode === 'trace' && !meta) {
        const map: Record<string, () => void> = {
          v: () => s.setTool('select'),
          w: () => s.setTool('wall'),
          d: () => s.setTool('door'),
          n: () => s.setTool('window'),
          r: () => s.setTool('room'),
          s: () => s.setTool('scale'),
        }
        const fn = map[e.key.toLowerCase()]
        if (fn) {
          e.preventDefault()
          fn()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
