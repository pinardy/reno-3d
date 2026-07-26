import { useDeferredValue, useMemo } from 'react'
import {
  AirVent,
  AlertTriangle,
  CheckCircle2,
  CornerDownRight,
  Info,
  Route,
  Trash2,
} from 'lucide-react'
import { useStore, storeApi } from '../../store/store'
import { Section, Row, NumberInput } from '../../app/ui'
import {
  airconIssueLabel,
  airconIssues,
  airconPlan,
  btuOf,
  condensers,
  fanCoils,
  fmtBtu,
  roomCapacities,
  runLength,
  systemLabel,
  totalTrunkingLength,
} from './aircon'

export function AirconPanel() {
  // Advisory, so deferred for the same reason as the other check panels.
  const project = useDeferredValue(useStore((s) => s.project))
  const select = useStore((s) => s.select)

  // Every one of these reads items, so there is no narrowing to be had — the
  // deferral above is what keeps them from competing with a drag.
  const coils = useMemo(() => fanCoils(project), [project])
  const outdoor = useMemo(() => condensers(project), [project])
  const plan = airconPlan(project)
  const issues = useMemo(() => airconIssues(project), [project])
  const caps = useMemo(
    () => roomCapacities(project).filter((c) => !c.unconditioned || c.fanCoils > 0),
    [project],
  )

  const installed = coils.reduce((s, c) => s + btuOf(c), 0)
  const trunking = totalTrunkingLength(plan)
  const system = systemLabel(project)

  if (!coils.length && !outdoor.length) {
    return (
      <Section title="Aircon">
        <p className="text-[11px] leading-relaxed text-neutral-500">
          Drop fan coils and a condenser from the{' '}
          <span className="text-neutral-300">Aircon</span> category, then route the
          trunking to see where the casing actually runs. A Singapore{' '}
          <span className="text-neutral-300">System 3</span> is one condenser on the
          ledge driving three fan coils.
        </p>
      </Section>
    )
  }

  return (
    <>
      <Section title="Aircon system">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat label="Fan coils" value={String(coils.length)} />
          <Stat label="Condensers" value={String(outdoor.length)} />
          <Stat label="Installed" value={`${fmtBtu(installed)} BTU`} />
          <Stat label="Trunking" value={`${trunking.toFixed(1)} m`} />
        </div>
        {system && (
          <p className="mt-2 text-[11px] text-neutral-400">
            Outdoor units add up to a{' '}
            <span className="font-medium text-neutral-200">{system}</span>.
          </p>
        )}

        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => {
              const n = storeApi.autoRouteTrunking()
              if (n === 0)
                alert(
                  'Nothing to route yet — you need at least one fan coil and one condenser.',
                )
            }}
            className="flex w-full items-center justify-center gap-2 rounded bg-accent/15 py-2 text-xs font-medium text-accent ring-1 ring-accent/30 hover:bg-accent/25"
          >
            <Route size={14} /> {plan.runs.length ? 'Re-route trunking' : 'Route trunking'}
          </button>
          {plan.runs.length > 0 && (
            <button
              type="button"
              onClick={() => storeApi.clearTrunking()}
              className="flex w-full items-center justify-center gap-2 rounded bg-panel2 py-1.5 text-[11px] text-neutral-300 hover:bg-edge"
            >
              <Trash2 size={13} /> Clear runs
            </button>
          )}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
          Each fan coil is routed to the nearest condenser with a spare port, along
          a right-angled path that keeps as close to a wall as it can. Move a unit
          and re-route to update.
        </p>
      </Section>

      {plan.runs.length > 0 && (
        <Section title="Trunking runs">
          <div className="space-y-1">
            {plan.runs.map((run) => {
              const coil = coils.find((c) => c.id === run.fanCoilId)
              const L = runLength(run.points)
              return (
                <div
                  key={run.id}
                  className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-[11px] hover:bg-panel2"
                >
                  <button
                    type="button"
                    onClick={() => select({ type: 'item', id: run.fanCoilId })}
                    className="min-w-0 flex-1 truncate text-left text-neutral-300"
                    title={`Select ${coil?.name ?? 'fan coil'}`}
                  >
                    {coil?.name ?? 'Fan coil'}
                  </button>
                  <span
                    className={`shrink-0 tabular-nums ${L > 15 ? 'text-amber-400' : 'text-neutral-500'}`}
                  >
                    {L.toFixed(1)} m
                  </span>
                  <button
                    type="button"
                    onClick={() => storeApi.flipTrunkingElbow(run.id)}
                    title="Send this run round the other side of the corner"
                    className="shrink-0 rounded p-1 text-neutral-400 hover:bg-edge hover:text-neutral-200"
                  >
                    <CornerDownRight size={13} />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="mt-2 border-t border-edge pt-2">
            <Row label="Casing width">
              <NumberInput
                value={plan.trunkingW}
                step={0.01}
                min={0.05}
                max={0.3}
                suffix="m"
                onChange={(v) => storeApi.setTrunkingSize(v, plan.trunkingH)}
              />
            </Row>
            <Row label="Casing height">
              <NumberInput
                value={plan.trunkingH}
                step={0.01}
                min={0.05}
                max={0.3}
                suffix="m"
                onChange={(v) => storeApi.setTrunkingSize(plan.trunkingW, v)}
              />
            </Row>
          </div>
        </Section>
      )}

      {caps.length > 0 && (
        <Section title="Cooling capacity">
          <div className="space-y-1">
            {caps.map((c) => {
              const short = c.fanCoils > 0 && c.installed < c.required
              return (
                <button
                  key={c.roomId}
                  type="button"
                  onClick={() => select({ type: 'room', id: c.roomId })}
                  className="flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left text-[11px] hover:bg-panel2"
                >
                  <span className="min-w-0 flex-1 truncate text-neutral-300">
                    {c.roomName}
                    {c.westSun && (
                      <span className="ml-1 text-orange-400/80" title="West-facing — sized up for the afternoon sun">
                        ☀
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-neutral-500">
                    {c.fanCoils > 0 ? fmtBtu(c.installed) : '—'} /{' '}
                    <span className={short ? 'text-amber-400' : ''}>
                      {fmtBtu(c.required)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
            Installed / needed BTU, sized at about 650 BTU per m² with a fifth more
            for west-facing rooms. A ballpark for sanity-checking a quote, not a
            heat-load calculation.
          </p>
        </Section>
      )}

      <Section title="Aircon checks">
        {issues.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <CheckCircle2 size={15} className="text-emerald-400" />
            Sizing, system capacity and pipe runs all look reasonable.
          </div>
        ) : (
          <div className="space-y-1">
            {issues.map((iss, i) => (
              <button
                key={`${iss.kind}-${iss.itemId ?? iss.roomId ?? i}`}
                type="button"
                onClick={() => {
                  if (iss.itemId) select({ type: 'item', id: iss.itemId })
                  else if (iss.roomId) select({ type: 'room', id: iss.roomId })
                }}
                className="flex w-full items-start gap-2 rounded px-1.5 py-1 text-left text-[11px] leading-snug text-neutral-300 hover:bg-panel2"
              >
                {iss.severity === 'warn' ? (
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
                ) : (
                  <Info size={13} className="mt-0.5 shrink-0 text-sky-400" />
                )}
                <span className="min-w-0">
                  <span className="text-neutral-500">{airconIssueLabel(iss.kind)} · </span>
                  {iss.message}
                </span>
              </button>
            ))}
          </div>
        )}
        <p className="mt-2 flex gap-1.5 text-[10px] leading-relaxed text-neutral-500">
          <AirVent size={12} className="mt-0.5 shrink-0" />
          Pipe lengths and system capacity still need confirming with your
          installer — brands differ, and the ledge has to take the weight.
        </p>
      </Section>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-panel2 px-2 py-1.5">
      <div className="text-[13px] font-semibold tabular-nums text-neutral-200">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
    </div>
  )
}
