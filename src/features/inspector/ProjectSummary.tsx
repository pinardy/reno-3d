import { useState } from 'react'
import { Download } from 'lucide-react'
import { useStore } from '../../store/store'
import { polygonArea } from '../../geometry/vec'
import { Section } from '../../app/ui'
import { furnitureTotal, exportShoppingListCSV } from '../persistence/shoppingList'

const RATE_KEY = 'reno:costRatePerM2'
const DEFAULT_RATE = 1500 // rough S$/m² renovation estimate

// Always-visible planning summary: per-room + total floor area and a rough
// renovation cost estimate (editable rate, persisted in localStorage).
export function ProjectSummary() {
  const rooms = useStore((s) => s.project.rooms)
  const project = useStore((s) => s.project)
  const itemCount = useStore((s) => s.project.items.length)
  const [rate, setRate] = useState<number>(() => {
    const v = Number(localStorage.getItem(RATE_KEY))
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_RATE
  })

  const areas = rooms.map((r) => ({ name: r.name, area: Math.abs(polygonArea(r.loop)) }))
  const total = areas.reduce((s, a) => s + a.area, 0)
  const furniture = furnitureTotal(project)

  function updateRate(v: number) {
    setRate(v)
    if (Number.isFinite(v) && v > 0) localStorage.setItem(RATE_KEY, String(v))
  }

  return (
    <>
    <Section title="Areas & estimate">
      {areas.length === 0 ? (
        <p className="text-[11px] text-neutral-500">
          Define room floors (Trace → Detect rooms) to see areas here.
        </p>
      ) : (
        <>
          <div className="space-y-1">
            {areas.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="truncate text-neutral-300">{a.name}</span>
                <span className="tabular-nums text-neutral-400">{a.area.toFixed(1)} m²</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-edge pt-2 text-xs">
            <span className="font-medium text-neutral-200">Total floor area</span>
            <span className="tabular-nums font-semibold text-neutral-100">
              {total.toFixed(1)} m²
            </span>
          </div>

          <div className="mt-3 rounded bg-panel2 p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Rate (S$/m²)</span>
              <input
                type="number"
                value={rate}
                min={0}
                step={50}
                onChange={(e) => updateRate(parseFloat(e.target.value))}
                className="w-20 rounded border border-edge bg-panel px-2 py-0.5 text-right text-xs text-neutral-100 outline-none focus:border-accent"
              />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Rough reno estimate</span>
              <span className="text-sm font-semibold text-emerald-300">
                S${Math.round(total * rate).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-tight text-neutral-500">
              Very rough — floor area × your rate. Adjust the rate to your quote.
            </p>
          </div>
        </>
      )}
    </Section>

    <Section title="Furniture">
      {itemCount === 0 ? (
        <p className="text-[11px] text-neutral-500">
          Add furniture in the Design view to build a shopping list.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
            <span className="text-sm font-semibold text-emerald-300">
              S${Math.round(furniture).toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            onClick={() => exportShoppingListCSV(project)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-panel2 py-2 text-[11px] text-neutral-300 hover:bg-edge"
          >
            <Download size={13} /> Export shopping list (CSV)
          </button>
          <p className="mt-1 text-[10px] leading-tight text-neutral-500">
            Ballpark prices per item — edit the CSV with your real quotes.
          </p>
        </>
      )}
    </Section>
    </>
  )
}
