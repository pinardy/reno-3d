import { useMemo, useState } from 'react'
import { PaintBucket, Grid3x3, Ruler } from 'lucide-react'
import { useStore } from '../../store/store'
import { Section } from '../../app/ui'
import {
  DEFAULT_COATS,
  DEFAULT_WASTAGE,
  PAINT_COVERAGE,
  TILE_SIZES,
  paintQuantity,
  skirtingPieces,
  takeoff,
  tileQuantity,
  tileSizeById,
} from './takeoff'

const TILE_KEY = 'reno:tileSize'
const WASTAGE_KEY = 'reno:tileWastage'
const COATS_KEY = 'reno:paintCoats'

function stored(key: string, fallback: number): number {
  const v = Number(localStorage.getItem(key))
  return Number.isFinite(v) && v > 0 ? v : fallback
}

/**
 * Paint, tile and skirting quantities off the plan's own geometry — the line items
 * a painter or tiler quotes, so the numbers can be compared rather than trusted.
 */
export function TakeoffPanel() {
  const project = useStore((s) => s.project)
  const t = useMemo(() => takeoff(project), [project])

  const [tileId, setTileId] = useState(() => localStorage.getItem(TILE_KEY) ?? '600x600')
  const [wastage, setWastage] = useState(() => stored(WASTAGE_KEY, DEFAULT_WASTAGE * 100))
  const [coats, setCoats] = useState(() => stored(COATS_KEY, DEFAULT_COATS))

  const tile = tileSizeById(tileId)
  const floorTiles = tileQuantity(t.floorArea, tile, wastage / 100)
  const wallTiles = tileQuantity(t.tileWallArea, tile, wastage / 100)
  const wallPaint = paintQuantity(t.paintWallArea, coats)
  const ceilPaint = paintQuantity(t.ceilingArea, coats)
  const totalLitres = wallPaint.litres + ceilPaint.litres

  if (t.rooms.length === 0) {
    return (
      <Section title="Paint & tile">
        <p className="text-[11px] leading-relaxed text-neutral-500">
          Detect or draw room floors and these quantities appear here — paintable
          wall area net of doors and windows, floor and wall tile with a wastage
          allowance, and the skirting run.
        </p>
      </Section>
    )
  }

  return (
    <>
      <Section title="Paint">
        <Row label="Walls (dry rooms)" value={`${t.paintWallArea.toFixed(1)} m²`} />
        <Row label="Ceilings" value={`${t.ceilingArea.toFixed(1)} m²`} />
        <label className="mt-1 flex items-center justify-between text-xs text-neutral-300">
          <span className="text-neutral-400">Coats</span>
          <input
            type="number"
            value={coats}
            min={1}
            max={4}
            step={1}
            onChange={(e) => {
              const v = Math.max(1, Math.round(parseFloat(e.target.value) || 1))
              setCoats(v)
              localStorage.setItem(COATS_KEY, String(v))
            }}
            className="w-16 rounded border border-edge bg-panel2 px-2 py-0.5 text-right text-xs text-neutral-100 outline-none focus:border-accent"
          />
        </label>
        <div className="mt-2 flex items-center justify-between rounded bg-panel2 px-2 py-1.5">
          <span className="flex items-center gap-1.5 text-xs text-neutral-300">
            <PaintBucket size={13} className="text-accent" /> Paint needed
          </span>
          <span className="text-right">
            <span className="block text-sm font-semibold tabular-nums text-emerald-300">
              {totalLitres.toFixed(1)} L
            </span>
            <span className="block text-[10px] text-neutral-500">
              ≈ {Math.ceil(totalLitres / 5)} × 5 L pails
            </span>
          </span>
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-neutral-500">
          At {PAINT_COVERAGE} m² per litre per coat, net of doors and windows.
          Bathroom and kitchen walls are counted as tile, not paint.
        </p>
      </Section>

      <Section title="Tiling">
        <div className="mb-2 grid grid-cols-4 gap-1">
          {TILE_SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setTileId(s.id)
                localStorage.setItem(TILE_KEY, s.id)
              }}
              className={`rounded py-1 text-[10px] tabular-nums ${
                tileId === s.id
                  ? 'bg-accent text-white'
                  : 'bg-panel2 text-neutral-300 hover:bg-edge'
              }`}
            >
              {s.label.replace(/ /g, '')}
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between text-xs text-neutral-300">
          <span className="text-neutral-400">Wastage</span>
          <span className="flex items-center gap-1">
            <input
              type="number"
              value={wastage}
              min={0}
              max={30}
              step={1}
              onChange={(e) => {
                const v = Math.max(0, parseFloat(e.target.value) || 0)
                setWastage(v)
                localStorage.setItem(WASTAGE_KEY, String(v))
              }}
              className="w-16 rounded border border-edge bg-panel2 px-2 py-0.5 text-right text-xs text-neutral-100 outline-none focus:border-accent"
            />
            <span className="text-[10px] text-neutral-500">%</span>
          </span>
        </label>

        <div className="mt-2 space-y-1.5">
          <TileLine
            label="Floor"
            area={floorTiles.area}
            ordered={floorTiles.ordered}
            pieces={floorTiles.pieces}
          />
          {t.tileWallArea > 0 && (
            <TileLine
              label="Walls (wet rooms)"
              area={wallTiles.area}
              ordered={wallTiles.ordered}
              pieces={wallTiles.pieces}
            />
          )}
        </div>
        <p className="mt-1.5 flex gap-1.5 text-[10px] leading-relaxed text-neutral-500">
          <Grid3x3 size={12} className="mt-0.5 shrink-0" />
          Pieces at {tile.label} mm including wastage. Boxes vary by supplier —
          divide by their pieces per box.
        </p>
      </Section>

      <Section title="Skirting">
        <div className="flex items-center justify-between rounded bg-panel2 px-2 py-1.5">
          <span className="flex items-center gap-1.5 text-xs text-neutral-300">
            <Ruler size={13} className="text-accent" /> Run
          </span>
          <span className="text-right">
            <span className="block text-sm font-semibold tabular-nums text-neutral-100">
              {t.skirting.toFixed(1)} m
            </span>
            <span className="block text-[10px] text-neutral-500">
              ≈ {skirtingPieces(t.skirting)} × 2.4 m lengths
            </span>
          </span>
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-neutral-500">
          Wall at floor level in dry rooms, with doorways left out. Wet areas
          usually get a tiled skirting cut from the floor tile instead.
        </p>
      </Section>

      <Section title="By room">
        <div className="space-y-1">
          {t.rooms.map((r) => (
            <div key={r.roomId} className="text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-neutral-300">
                  {r.roomName}
                  {r.wet && (
                    <span className="ml-1 text-sky-400/80" title="Wet area — walls tiled">
                      ~
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-neutral-500">
                  {r.floorArea.toFixed(1)} m² floor
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-500">
                <span>{r.wet ? 'wall tile' : 'wall paint'} {r.wallArea.toFixed(1)} m²</span>
                <span className="tabular-nums">{r.skirting.toFixed(1)} m skirting</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
          Wall areas are measured face by face along each wall, so a wall shared by
          two rooms is split between them. {t.openingDeduction.toFixed(1)} m² was
          deducted for doors and windows.
        </p>
      </Section>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-neutral-400">{label}</span>
      <span className="tabular-nums text-neutral-200">{value}</span>
    </div>
  )
}

function TileLine({
  label,
  area,
  ordered,
  pieces,
}: {
  label: string
  area: number
  ordered: number
  pieces: number
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0 truncate text-neutral-400">{label}</span>
      <span className="shrink-0 text-right">
        <span className="block tabular-nums text-neutral-200">{pieces} pcs</span>
        <span className="block text-[10px] tabular-nums text-neutral-500">
          {area.toFixed(1)} → {ordered.toFixed(1)} m²
        </span>
      </span>
    </div>
  )
}
