import type { Item, Room, Vec2, Wall } from '../../types/project'
import { dist, pointInPolygon } from '../../geometry/vec'
import { rectsOverlap, spansOverlap, type Rect } from '../../geometry/rect'
import { num } from '../../lib/params'
import { catalogById } from './catalog'
import { wallRect } from '../checks/clearance'

const OCCUPIED = 0.35 // metres: closer than this and the two items read as one pile
const STEP = 0.55 // how far each ring sits from the last
const RINGS = 3
// Matched to clearance.ts, so a spot this search calls clear is also a spot the
// layout checks won't warn about. Touching is fine; real clashes overlap by more.
const OVERLAP_SLACK = 0.05
const VERTICAL_SLACK = 0.06
const WALL_SLACK = 0.06

/**
 * Step a spot clear of items already standing there. Adds all aim at the same
 * focus point, so without this a run of clicks buries each item inside the last.
 * Searches rings of candidates around `pos`; returns `pos` if the area is full.
 *
 * This is the size-agnostic version, for callers that don't yet know what they're
 * about to place. Prefer `clearForItems` when the items are in hand — it compares
 * real footprints instead of assuming everything is 0.35m wide.
 */
export function clearOf(pos: Vec2, items: Item[], rings = RINGS): Vec2 {
  const taken = (p: Vec2) => items.filter((i) => dist(i.position, p) < OCCUPIED).length
  const found = search(pos, taken, STEP, rings)
  // this one keeps its original contract: nothing clear means the caller's spot
  return found.score === 0 ? found.at : pos
}

/**
 * Like `clearOf`, but for placing known items: it compares actual footprints, and
 * tests every member of a group at once.
 *
 * Both matter for paste. A 2m sofa stepped 0.55m aside is still sitting on top of
 * the sofa it was copied from — the fixed radius is tuned for a vase, so repeated
 * pastes of anything large piled up and tripped the overlap warnings. And testing
 * the anchor alone lets a copied pair land half inside its original, because the
 * anchor itself sat in the gap between the two.
 *
 * `probes` are the items about to be placed, positioned relative to the anchor.
 * Items stacked vertically clear of each other (a wall cabinet over a base unit)
 * don't count as clashing, matching how the layout checks read the same pair.
 *
 * Give it `walls` and `rooms` to keep the search inside the flat. Stepping further
 * than the old fixed radius did means candidates now reach the walls, and when no
 * spot is perfect the failures aren't equal: a copy overlapping another sofa is
 * one drag from fixed, while one embedded in a wall — or sitting outside the flat
 * altogether — reads as the app being broken. So a congested search settles for
 * overlapping rather than for out-of-bounds.
 */
export function clearForItems(
  pos: Vec2,
  probes: { item: Omit<Item, 'id'>; offset: Vec2 }[],
  ctx: PlacementContext,
): Vec2 {
  const { items, walls = [], rooms = [], rings = RINGS } = ctx
  const standing = items
    .map((i) => footprintAt(i, i.position))
    .filter((f): f is Footprint => f !== null)
  const barriers = walls.map((w) => ({ rect: wallRect(w), height: w.height }))
  const floors = rooms.filter((r) => r.loop.length >= 3)

  /** Lower is better; 0 means the spot is clear on every count. */
  const penalty = (anchor: Vec2): number => {
    let score = 0
    for (const p of probes) {
      const at = { x: anchor.x + p.offset.x, z: anchor.z + p.offset.z }
      const f = footprintAt(p.item, at)
      if (!f) {
        // no catalog entry to size it by — fall back to the pile test
        score += items.filter((i) => dist(i.position, at) < OCCUPIED).length
        continue
      }
      if (
        barriers.some(
          (b) =>
            spansOverlap(f.y0, f.y1, 0, b.height, VERTICAL_SLACK) &&
            rectsOverlap(f.rect, b.rect, WALL_SLACK),
        )
      )
        score += W_IN_WALL
      if (floors.length && !floors.some((r) => pointInPolygon(at, r.loop)))
        score += W_OUTSIDE
      // Counted, not flagged: in a flat with nowhere clear left, the spot that
      // collides with one thing has to beat the spot that collides with three, or
      // every paste after the first lands on the same least-bad candidate.
      score += standing.filter(
        (g) =>
          spansOverlap(f.y0, f.y1, g.y0, g.y1, VERTICAL_SLACK) &&
          rectsOverlap(f.rect, g.rect, OVERLAP_SLACK),
      ).length
    }
    return score
  }

  // Big items need to step further than a vase to get clear of themselves.
  const reach = Math.max(
    ...probes.map((p) => {
      const f = footprintAt(p.item, pos)
      return f ? Math.max(f.rect.w, f.rect.d) / 2 : 0
    }),
    0,
  )
  return search(pos, penalty, Math.max(STEP, reach), rings).at
}

export interface PlacementContext {
  items: Item[]
  /** Keeps candidates out of the walls. */
  walls?: Wall[]
  /** Keeps candidates inside the flat. Ignored when the plan has no rooms yet. */
  rooms?: Room[]
  rings?: number
}

// Out-of-bounds outweighs any amount of overlapping: a copy sitting in a wall or
// outside the flat reads as a bug, while one overlapping a sofa is a drag from
// fixed. Overlaps themselves are counted, so fewer is better.
const W_IN_WALL = 100
const W_OUTSIDE = 100

/**
 * Rings of candidate spots around `pos`. Returns the first spot with no penalty at
 * all, or else the least-penalised one it saw, with its score so the caller can
 * tell the two apart.
 */
function search(
  pos: Vec2,
  penalty: (p: Vec2) => number,
  step: number,
  rings: number,
): { at: Vec2; score: number } {
  let best = pos
  let bestScore = penalty(pos)
  if (bestScore === 0) return { at: pos, score: 0 }
  for (let ring = 1; ring <= rings; ring++) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const c = {
        x: pos.x + Math.cos(a) * step * ring,
        z: pos.z + Math.sin(a) * step * ring,
      }
      const score = penalty(c)
      if (score === 0) return { at: c, score: 0 }
      // strictly better only, so ties keep the candidate nearest the request
      if (score < bestScore) {
        best = c
        bestScore = score
      }
    }
  }
  return { at: best, score: bestScore }
}

interface Footprint {
  rect: Rect
  y0: number
  y1: number
}

/** An item's footprint and vertical extent if it stood at `at`. */
function footprintAt(it: Omit<Item, 'id'>, at: Vec2): Footprint | null {
  const entry = catalogById(it.catalogId)
  if (!entry) return null
  const s = it.scale || 1
  const isCab = it.kind === 'cabinet'
  const h = (isCab ? num(it.params?.height, entry.size.h) : entry.size.h) * s
  return {
    rect: {
      cx: at.x,
      cz: at.z,
      w: (isCab ? num(it.params?.width, entry.size.w) : entry.size.w) * s,
      d: (isCab ? num(it.params?.depth, entry.size.d) : entry.size.d) * s,
      rot: it.rotationY,
    },
    y0: it.y,
    y1: it.y + h,
  }
}
