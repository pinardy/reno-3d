import type { Item, ItemKind, Project, Vec2 } from '../../types/project'
import { num, bool } from '../../lib/params'
import { pointInPolygon } from '../../geometry/vec'
import { catalogById } from '../catalog/catalog'

// Carpentry elevations: the flat front-on drawings a carpenter or ID works from,
// derived from what's already in the 3D model. A quote is priced per foot run of
// carcass, and what gets built is whatever the elevation says — so being able to
// produce the elevation yourself is the difference between checking a quote and
// taking its word for it.
//
// The unit of a drawing is a RUN, not a cabinet: everything standing against one
// stretch of wall, base units and the wall units above them together, is one
// elevation. That's how a kitchen gets drawn and how it gets priced.

/** Kinds that can appear in a carpentry elevation. */
const ELEVATION_KINDS: ReadonlySet<ItemKind> = new Set<ItemKind>([
  'cabinet',
  'wardrobe',
  'shelf',
  'appliance',
  'sink',
  'hood',
])

/** Built by the carpenter (so it counts toward the foot run) rather than bought in. */
const CARPENTRY_KINDS: ReadonlySet<ItemKind> = new Set<ItemKind>([
  'cabinet',
  'wardrobe',
  'shelf',
])

/**
 * Catalog entries that are `wardrobe`-shaped in the model but aren't carpentry and
 * aren't drawn: an aircon ledge and a planter box are cast concrete that comes with
 * the flat, and the household shelter is structural.
 */
const NOT_CARPENTRY = new Set([
  'aircon-ledge',
  'planter-box',
  'household-shelter',
])

/**
 * Free-standing appliances still get drawn — the carpenter has to leave a gap of
 * the right size, and the elevation is where that gap is agreed — but they are
 * hatched rather than panelled, and excluded from the foot run.
 */
const APPLIANCE_IDS = new Set(['fridge', 'stove', 'washer', 'dishwasher'])

/** Units further apart than this along the wall belong to separate runs. */
const MAX_GAP = 0.6
/** Backs within this distance of the same plane count as the same wall. */
const BACK_TOLERANCE = 0.35
/** Rotations within this many radians count as the same direction (~5°). */
const ANGLE_TOLERANCE = 0.09

export type FrontKind = 'door' | 'drawer' | 'open' | 'appliance'

export interface Front {
  kind: FrontKind
  /** Offset from the unit's left edge, metres. */
  x: number
  /** Height above the floor of the front's bottom edge, metres. */
  y: number
  w: number
  h: number
}

export interface ElevationUnit {
  itemId: string
  name: string
  /** Left edge of the unit measured from the run's left end, metres. */
  x: number
  w: number
  d: number
  /** Bottom and top of the carcass above the floor, metres. */
  y0: number
  y1: number
  fronts: Front[]
  /** Worktop slab sitting on this unit, if any. */
  counter: boolean
  /** Counted toward the foot run (i.e. actually built). */
  carpentry: boolean
}

export interface ElevationRun {
  id: string
  /** e.g. "Kitchen — Run A". */
  name: string
  roomName: string | null
  /** Overall width of the run, metres. */
  width: number
  /** Tallest carcass top in the run, metres. */
  height: number
  /** Wall height behind the run, for the ceiling reference line. */
  wallHeight: number
  units: ElevationUnit[]
  /** Metres of carcass the carpenter builds, base + wall (excludes appliance gaps). */
  carpentryRun: number
  /** Of that, the units standing on the floor. Quoted separately from the wall units. */
  baseRun: number
  /** Of that, the units hung up the wall. */
  wallRun: number
  /** Which way the run faces, so the drawing knows the viewer's left and right. */
  rotationY: number
}

/**
 * A unit is "raised" once it's hung up the wall rather than standing on the floor.
 * Kitchen carpentry is quoted as two separate foot runs — bottom cabinets and top
 * cabinets — so the split has to survive into the drawing.
 */
export const RAISED_ABOVE = 0.4

export function isRaised(u: ElevationUnit): boolean {
  return u.y0 >= RAISED_ABOVE
}

// ---- geometry helpers ------------------------------------------------------

/** World direction an item's front faces (its local +z). */
export function frontAxis(rotationY: number): Vec2 {
  return { x: Math.sin(rotationY), z: Math.cos(rotationY) }
}

/**
 * World direction of an item's local +x. Standing in front of a run looking at
 * it, this points to the viewer's right — which is why the drawing can just sort
 * units by their offset along this axis and read left to right.
 */
export function widthAxis(rotationY: number): Vec2 {
  return { x: Math.cos(rotationY), z: -Math.sin(rotationY) }
}

function angleClose(a: number, b: number): boolean {
  const TAU = Math.PI * 2
  let d = Math.abs(((a - b) % TAU + TAU) % TAU)
  if (d > Math.PI) d = TAU - d
  return d < ANGLE_TOLERANCE
}

interface Placed {
  item: Item
  w: number
  d: number
  h: number
  y0: number
  /** Distance along the width axis to the unit's centre. */
  s: number
  /** Distance along the front axis to the unit's back face — its wall plane. */
  back: number
}

function placeForElevation(item: Item): Placed | null {
  const entry = catalogById(item.catalogId)
  if (!entry) return null
  if (!ELEVATION_KINDS.has(item.kind)) return null
  if (NOT_CARPENTRY.has(item.catalogId)) return null
  const sc = item.scale || 1
  const isCab = item.kind === 'cabinet'
  const w = (isCab ? num(item.params?.width, entry.size.w) : entry.size.w) * sc
  const d = (isCab ? num(item.params?.depth, entry.size.d) : entry.size.d) * sc
  const h = (isCab ? num(item.params?.height, entry.size.h) : entry.size.h) * sc
  const f = frontAxis(item.rotationY)
  const r = widthAxis(item.rotationY)
  return {
    item,
    w,
    d,
    h,
    y0: item.y,
    s: item.position.x * r.x + item.position.z * r.z,
    back: item.position.x * f.x + item.position.z * f.z - d / 2,
  }
}

// ---- run detection ---------------------------------------------------------

/**
 * Two units belong to the same run when they face the same way, sit against the
 * same wall plane, and are adjacent along that wall. Facing is compared over the
 * full circle, not modulo 180°, so cabinets backed onto opposite faces of one
 * partition stay in separate drawings.
 *
 * Base and wall units group together on purpose: they share a back plane even
 * though a 600 base is deeper than a 350 wall unit, and one drawing showing both
 * is exactly what a carpenter needs.
 */
function sameRun(a: Placed, b: Placed): boolean {
  if (!angleClose(a.item.rotationY, b.item.rotationY)) return false
  if (Math.abs(a.back - b.back) > BACK_TOLERANCE) return false
  const gap =
    Math.max(a.s - a.w / 2, b.s - b.w / 2) - Math.min(a.s + a.w / 2, b.s + b.w / 2)
  return gap <= MAX_GAP
}

function groupRuns(placed: Placed[]): Placed[][] {
  // union-find over the adjacency above
  const parent = placed.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      if (sameRun(placed[i], placed[j])) parent[find(i)] = find(j)
    }
  }
  const groups = new Map<number, Placed[]>()
  for (let i = 0; i < placed.length; i++) {
    const root = find(i)
    const g = groups.get(root) ?? []
    g.push(placed[i])
    groups.set(root, g)
  }
  // Two units that only touch through a third still chain into one run, which is
  // right: an L of base cabinets reads as one continuous carcass.
  return [...groups.values()].map((g) => g.slice().sort((a, b) => a.s - b.s))
}

// ---- front layout ----------------------------------------------------------

/**
 * The visible fronts of one unit, in run-local coordinates: doors split the width,
 * drawers stack up the height, shelves become open bays. Mirrors how the 3D
 * `Cabinet` and `Shelf` models are built, so the drawing matches the model.
 */
function frontsOf(p: Placed, kind: ItemKind): Front[] {
  const { w, h, y0 } = p
  const counter = bool(p.item.params?.counter, false)
  const counterH = counter ? 0.04 : 0
  const bodyH = h - counterH

  if (kind === 'appliance' || kind === 'sink' || kind === 'hood') {
    return [{ kind: 'appliance', x: 0, y: y0, w, h }]
  }
  if (APPLIANCE_IDS.has(p.item.catalogId)) {
    return [{ kind: 'appliance', x: 0, y: y0, w, h }]
  }
  if (kind === 'shelf') {
    const n = Math.max(2, Math.round(num(p.item.params?.shelves, 4)))
    const bayH = (h - 0.03 * (n + 1)) / n
    return Array.from({ length: n }, (_, i) => ({
      kind: 'open' as const,
      x: 0.03,
      y: y0 + 0.03 + i * (bayH + 0.03),
      w: w - 0.06,
      h: bayH,
    }))
  }

  const drawers = Math.max(0, Math.round(num(p.item.params?.drawers, 0)))
  const corner = bool(p.item.params?.corner, false)
  if (drawers > 0 && !corner) {
    const frontH = (bodyH - 0.06) / drawers
    return Array.from({ length: drawers }, (_, i) => ({
      kind: 'drawer' as const,
      x: 0.02,
      y: y0 + 0.03 + i * frontH,
      w: w - 0.04,
      h: frontH - 0.015,
    }))
  }

  const doors = Math.max(1, Math.round(num(p.item.params?.doors, 2)))
  // A corner unit's return leg wraps out of the elevation plane, so only the part
  // of the front that's actually facing the viewer is drawn.
  const x0 = corner ? p.d : 0
  const faceW = w - x0
  const doorW = (faceW - 0.04) / doors
  if (doorW <= 0.02) return [{ kind: 'door', x: 0.02, y: y0 + 0.03, w: w - 0.04, h: bodyH - 0.06 }]
  return Array.from({ length: doors }, (_, i) => ({
    kind: 'door' as const,
    x: x0 + 0.02 + i * doorW,
    y: y0 + 0.03,
    w: doorW - 0.02,
    h: bodyH - 0.06,
  }))
}

// ---- public API ------------------------------------------------------------

const RUN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Detect every carpentry run in the project, ready to draw. */
export function elevationRuns(project: Project): ElevationRun[] {
  const placed = project.items
    .map(placeForElevation)
    .filter((p): p is Placed => p !== null)
  if (!placed.length) return []

  const wallHeight = project.wallHeight || 2.8
  const perRoom = new Map<string, number>()

  const runs = groupRuns(placed).map((group): ElevationRun => {
    const left = Math.min(...group.map((p) => p.s - p.w / 2))
    const right = Math.max(...group.map((p) => p.s + p.w / 2))

    const units = group.map((p): ElevationUnit => {
      const isCarpentry =
        CARPENTRY_KINDS.has(p.item.kind) && !APPLIANCE_IDS.has(p.item.catalogId)
      return {
        itemId: p.item.id,
        name: p.item.name,
        x: p.s - p.w / 2 - left,
        w: p.w,
        d: p.d,
        y0: p.y0,
        y1: p.y0 + p.h,
        fronts: frontsOf(p, p.item.kind),
        counter: bool(p.item.params?.counter, false),
        carpentry: isCarpentry,
      }
    })

    // Which room the run stands in, for the drawing's title.
    const mid = group[Math.floor(group.length / 2)]
    const f = frontAxis(mid.item.rotationY)
    // step into the room off the front face, so a run against a party wall names
    // the room it serves rather than the one behind it
    const probe = {
      x: mid.item.position.x + f.x * (mid.d / 2 + 0.3),
      z: mid.item.position.z + f.z * (mid.d / 2 + 0.3),
    }
    const room = project.rooms.find(
      (rm) => rm.loop.length >= 3 && pointInPolygon(probe, rm.loop),
    )
    const roomName = room?.name ?? null
    const key = roomName ?? '—'
    const idx = perRoom.get(key) ?? 0
    perRoom.set(key, idx + 1)
    const letter = RUN_LETTERS[idx] ?? String(idx + 1)

    const built = units.filter((u) => u.carpentry)
    const baseRun = built.filter((u) => !isRaised(u)).reduce((s, u) => s + u.w, 0)
    const wallRun = built.filter(isRaised).reduce((s, u) => s + u.w, 0)

    return {
      id: `elev-${group.map((p) => p.item.id).join('-')}`,
      name: roomName ? `${roomName} — Run ${letter}` : `Run ${letter}`,
      roomName,
      width: right - left,
      height: Math.max(...units.map((u) => u.y1)),
      wallHeight,
      units,
      carpentryRun: baseRun + wallRun,
      baseRun,
      wallRun,
      rotationY: mid.item.rotationY,
    }
  })

  // Widest first — the kitchen run is the one you want to look at.
  return runs.sort((a, b) => b.width - a.width)
}

export const M_TO_FT = 3.28084

export function feetRun(metres: number): number {
  return metres * M_TO_FT
}
