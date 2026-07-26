import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, PencilRuler, X } from 'lucide-react'
import { useStore } from '../../store/store'
import { Section } from '../../app/ui'
import { elevationRuns, feetRun, type ElevationRun } from './elevation'
import {
  downloadElevation,
  downloadElevationSheet,
  renderElevation,
  runSummary,
} from './elevationDraw'

export function ElevationPanel() {
  const project = useStore((s) => s.project)
  const select = useStore((s) => s.select)
  const runs = useMemo(() => elevationRuns(project), [project])
  const [openId, setOpenId] = useState<string | null>(null)

  const open = runs.find((r) => r.id === openId) ?? null
  // A run's id is derived from the items in it, so moving a cabinet out of the run
  // changes the id and the modal would be left showing a drawing that no longer
  // exists. Close it instead.
  useEffect(() => {
    if (openId && !runs.some((r) => r.id === openId)) setOpenId(null)
  }, [openId, runs])

  if (!runs.length) {
    return (
      <Section title="Carpentry elevations">
        <p className="text-[11px] leading-relaxed text-neutral-500">
          Place cabinets, wardrobes or shelving against a wall and their front-on
          elevations appear here — the dimensioned drawings a carpenter quotes and
          builds from.
        </p>
      </Section>
    )
  }

  const totalRun = runs.reduce((s, r) => s + r.carpentryRun, 0)

  return (
    <>
      <Section title="Carpentry elevations">
        <div className="space-y-1">
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => setOpenId(run.id)}
              className="flex w-full items-center justify-between gap-2 rounded px-1.5 py-1.5 text-left hover:bg-panel2"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs text-neutral-200">{run.name}</span>
                <span className="block text-[10px] text-neutral-500">
                  {run.units.length} unit{run.units.length > 1 ? 's' : ''} ·{' '}
                  {run.width.toFixed(2)} m wide
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[11px] tabular-nums text-neutral-300">
                  {feetRun(run.carpentryRun).toFixed(1)} ft
                </span>
                <span className="block text-[10px] text-neutral-500">run</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-2 border-t border-edge pt-2">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>Total carcass</span>
            <span className="tabular-nums text-neutral-200">
              {totalRun.toFixed(2)} m · {feetRun(totalRun).toFixed(1)} ft
            </span>
          </div>
          <button
            type="button"
            onClick={() => downloadElevationSheet(project)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-panel2 py-2 text-xs text-neutral-300 hover:bg-edge"
          >
            <Download size={14} /> Export all elevations (PNG)
          </button>
          <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
            Carpentry is quoted per foot run of carcass, so this is the number to
            compare against a quote. Appliance gaps are drawn but not counted.
          </p>
        </div>
      </Section>

      {open && (
        <ElevationModal
          run={open}
          projectName={project.name}
          onClose={() => setOpenId(null)}
          onSelectUnit={(id) => select({ type: 'item', id })}
        />
      )}
    </>
  )
}

function ElevationModal({
  run,
  projectName,
  onClose,
  onSelectUnit,
}: {
  run: ElevationRun
  projectName: string
  onClose: () => void
  onSelectUnit: (itemId: string) => void
}) {
  const holder = useRef<HTMLDivElement>(null)

  // Drawn straight into the DOM rather than via a data URL, so a wide kitchen run
  // stays crisp when the modal scales it down to fit.
  useEffect(() => {
    const el = holder.current
    if (!el) return
    const canvas = renderElevation(run, 1500)
    canvas.style.width = '100%'
    canvas.style.height = 'auto'
    canvas.style.display = 'block'
    el.replaceChildren(canvas)
  }, [run])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="no-scrollbar max-h-[88vh] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-2xl border border-edge bg-panel p-4 shadow-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-100">
              <PencilRuler size={17} className="text-accent" /> {run.name}
            </h2>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              {run.width.toFixed(2)} m wide · {runSummary(run)} · dimensions in mm
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => downloadElevation(run, projectName)}
              title="Download this elevation as a PNG"
              className="flex items-center gap-1.5 rounded bg-panel2 px-2.5 py-1.5 text-[11px] text-neutral-300 hover:bg-edge"
            >
              <Download size={13} /> PNG
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-neutral-400 hover:bg-panel2 hover:text-neutral-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div ref={holder} className="overflow-x-auto rounded-lg bg-white" />

        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Units, left to right
          </div>
          <div className="space-y-0.5">
            {run.units.map((u) => (
              <button
                key={u.itemId}
                type="button"
                onClick={() => {
                  onSelectUnit(u.itemId)
                  onClose()
                }}
                className="flex w-full items-center justify-between gap-3 rounded px-1.5 py-1 text-left text-[11px] hover:bg-panel2"
              >
                <span className="min-w-0 truncate text-neutral-300">
                  {u.name}
                  {!u.carpentry && (
                    <span className="ml-1.5 text-neutral-500">(appliance)</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-neutral-500">
                  {Math.round(u.w * 1000)} × {Math.round((u.y1 - u.y0) * 1000)} ×{' '}
                  {Math.round(u.d * 1000)} mm
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
