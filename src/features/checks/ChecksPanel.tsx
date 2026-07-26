import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Sun, Sunrise, Sunset, ShieldAlert } from 'lucide-react'
import { useStore } from '../../store/store'
import { Section } from '../../app/ui'
import { findIssues, type Issue, type IssueKind } from './clearance'
import { roomSunExposure } from './sun'

const LABEL: Record<IssueKind, string> = {
  overlap: 'Overlap',
  'in-wall': 'In a wall',
  'door-blocked': 'Door',
  access: 'Access',
  'no-entry': "Won't fit",
  'narrow-door': 'Narrow door',
}

export function ChecksPanel() {
  const project = useStore((s) => s.project)
  const select = useStore((s) => s.select)

  // both are pure passes over the project; recompute only when it actually changes
  const issues = useMemo(() => findIssues(project), [project])
  const sun = useMemo(() => roomSunExposure(project), [project])
  const wallCount = project.walls.length
  const structuralCount = useMemo(
    () => project.walls.filter((w) => w.structural).length,
    [project.walls],
  )

  // an issue points at either an item or an opening
  const selectIssue = (iss: Issue) =>
    iss.openingId
      ? select({ type: 'opening', id: iss.openingId })
      : select({ type: 'item', id: iss.itemId })

  return (
    <>
      <Section title="Layout checks">
        {issues.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <CheckCircle2 size={15} className="text-emerald-400" />
            Nothing clashing — no overlaps or blocked doors.
          </div>
        ) : (
          <div className="space-y-1">
            {issues.map((iss, i) => (
              <button
                key={`${iss.kind}-${iss.itemId}-${iss.openingId ?? ''}-${i}`}
                type="button"
                onClick={() => selectIssue(iss)}
                className="flex w-full items-start gap-2 rounded px-1.5 py-1 text-left text-[11px] leading-snug text-neutral-300 hover:bg-panel2"
              >
                <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
                <span className="min-w-0">
                  <span className="text-neutral-500">{LABEL[iss.kind]} · </span>
                  {iss.message}
                </span>
              </button>
            ))}
            <p className="pt-1 text-[10px] leading-relaxed text-neutral-500">
              Tap one to select it. Walkway widths aren't checked — only clashes,
              door swings and the space needed to open tall units.
            </p>
          </div>
        )}
      </Section>

      <Section title="Structural walls">
        {structuralCount > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-neutral-300">
              <ShieldAlert size={15} className="shrink-0 text-amber-400" />
              {structuralCount} of {wallCount} walls marked load-bearing
            </div>
            <p className="text-[10px] leading-relaxed text-neutral-500">
              Load-bearing walls and the household shelter can't be hacked, and
              their openings can't be enlarged. Verify with HDB or your contractor
              before removing any wall.
            </p>
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed text-neutral-500">
            No walls marked structural. Select a wall and tick{' '}
            <span className="text-neutral-300">Structural</span> for the ones that
            are load-bearing — usually the flat's perimeter and the household
            shelter — so the model warns before you hack them.
          </p>
        )}
      </Section>

      <Section title="Sun & daylight">
        {sun.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-neutral-500">
            Add windows and detect rooms to see which way each room faces. Set the
            plan's north with the compass in the 3D view.
          </p>
        ) : (
          <div className="space-y-1.5">
            {sun.map((r) => (
              <div key={r.roomId} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-neutral-300">{r.roomName}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="tabular-nums text-[11px] text-neutral-500">
                    {r.facings.join(' · ')}
                  </span>
                  {r.morning && (
                    <span title="Morning sun" className="flex">
                      <Sunrise size={13} className="text-amber-300" />
                    </span>
                  )}
                  {r.afternoon && (
                    <span title="Afternoon sun" className="flex">
                      <Sunset size={13} className="text-orange-400" />
                    </span>
                  )}
                </span>
              </div>
            ))}
            {sun.some((r) => r.afternoon) && (
              <p className="flex gap-1.5 pt-1 text-[10px] leading-relaxed text-orange-300/80">
                <Sun size={12} className="mt-0.5 shrink-0" />
                West-facing rooms take the hot afternoon sun — worth planning
                curtains, solar film or heavier aircon for.
              </p>
            )}
          </div>
        )}
      </Section>
    </>
  )
}
