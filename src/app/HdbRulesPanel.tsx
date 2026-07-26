import { useState } from 'react'
import { X, ShieldCheck, ExternalLink } from 'lucide-react'
import { useStore } from '../store/store'

const KEY = 'reno:hdbChecklist'

type Group = { title: string; items: { id: string; text: string }[] }

// General guidance for HDB renovations — a reference to tick off, NOT legal
// advice. Rules change and depend on your block; always confirm with HDB and a
// registered renovation contractor.
const GROUPS: Group[] = [
  {
    title: 'Permits & contractor',
    items: [
      { id: 'p1', text: 'Engage an HDB-registered renovation contractor for works that need it.' },
      { id: 'p2', text: 'Apply for the HDB renovation permit before starting permit-required works (e.g. hacking).' },
      { id: 'p3', text: 'Do noisy/hacking works only within HDB-permitted hours; no such works on Sundays / public holidays.' },
      { id: 'p4', text: 'Notify neighbours before major/hacking works.' },
    ],
  },
  {
    title: 'Structure & hacking',
    items: [
      { id: 's1', text: 'Do NOT hack structural / load-bearing (reinforced-concrete) walls, columns, beams or the floor slab.' },
      { id: 's2', text: 'Do NOT hack, drill heavily into, or alter the household shelter (bomb shelter) or its door.' },
      { id: 's3', text: 'Only non-load-bearing walls may be removed — with a permit.' },
      { id: 's4', text: 'Mark your structural walls in the model (wall inspector → “Structural”) so you don’t plan to hack them.' },
    ],
  },
  {
    title: 'Flooring & wet works',
    items: [
      { id: 'f1', text: 'Keep floor finishes within HDB’s weight/thickness limit (commonly cited ~50 mm / ~50 kg/m² — verify).' },
      { id: 'f2', text: 'Do proper waterproofing + screed for wet areas (bathrooms, kitchen, service yard, balcony).' },
      { id: 'f3', text: 'Don’t raise or sink the floor beyond what’s allowed; no hacking the floor slab.' },
    ],
  },
  {
    title: 'Windows, doors & aircon',
    items: [
      { id: 'w1', text: 'Window works must use a BCA-approved window contractor and approved designs; grilles must comply.' },
      { id: 'w2', text: 'Main door / gate changes should meet fire-safety and HDB requirements.' },
      { id: 'w3', text: 'Mount the aircon condenser on the designated aircon ledge with proper trunking.' },
    ],
  },
  {
    title: 'General',
    items: [
      { id: 'g1', text: 'Keep all works within your flat’s footprint — no extending or enclosing common areas without approval.' },
      { id: 'g2', text: 'Reinstate anything affecting common property; get approval where required.' },
      { id: 'g3', text: 'Keep your permit and contractor details on hand during works.' },
    ],
  },
]

function loadChecks(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export function HdbRulesPanel() {
  const open = useStore((s) => s.hdbOpen)
  const setOpen = useStore((s) => s.setHdbOpen)
  const [checks, setChecks] = useState<Record<string, boolean>>(loadChecks)
  if (!open) return null

  const toggle = (id: string) => {
    const next = { ...checks, [id]: !checks[id] }
    setChecks(next)
    localStorage.setItem(KEY, JSON.stringify(next))
  }
  const done = Object.values(checks).filter(Boolean).length
  const total = GROUPS.reduce((n, g) => n + g.items.length, 0)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="no-scrollbar max-h-[85vh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-2xl border border-edge bg-panel p-4 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-100">
            <ShieldCheck size={18} className="text-accent" /> HDB renovation checklist
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-neutral-400 hover:bg-panel2 hover:text-neutral-200"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-[11px] leading-relaxed text-neutral-500">
          General guidance to tick off — <b>not legal advice</b>. Rules change and
          depend on your block. Always confirm with HDB and a registered renovation
          contractor.{' '}
          <a
            href="https://www.hdb.gov.sg/residential/living-in-an-hdb-flat/renovation"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-accent hover:underline"
          >
            HDB renovation info <ExternalLink size={11} />
          </a>
        </p>

        <div className="space-y-4">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                {g.title}
              </div>
              <div className="space-y-1.5">
                {g.items.map((it) => (
                  <label key={it.id} className="flex cursor-pointer items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!checks[it.id]}
                      onChange={() => toggle(it.id)}
                      className="mt-0.5"
                    />
                    <span className={checks[it.id] ? 'text-neutral-500 line-through' : 'text-neutral-300'}>
                      {it.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-right text-[11px] text-neutral-500">
          {done} / {total} acknowledged
        </div>
      </div>
    </div>
  )
}
