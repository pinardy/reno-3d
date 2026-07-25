import { useEffect, useRef, useState, type ReactNode } from 'react'

const MIN = 180
const MAX = 560

function useResizable(key: string, def: number, side: 'left' | 'right') {
  const [width, setWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem(key))
    return v >= MIN && v <= MAX ? v : def
  })
  const start = useRef<{ x: number; w: number } | null>(null)

  useEffect(() => {
    localStorage.setItem(key, String(width))
  }, [key, width])

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    start.current = { x: e.clientX, w: width }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current
    if (!s) return
    const delta = e.clientX - s.x
    const w = side === 'left' ? s.w + delta : s.w - delta
    setWidth(Math.max(MIN, Math.min(MAX, w)))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    start.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }
  return { width, reset: () => setWidth(def), handleProps: { onPointerDown, onPointerMove, onPointerUp } }
}

// A fixed-position side panel with a draggable edge to resize it (width is
// persisted). Double-click the handle to reset to the default width.
export function SidePanel({
  side,
  storageKey,
  defaultWidth,
  children,
}: {
  side: 'left' | 'right'
  storageKey: string
  defaultWidth: number
  children: ReactNode
}) {
  const { width, reset, handleProps } = useResizable(storageKey, defaultWidth, side)
  const border = side === 'left' ? 'border-r' : 'border-l'
  const edge = side === 'left' ? 'right-0' : 'left-0'
  return (
    <div className="relative shrink-0" style={{ width }}>
      <aside className={`no-scrollbar h-full overflow-y-auto ${border} border-edge bg-panel`}>
        {children}
      </aside>
      <div
        {...handleProps}
        onDoubleClick={reset}
        title="Drag to resize · double-click to reset"
        className={`absolute top-0 ${edge} z-10 h-full w-1.5 cursor-col-resize touch-none transition-colors hover:bg-accent/40 active:bg-accent/60`}
      />
    </div>
  )
}
