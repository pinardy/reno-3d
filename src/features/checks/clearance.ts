import type { Item, ItemKind, Opening, Project, Room, Wall } from '../../types/project'
import {
  type Rect,
  pointInRect,
  rectCorners,
  rectsOverlap,
  spansOverlap,
  rectAxes,
} from '../../geometry/rect'
import { dist, pointInPolygon } from '../../geometry/vec'
import { catalogById } from '../catalog/catalog'

// Layout mistakes that cost real money in a 60–110m² flat: furniture buried in
// another piece, sunk into a wall, blocking a door's swing, or parked so close in
// front of a wardrobe that its doors can't open.
//
// Deliberately NOT checked: general walkway width. Doing that honestly needs a
// path/medial-axis analysis of the free floor area, and the cheap proxies (gap
// between any two items) flag every sofa-and-coffee-table pair. Better to report
// nothing than to train you to ignore warnings.

export type IssueKind = 'overlap' | 'in-wall' | 'door-blocked' | 'access'

export interface Issue {
  kind: IssueKind
  itemId: string // the item to select when the user clicks the issue
  otherId?: string
  message: string
}

/** Free space each kind needs in front of it to be usable, in metres. */
const ACCESS_CLEARANCE: Partial<Record<ItemKind, number>> = {
  wardrobe: 0.7,
  cabinet: 0.7,
  appliance: 0.7,
  toilet: 0.6,
  shower: 0.6,
  bathtub: 0.6,
  sink: 0.55,
}

// Storage only needs standing room in front once it's tall enough to have doors
// you open standing up. A 0.5m TV console or sideboard with a sofa 60cm away is
// normal living, not a mistake — and 'cabinet'/'wardrobe' cover both.
const ACCESS_MIN_HEIGHT = 1.0
// Fixtures need their clearance whatever their height.
const ALWAYS_ACCESS: ReadonlySet<ItemKind> = new Set<ItemKind>([
  'appliance',
  'toilet',
  'shower',
  'bathtub',
  'sink',
])

// Rugs live under other furniture, so every overlap is intentional.
const IGNORED: ReadonlySet<ItemKind> = new Set<ItemKind>(['rug'])
// Things that belong in or on a wall, where "inside the wall" is the point.
const WALL_MOUNTED: ReadonlySet<ItemKind> = new Set<ItemKind>([
  'picture',
  'curtain',
  'pendant',
  'hood',
])

const OVERLAP_SLACK = 0.05 // touching, or a 5cm scuff, isn't worth a warning
const WALL_SLACK = 0.06 // cabinets snap flush; allow a little sink-in
// An item's default lift assumes some surface height. A lamp meant for a 0.5m
// nightstand on a 0.55m side table isn't a mistake worth reporting, so tolerate
// centimetre-level mismatches vertically. Real clashes overlap by far more.
const VERTICAL_SLACK = 0.06

interface Placed {
  item: Item
  rect: Rect
  y0: number
  y1: number
}

function place(item: Item): Placed | null {
  const entry = catalogById(item.catalogId)
  if (!entry) return null
  const s = item.scale || 1
  return {
    item,
    rect: {
      cx: item.position.x,
      cz: item.position.z,
      w: entry.size.w * s,
      d: entry.size.d * s,
      rot: item.rotationY,
    },
    y0: item.y,
    y1: item.y + entry.size.h * s,
  }
}

export function wallRect(w: Wall): Rect {
  return {
    cx: (w.a.x + w.b.x) / 2,
    cz: (w.a.z + w.b.z) / 2,
    w: dist(w.a, w.b),
    d: w.thickness,
    // rot such that the local x axis runs a -> b
    rot: Math.atan2(-(w.b.z - w.a.z), w.b.x - w.a.x),
  }
}

/** The strip an item needs kept clear in front of it, or null if it needs none. */
export function accessZone(p: Placed): Rect | null {
  const clear = ACCESS_CLEARANCE[p.item.kind]
  if (!clear) return null
  if (!ALWAYS_ACCESS.has(p.item.kind) && p.y1 - p.y0 < ACCESS_MIN_HEIGHT) return null
  const { v } = rectAxes(p.rect.rot) // +z is the front
  const off = p.rect.d / 2 + clear / 2
  return {
    cx: p.rect.cx + v.x * off,
    cz: p.rect.cz + v.z * off,
    w: p.rect.w * 0.8, // ignore the outer edges; a door only needs its own span
    d: clear,
    rot: p.rect.rot,
  }
}

/**
 * The quarter-disc a hinged door sweeps, approximated by points on and inside the
 * arc. Which way a door opens isn't modelled, so both faces are swept — except
 * that a face with no room behind it is outside the home, where nothing stands.
 * Without that filter a bedroom door flags the furniture in the next room too.
 */
export function doorSwingPoints(
  op: Opening,
  wall: Wall,
  rooms: Room[] = [],
): { x: number; z: number }[] {
  const L = dist(wall.a, wall.b)
  if (L < 1e-6) return []
  const dir = { x: (wall.b.x - wall.a.x) / L, z: (wall.b.z - wall.a.z) / L }
  const n = { x: -dir.z, z: dir.x }
  // hinge sits at one end of the opening
  const side = op.hinge === 'right' ? 1 : -1
  const hx = wall.a.x + dir.x * (op.offset + (side * op.width) / 2)
  const hz = wall.a.z + dir.z * (op.offset + (side * op.width) / 2)
  const mid = { x: wall.a.x + dir.x * op.offset, z: wall.a.z + dir.z * op.offset }
  const insideOnly = rooms.some((r) => r.loop.length >= 3)
  const pts: { x: number; z: number }[] = []
  for (const s of [1, -1]) {
    if (insideOnly) {
      const probe = { x: mid.x + n.x * 0.4 * s, z: mid.z + n.z * 0.4 * s }
      const inRoom = rooms.some((r) => r.loop.length >= 3 && pointInPolygon(probe, r.loop))
      if (!inRoom) continue
    }
    for (const frac of [0.35, 0.7, 1]) {
      for (const step of [0.25, 0.5, 0.75, 1]) {
        const a = (step * Math.PI) / 2
        const r = op.width * frac
        const along = Math.cos(a) * r * -side
        const out = Math.sin(a) * r * s
        pts.push({
          x: hx + dir.x * along + n.x * out,
          z: hz + dir.z * along + n.z * out,
        })
      }
    }
  }
  return pts
}

/**
 * Is `small` sitting on top of `large`? Its footprint fits inside, and its base is
 * higher — a kettle on a worktop, a TV lifted onto a console. Catches these even
 * when the item's default lift doesn't exactly match the surface it landed on.
 */
function restsOn(small: Placed, large: Placed): boolean {
  if (small.y0 <= large.y0 + 0.05) return false
  if (small.rect.w > large.rect.w || small.rect.d > large.rect.d) return false
  return rectCorners(small.rect).every((c) => pointInRect(c, { ...large.rect, w: large.rect.w + 0.1, d: large.rect.d + 0.1 }))
}

export function findIssues(project: Project): Issue[] {
  const placed = project.items.map(place).filter((p): p is Placed => p !== null)
  const active = placed.filter((p) => !IGNORED.has(p.item.kind))
  const issues: Issue[] = []

  // item vs item
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]
      const b = active[j]
      if (!spansOverlap(a.y0, a.y1, b.y0, b.y1, VERTICAL_SLACK)) continue // stacked, not clashing
      if (restsOn(a, b) || restsOn(b, a)) continue // one is sitting on the other
      if (rectsOverlap(a.rect, b.rect, OVERLAP_SLACK)) {
        issues.push({
          kind: 'overlap',
          itemId: a.item.id,
          otherId: b.item.id,
          message: `${a.item.name} overlaps ${b.item.name}`,
        })
      }
    }
  }

  // item vs wall
  const walls = project.walls.map((w) => ({ wall: w, rect: wallRect(w) }))
  for (const p of active) {
    if (WALL_MOUNTED.has(p.item.kind)) continue
    for (const w of walls) {
      if (!spansOverlap(p.y0, p.y1, 0, w.wall.height, VERTICAL_SLACK)) continue
      if (rectsOverlap(p.rect, w.rect, WALL_SLACK)) {
        issues.push({
          kind: 'in-wall',
          itemId: p.item.id,
          message: `${p.item.name} is inside a wall`,
        })
        break // one report per item is enough
      }
    }
  }

  // doors: anything standing in the swing
  for (const op of project.openings) {
    if (op.type !== 'door') continue
    const wall = project.walls.find((w) => w.id === op.wallId)
    if (!wall) continue
    const pts = doorSwingPoints(op, wall, project.rooms)
    for (const p of active) {
      if (p.y0 > op.height) continue // clears the door entirely
      if (pts.some((pt) => pointInRect(pt, p.rect))) {
        issues.push({
          kind: 'door-blocked',
          itemId: p.item.id,
          message: `${p.item.name} blocks a door`,
        })
      }
    }
  }

  // access strips in front of doors/drawers/fixtures
  for (const p of active) {
    const zone = accessZone(p)
    if (!zone) continue
    const blocker = active.find(
      (o) =>
        o !== p &&
        spansOverlap(o.y0, o.y1, p.y0, p.y1, VERTICAL_SLACK) &&
        rectsOverlap(zone, o.rect, OVERLAP_SLACK),
    )
    if (blocker) {
      issues.push({
        kind: 'access',
        itemId: p.item.id,
        otherId: blocker.item.id,
        message: `${blocker.item.name} leaves no room to open ${p.item.name}`,
      })
      continue
    }
    const wall = walls.find(
      (w) => spansOverlap(p.y0, p.y1, 0, w.wall.height, VERTICAL_SLACK) && rectsOverlap(zone, w.rect, 0.02),
    )
    if (wall) {
      issues.push({
        kind: 'access',
        itemId: p.item.id,
        message: `${p.item.name} faces a wall too closely to open`,
      })
    }
  }

  return issues
}
