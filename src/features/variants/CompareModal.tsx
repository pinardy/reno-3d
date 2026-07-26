import { useEffect, useState } from 'react'
import { X, GitCompare, Check } from 'lucide-react'
import { useStore } from '../../store/store'
import { listProjects, loadProject as dbLoad } from '../persistence/db'
import { migrateProject } from '../persistence/io'
import {
  METRIC_ROWS,
  bestIds,
  familyRoot,
  variantMetrics,
  type VariantMetrics,
} from './variants'

const RATE_KEY = 'reno:costRatePerM2'

/**
 * Side-by-side numbers for the layouts you're weighing up. Defaults to the current
 * project's variant family, with an option to widen it to every saved home — a
 * family is the common case, but people also compare two unrelated attempts.
 */
export function CompareModal() {
  const open = useStore((s) => s.compareOpen)
  const setOpen = useStore((s) => s.setCompareOpen)
  const current = useStore((s) => s.project)
  const storeLoad = useStore((s) => s.loadProject)

  const [all, setAll] = useState<VariantMetrics[] | null>(null)
  const [familyOnly, setFamilyOnly] = useState(true)
  const [roots, setRoots] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setAll(null)
    ;(async () => {
      const rate = Number(localStorage.getItem(RATE_KEY)) || 1500
      const rows = await listProjects()
      const loaded = await Promise.all(rows.map((r) => dbLoad(r.id)))
      if (cancelled) return
      const projects = loaded.filter(Boolean).map((p) => migrateProject(p!))
      // The project in memory can be ahead of what's on disk (autosave is
      // debounced), so prefer the live one for the row the user is looking at.
      const merged = projects.map((p) => (p.id === current.id ? current : p))
      if (!merged.some((p) => p.id === current.id)) merged.push(current)
      setRoots(Object.fromEntries(merged.map((p) => [p.id, familyRoot(p)])))
      setAll(merged.map((p) => variantMetrics(p, rate)))
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  const myRoot = roots[current.id] ?? familyRoot(current)
  const shown = (all ?? []).filter((m) => !familyOnly || roots[m.id] === myRoot)
  const familySize = (all ?? []).filter((m) => roots[m.id] === myRoot).length

  async function openProject(id: string) {
    if (id === current.id) return setOpen(false)
    const p = await dbLoad(id)
    if (p) storeLoad(migrateProject(p))
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="no-scrollbar max-h-[88vh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-edge bg-panel p-4 shadow-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-100">
              <GitCompare size={17} className="text-accent" /> Compare layouts
            </h2>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              Best value in each row is highlighted. Rows without a preference are
              context, not a score.
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

        <div className="mb-3 flex items-center gap-1 rounded-lg bg-panel2 p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setFamilyOnly(true)}
            className={`flex-1 rounded-md px-2 py-1 ${familyOnly ? 'bg-accent text-white' : 'text-neutral-300'}`}
          >
            This variant family ({familySize})
          </button>
          <button
            type="button"
            onClick={() => setFamilyOnly(false)}
            className={`flex-1 rounded-md px-2 py-1 ${!familyOnly ? 'bg-accent text-white' : 'text-neutral-300'}`}
          >
            All saved homes ({all?.length ?? 0})
          </button>
        </div>

        {all === null ? (
          <p className="py-8 text-center text-xs text-neutral-500">Loading…</p>
        ) : shown.length < 2 ? (
          <p className="rounded bg-panel2 px-3 py-6 text-center text-[11px] leading-relaxed text-neutral-400">
            {familyOnly
              ? 'Only one layout in this family. Use “Duplicate as variant” in the Projects menu to make an alternative, then rearrange it and come back.'
              : 'Save a second home to compare against.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-panel py-2 pr-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Metric
                  </th>
                  {shown.map((m) => (
                    <th key={m.id} className="px-2 py-2 text-right align-bottom">
                      <button
                        type="button"
                        onClick={() => openProject(m.id)}
                        title="Open this layout"
                        className="ml-auto flex items-center gap-1 text-right text-[11px] font-medium text-neutral-200 hover:text-accent"
                      >
                        {m.id === current.id && <Check size={11} className="text-accent" />}
                        <span className="max-w-[9rem] truncate">{m.name || 'Untitled'}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRIC_ROWS.map((row) => {
                  const best = bestIds(shown, row)
                  return (
                    <tr key={row.key} className="border-t border-edge">
                      <td className="sticky left-0 bg-panel py-1.5 pr-3 text-neutral-400">
                        {row.label}
                      </td>
                      {shown.map((m) => (
                        <td
                          key={m.id}
                          className={`px-2 py-1.5 text-right tabular-nums ${
                            best.has(m.id)
                              ? 'font-semibold text-emerald-300'
                              : 'text-neutral-300'
                          }`}
                        >
                          {row.format(Number(m[row.key]))}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-3 text-[10px] leading-relaxed text-neutral-500">
              Costs use the S$/m² rate from the Areas &amp; estimate panel and the
              catalog's ballpark prices, so they compare layouts against each other
              rather than predicting a quote. Click a name to open that layout.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
