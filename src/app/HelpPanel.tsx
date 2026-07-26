import { X, Upload, Ruler, Minus, Box, Package, Keyboard } from 'lucide-react'
import { useStore } from '../store/store'
import { useIsCoarsePointer } from '../lib/device'

const STEPS = [
  {
    icon: <Upload size={18} />,
    title: '1 · Upload your floor plan',
    body: 'Trace 2D → upload an HDB/BTO plan image (or start from an HDB template / sample home).',
  },
  {
    icon: <Ruler size={18} />,
    title: '2 · Set the scale',
    body: 'Pick the Scale tool, draw a line over a known dimension, and type its real length in metres. Tracing is locked until this is set.',
  },
  {
    icon: <Minus size={18} />,
    title: '3 · Trace walls, doors & windows',
    body: 'Wall tool: click corners (type a number + Enter for an exact length). Click on a wall to drop a door or window.',
  },
  {
    icon: <Box size={18} />,
    title: '4 · Design in 3D',
    body: 'Switch to Design 3D. Orbit or Walk through. Toggle Dimensions, Dollhouse and the time-of-day light.',
  },
  {
    icon: <Package size={18} />,
    title: '5 · Furnish & finish',
    body: 'Drag furniture in, recolour surfaces on the right, then check areas + the shopping-list budget. Everything autosaves in your browser.',
  },
]

const SHORTCUTS: [string, string][] = [
  ['V / W / D / N / R / S', 'Select / Wall / Door / wiNdow / Room / Scale (2D)'],
  ['Cmd/Ctrl + Z', 'Undo · Shift to redo'],
  ['Cmd/Ctrl + D', 'Duplicate selected furniture'],
  ['Arrow keys', 'Nudge furniture (Shift = fine)'],
  ['Shift-click', 'Multi-select furniture'],
  ['Delete', 'Remove selection · Esc to deselect'],
  ['Scroll / Space-drag', 'Zoom / pan the 2D view'],
  ['Space-drag', 'Pan the 3D view (left-drag orbits)'],
]

export function HelpPanel() {
  const open = useStore((s) => s.helpOpen)
  const setOpen = useStore((s) => s.setHelpOpen)
  const coarse = useIsCoarsePointer()
  if (!open) return null

  const steps = coarse
    ? STEPS.map((s) =>
        s.title.startsWith('5')
          ? {
              ...s,
              // there is no right-hand panel on a phone, and dragging from the
              // catalog can't work on touch
              body: 'Tap Furniture at the bottom to place items, then open Details to recolour surfaces and check areas + the shopping-list budget. Everything autosaves in your browser.',
            }
          : s,
      )
    : STEPS

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="no-scrollbar max-h-[85vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-edge bg-panel p-4 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">Welcome to Reno 3D</h2>
            <p className="text-xs text-neutral-400">
              Turn your floor plan into a walkable, furnished 3D home — all in your browser.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-neutral-400 hover:bg-panel2 hover:text-neutral-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.title} className="flex gap-3 rounded-lg bg-panel2 p-3">
              <div className="mt-0.5 text-accent">{s.icon}</div>
              <div>
                <div className="text-sm font-medium text-neutral-200">{s.title}</div>
                <div className="text-xs leading-relaxed text-neutral-400">{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* a touch device has no keyboard to press these on */}
        <div className={coarse ? 'hidden' : 'mt-5'}>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            <Keyboard size={13} /> Keyboard shortcuts
          </div>
          <div className="space-y-1">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 text-xs">
                <kbd className="rounded border border-edge bg-panel2 px-1.5 py-0.5 font-mono text-[10px] text-neutral-300">
                  {k}
                </kbd>
                <span className="flex-1 text-right text-neutral-400">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-5 w-full rounded-lg bg-accent py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          Get started
        </button>
      </div>
    </div>
  )
}
