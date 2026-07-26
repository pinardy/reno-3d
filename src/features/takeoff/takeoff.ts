import type { Project, Room } from '../../types/project'
import { dist, polygonArea, pointInPolygon } from '../../geometry/vec'

// Quantity takeoff: how much paint, tile and skirting the plan actually needs.
// The point is the same as the carpentry elevations — a quote arrives as a list of
// line items ("painting, 210 m²"), and until you can produce that number yourself
// you can only take its word for it.
//
// Everything here is derived from wall and room geometry, so it moves when the
// plan does. Figures are for checking a quote, not for ordering off.

/**
 * Rooms whose walls get tiled rather than painted. In an HDB flat the bathroom and
 * kitchen walls are tiled, usually to the ceiling, so counting them as paint would
 * overstate the paint by a third in a 4-room flat and miss the wall-tile line item
 * completely. A store room is also unconditioned but its walls are painted, which
 * is why this is a separate list from the aircon module's.
 */
const WET_ROOM = /kitchen|bath|toilet|wc|shower|yard|service|utility|balcony/i

export function isWetRoom(room: Room): boolean {
  return WET_ROOM.test(room.name)
}

/**
 * How finely walls are walked when attributing their faces to rooms, in metres.
 *
 * Areas come out accurate to well under a percent at 5cm. The residual error is at
 * the corners, where the sample straddling the boundary between two rooms' faces
 * lands on one side or the other — which is why the figures follow the inner face
 * perimeter rather than the wall centrelines, and are a percent or so under a
 * hand measurement. Immaterial next to two coats and a 10% tile allowance.
 */
const SAMPLE = 0.05
/** How far off a wall face to probe for the room behind it. */
const PROBE = 0.25
/** A sill at or below this counts as floor level, so skirting stops there. */
const FLOOR_LEVEL = 0.1

export interface RoomTakeoff {
  roomId: string
  roomName: string
  wet: boolean
  floorArea: number
  /** Ceiling is the same slab as the floor, kept separate because it's a separate
   *  line item and gets a different number of coats in practice. */
  ceilingArea: number
  /** Wall face area looking into this room, net of what openings take out. */
  wallArea: number
  /** Run of skirting: wall at floor level, interrupted by doorways. */
  skirting: number
}

export interface Takeoff {
  rooms: RoomTakeoff[]
  /** Wall area in dry rooms — the paint line item. */
  paintWallArea: number
  /** Wall area in wet rooms — the wall-tile line item. */
  tileWallArea: number
  ceilingArea: number
  floorArea: number
  /** Dry rooms only; wet areas get a tiled skirting cut from the floor tile. */
  skirting: number
  /** Area the openings take out of the walls, reported so the deduction is visible. */
  openingDeduction: number
}

/**
 * Walk every wall in 10cm steps and attribute each face to the room behind it.
 *
 * Sampling rather than probing the midpoint once, because one wall commonly borders
 * several rooms: the spine wall in the 3-room template has the living room down one
 * side and the kitchen, bathroom and bedroom down the other. A single probe would
 * credit the whole wall to whichever room happened to sit at its middle.
 *
 * Openings subtract their own height at the offsets they cover rather than the full
 * column, so a 1.2m window in a 2.8m wall still leaves 1.6m of wall to paint above
 * and below it — deducting the whole column would understate the paint.
 */
export function takeoff(project: Project): Takeoff {
  const floors = project.rooms.filter((r) => r.loop.length >= 3)
  const byRoom = new Map<string, RoomTakeoff>()
  for (const r of floors) {
    const area = Math.abs(polygonArea(r.loop))
    byRoom.set(r.id, {
      roomId: r.id,
      roomName: r.name,
      wet: isWetRoom(r),
      floorArea: area,
      ceilingArea: area,
      wallArea: 0,
      skirting: 0,
    })
  }

  let openingDeduction = 0

  for (const wall of project.walls) {
    const L = dist(wall.a, wall.b)
    if (L < 1e-6) continue
    const dir = { x: (wall.b.x - wall.a.x) / L, z: (wall.b.z - wall.a.z) / L }
    const n = { x: -dir.z, z: dir.x }
    const ops = project.openings.filter((o) => o.wallId === wall.id)
    const steps = Math.max(1, Math.round(L / SAMPLE))
    const step = L / steps
    const off = wall.thickness / 2 + PROBE

    for (let i = 0; i < steps; i++) {
      const at = (i + 0.5) * step
      // height taken out by openings spanning this offset, and whether the floor
      // is broken here (a doorway, so no skirting across it)
      let blocked = 0
      let doorway = false
      for (const o of ops) {
        if (Math.abs(at - o.offset) >= o.width / 2) continue
        blocked += o.height
        if (o.sillHeight <= FLOOR_LEVEL) doorway = true
      }
      const h = Math.max(0, wall.height - blocked)
      const mid = { x: wall.a.x + dir.x * at, z: wall.a.z + dir.z * at }

      for (const side of [1, -1]) {
        const probe = { x: mid.x + n.x * off * side, z: mid.z + n.z * off * side }
        const room = floors.find((r) => pointInPolygon(probe, r.loop))
        if (!room) continue // outside the flat: nothing to finish on this face
        const t = byRoom.get(room.id)!
        t.wallArea += step * h
        openingDeduction += step * Math.min(blocked, wall.height)
        if (!doorway) t.skirting += step
      }
    }
  }

  const rooms = [...byRoom.values()]
  const sum = (pick: (r: RoomTakeoff) => number, only?: (r: RoomTakeoff) => boolean) =>
    rooms.filter((r) => only?.(r) ?? true).reduce((s, r) => s + pick(r), 0)

  return {
    rooms,
    paintWallArea: sum((r) => r.wallArea, (r) => !r.wet),
    tileWallArea: sum((r) => r.wallArea, (r) => r.wet),
    ceilingArea: sum((r) => r.ceilingArea),
    floorArea: sum((r) => r.floorArea),
    skirting: sum((r) => r.skirting, (r) => !r.wet),
    openingDeduction,
  }
}

// ---- paint -----------------------------------------------------------------

/** Spread rate on a sealed interior wall, m² per litre per coat. */
export const PAINT_COVERAGE = 11
export const DEFAULT_COATS = 2
/** Retail pail size in Singapore. */
export const PAIL_LITRES = 5

export interface PaintQty {
  area: number
  coats: number
  litres: number
  pails: number
}

export function paintQuantity(
  area: number,
  coats = DEFAULT_COATS,
  coverage = PAINT_COVERAGE,
): PaintQty {
  const litres = coverage > 0 ? (area * coats) / coverage : 0
  return {
    area,
    coats,
    litres,
    pails: Math.ceil(litres / PAIL_LITRES),
  }
}

// ---- tile ------------------------------------------------------------------

export interface TileSize {
  id: string
  label: string
  w: number
  h: number
}

/** The sizes an HDB reno actually gets quoted in. 600×600 is the default. */
export const TILE_SIZES: TileSize[] = [
  { id: '300x300', label: '300 × 300', w: 0.3, h: 0.3 },
  { id: '300x600', label: '300 × 600', w: 0.3, h: 0.6 },
  { id: '600x600', label: '600 × 600', w: 0.6, h: 0.6 },
  { id: '800x800', label: '800 × 800', w: 0.8, h: 0.8 },
]

export function tileSizeById(id: string): TileSize {
  return TILE_SIZES.find((t) => t.id === id) ?? TILE_SIZES[2]
}

/** Cuts and breakages. 10% is the usual allowance; more for a diagonal lay. */
export const DEFAULT_WASTAGE = 0.1

export interface TileQty {
  area: number
  /** Area including the wastage allowance. */
  ordered: number
  pieces: number
}

export function tileQuantity(
  area: number,
  tile: TileSize,
  wastage = DEFAULT_WASTAGE,
): TileQty {
  const ordered = area * (1 + wastage)
  const each = tile.w * tile.h
  return {
    area,
    ordered,
    pieces: each > 0 ? Math.ceil(ordered / each) : 0,
  }
}

/** Skirting is sold in lengths, so a run rounds up to whole planks. */
export const SKIRTING_LENGTH = 2.4

export function skirtingPieces(run: number, plank = SKIRTING_LENGTH): number {
  return plank > 0 ? Math.ceil(run / plank) : 0
}
