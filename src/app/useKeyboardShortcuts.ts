import { useEffect, useRef } from 'react'
import { useStore, storeApi } from '../store/store'
import { isTypingTarget } from '../lib/dom'

export function useKeyboardShortcuts() {
  // true while a run of arrow-key nudges is in flight
  const nudging = useRef(false)

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

      // duplicate selected furniture
      if (meta && e.key.toLowerCase() === 'd' && s.selection.type === 'item') {
        e.preventDefault()
        storeApi.duplicateSelectedItem()
        return
      }

      // copy / paste furniture. Only swallow the key when there was actually
      // something to copy or paste, so Cmd/Ctrl+C still copies selected page text
      // when no furniture is involved.
      if (meta && e.key.toLowerCase() === 'c') {
        if (storeApi.copyItems() > 0) e.preventDefault()
        return
      }
      if (meta && e.key.toLowerCase() === 'v') {
        if (storeApi.pasteItems() > 0) e.preventDefault()
        return
      }

      // arrow-key nudge for selected furniture (design view, orbit mode)
      if (
        !meta &&
        s.editorMode === 'design' &&
        s.cameraMode === 'orbit' &&
        e.key.startsWith('Arrow')
      ) {
        const ids = s.selectedItemIds.length
          ? s.selectedItemIds
          : s.selection.type === 'item' && s.selection.id
            ? [s.selection.id]
            : []
        if (ids.length) {
          const step = e.shiftKey ? 0.02 : 0.1
          const d: Record<string, [number, number]> = {
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
          }
          const mv = d[e.key]
          if (mv) {
            e.preventDefault()
            // one undo step per run of nudges: snapshot on the first keypress,
            // then apply the rest without history. Holding an arrow key used to
            // push a step per repeat and flush the undo stack.
            if (!nudging.current) {
              s.checkpoint()
              nudging.current = true
            }
            s.update((p) => {
              for (const id of ids) {
                const it = p.items.find((i) => i.id === id)
                if (it) {
                  it.position.x += mv[0]
                  it.position.z += mv[1]
                }
              }
            })
            return
          }
        }
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
    // releasing the key ends the nudge run, so the next one starts a fresh step
    function onKeyUp(e: KeyboardEvent) {
      if (e.key.startsWith('Arrow')) nudging.current = false
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])
}
