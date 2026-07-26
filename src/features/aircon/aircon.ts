import type {
  AirconPlan,
  Item,
  ItemKind,
  Project,
  Room,
  TrunkingRun,
  Vec2,
  Wall,
} from '../../types/project'
import { dist, polygonArea, pointInPolygon, projectOnSegment } from '../../geometry/vec'
import { catalogById } from '../catalog/catalog'
import { num } from '../../lib/params'
import { roomSunExposure } from '../checks/sun'

// Aircon planning for a Singapore flat. A "System N" here means what it means to
// an installer: one outdoor condenser driving N indoor fan coils, with refrigerant
// pipes and a condensate drain running back from each fan coil to the condenser
// inside trunking. Where that trunking runs is the thing people regret — a casing
// crossing the middle of the living room wall can't be undone once it's up — so
// the point of this module is to put the route on screen before it's built.

export const AIRCON_KINDS: ReadonlySet<ItemKind> = new Set<ItemKind>([
  'fancoil',
  'condenser',
])

/**
 * Cooling load per square metre. Singapore practice is 60–70 BTU/hr per sq ft;
 * 60 × 10.764 sq ft/m² lands just under 650, which sizes a 10 m² HDB bedroom at
 * a 9,000 BTU unit and a 20 m² living/dining at 18,000 — the fleet you actually
 * see quoted.
 */
export const BTU_PER_M2 = 650
/** A west-facing room takes the afternoon sun and needs the extra capacity. */
export const WEST_SUN_UPLIFT = 1.2
/** Below this a room is too small to be worth flagging as unconditioned. */
const MIN_CONDITIONED_AREA = 4
/** Above this ratio the unit is oversized: it short-cycles and doesn't dehumidify. */
const OVERSIZE_RATIO = 1.6
/** Per-fan-coil pipe length most single-split branches are rated for. */
export const MAX_RUN_LENGTH = 15
/** Total pipe length across a multi-split system before capacity drops off. */
export const MAX_TOTAL_LENGTH = 40
/** Kitchens, bathrooms and service areas aren't air-conditioned in an HDB flat. */
const UNCONDITIONED_NAME = /kitchen|bath|toilet|wc|shower|yard|service|utility|store|shelter|balcony|corridor|foyer|entry|hall(way)?/i

export function airconPlan(project: Project): AirconPlan {
  return (
    project.aircon ?? { runs: [], trunkingW: 0.1, trunkingH: 0.1 }
  )
}

export function fanCoils(project: Project): Item[] {
  return project.items.filter((i) => i.kind === 'fancoil')
}

export function condensers(project: Project): Item[] {
  return project.items.filter((i) => i.kind === 'condenser')
}

/** Rated cooling capacity of a fan coil or condenser, from its catalog params. */
export function btuOf(item: Item): number {
  const entry = catalogById(item.catalogId)
  return num(item.params?.btu, num(entry?.params?.btu, 0))
}

/** How many fan coils a condenser is built to drive — the N in "System N". */
export function systemSizeOf(item: Item): number {
  const entry = catalogById(item.catalogId)
  return Math.max(1, Math.round(num(item.params?.fancoils, num(entry?.params?.fancoils, 1))))
}

/** The height trunking runs at: tucked just under the ceiling. */
export function trunkingHeight(project: Project): number {
  return Math.max(0.5, (project.wallHeight || 2.8) - 0.15)
}

// ---- routing ---------------------------------------------------------------

export function runLength(points: Vec2[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i])
  return total
}

export function totalTrunkingLength(plan: AirconPlan): number {
  return plan.runs.reduce((s, r) => s + runLength(r.points), 0)
}

/** Shortest distance from a point to any wall centreline. */
function distToWalls(p: Vec2, walls: Wall[]): number {
  let best = Infinity
  for (const w of walls) {
    const d = projectOnSegment(p, w.a, w.b).dist
    if (d < best) best = d
  }
  return best
}

/**
 * How much of a candidate route hugs a wall, sampled every ~0.25 m. Trunking is
 * screwed to a wall or hidden in a bulkhead against one, so the leg that stays
 * near a wall is the one an installer would actually run — and the one that
 * doesn't cut across the middle of a ceiling.
 */
function wallHugScore(points: Vec2[], walls: Wall[]): number {
  if (!walls.length) return 0
  let near = 0
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const segLen = dist(points[i - 1], points[i])
    const steps = Math.max(1, Math.ceil(segLen / 0.25))
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps
      const p = {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        z: points[i - 1].z + (points[i].z - points[i - 1].z) * t,
      }
      total++
      if (distToWalls(p, walls) < 0.45) near++
    }
  }
  return total === 0 ? 0 : near / total
}

/** The two right-angled routes between two points: across x first, or across z first. */
export function elbowRoutes(from: Vec2, to: Vec2): { x: Vec2[]; z: Vec2[] } {
  return {
    x: [from, { x: to.x, z: from.z }, to],
    z: [from, { x: from.x, z: to.z }, to],
  }
}

/** Drop a corner that isn't really a corner (the two points already line up). */
function simplify(points: Vec2[]): Vec2[] {
  return points.filter(
    (p, i) => i === 0 || dist(p, points[i - 1]) > 1e-4,
  )
}

/**
 * Route trunking from a fan coil to a condenser as a right-angled run, picking
 * whichever elbow keeps more of the run against a wall. Pass `elbow` to force
 * one — that's what the panel's "flip elbow" does.
 */
export function routeTrunking(
  from: Vec2,
  to: Vec2,
  walls: Wall[],
  elbow?: 'x' | 'z',
): Vec2[] {
  const routes = elbowRoutes(from, to)
  if (elbow) return simplify(routes[elbow])
  const sx = wallHugScore(routes.x, walls)
  const sz = wallHugScore(routes.z, walls)
  return simplify(sz > sx ? routes.z : routes.x)
}

/**
 * Assign every fan coil to a condenser and route the trunking. Fan coils go to
 * the nearest condenser that still has a spare port, so a System 3 plus a
 * System 2 divides up the way an installer would rather than overloading one.
 */
export function autoRoute(project: Project): TrunkingRun[] {
  const coils = fanCoils(project)
  const outdoor = condensers(project)
  if (!coils.length || !outdoor.length) return []

  const y = trunkingHeight(project)
  const spare = new Map(outdoor.map((c) => [c.id, systemSizeOf(c)]))
  const existing = new Map(airconPlan(project).runs.map((r) => [r.fanCoilId, r]))

  // Nearest pairs first, so a fan coil right next to a condenser claims that port
  // before one across the flat takes it.
  const pairs = coils
    .flatMap((coil) =>
      outdoor.map((cond) => ({ coil, cond, d: dist(coil.position, cond.position) })),
    )
    .sort((a, b) => a.d - b.d)

  const assigned = new Map<string, Item>()
  for (const { coil, cond } of pairs) {
    if (assigned.has(coil.id)) continue
    const left = spare.get(cond.id) ?? 0
    if (left <= 0) continue
    assigned.set(coil.id, cond)
    spare.set(cond.id, left - 1)
  }
  // Anything left over has nowhere legitimate to go; hang it off the nearest
  // condenser anyway so the run is drawn and the overload check can report it.
  for (const coil of coils) {
    if (assigned.has(coil.id)) continue
    const nearest = outdoor.reduce((best, c) =>
      dist(coil.position, c.position) < dist(coil.position, best.position) ? c : best,
    )
    assigned.set(coil.id, nearest)
  }

  return coils.map((coil) => {
    const cond = assigned.get(coil.id)!
    // Keep a hand-flipped elbow if the pairing hasn't changed.
    const prev = existing.get(coil.id)
    const keep = prev && prev.condenserId === cond.id ? prev.elbowOf : undefined
    return {
      id: prev?.id ?? `run-${coil.id}`,
      fanCoilId: coil.id,
      condenserId: cond.id,
      points: routeTrunking(coil.position, cond.position, project.walls, keep),
      y,
      elbowOf: keep,
    }
  })
}

/** Which elbow a routed run used, so flipping it means picking the other one. */
export function elbowOfRun(run: TrunkingRun): 'x' | 'z' {
  if (run.elbowOf) return run.elbowOf
  const [a, b] = run.points
  if (!a || !b) return 'x'
  return Math.abs(b.x - a.x) > Math.abs(b.z - a.z) ? 'x' : 'z'
}

/** Drop runs whose fan coil or condenser is gone (e.g. the item was deleted). */
export function pruneRuns(project: Project): TrunkingRun[] {
  const plan = project.aircon
  if (!plan) return []
  const ids = new Set(project.items.map((i) => i.id))
  return plan.runs.filter((r) => ids.has(r.fanCoilId) && ids.has(r.condenserId))
}

// ---- room sizing -----------------------------------------------------------

export interface RoomCapacity {
  roomId: string
  roomName: string
  area: number
  /** BTU/hr the room needs, rounded up to the nearest 500. */
  required: number
  /** BTU/hr actually installed in the room. */
  installed: number
  fanCoils: number
  westSun: boolean
  /** True for kitchens, bathrooms and service areas — not expected to be cooled. */
  unconditioned: boolean
}

export function isUnconditioned(room: Room): boolean {
  return UNCONDITIONED_NAME.test(room.name)
}

export function requiredBtu(area: number, westSun: boolean): number {
  const raw = area * BTU_PER_M2 * (westSun ? WEST_SUN_UPLIFT : 1)
  return Math.ceil(raw / 500) * 500
}

export function roomCapacities(project: Project): RoomCapacity[] {
  const west = new Set(
    roomSunExposure(project)
      .filter((r) => r.afternoon)
      .map((r) => r.roomId),
  )
  const coils = fanCoils(project)
  return project.rooms
    .filter((r) => r.loop.length >= 3)
    .map((room) => {
      const area = Math.abs(polygonArea(room.loop))
      const inside = coils.filter((c) => pointInPolygon(c.position, room.loop))
      const westSun = west.has(room.id)
      return {
        roomId: room.id,
        roomName: room.name,
        area,
        required: requiredBtu(area, westSun),
        installed: inside.reduce((s, c) => s + btuOf(c), 0),
        fanCoils: inside.length,
        westSun,
        unconditioned: isUnconditioned(room),
      }
    })
}

// ---- checks ----------------------------------------------------------------

export type AirconIssueKind =
  | 'no-condenser'
  | 'no-fancoil'
  | 'overloaded'
  | 'undersized'
  | 'oversized'
  | 'long-run'
  | 'total-run'
  | 'off-ledge'
  | 'blows-at-bed'
  | 'mounted-low'

export interface AirconIssue {
  kind: AirconIssueKind
  message: string
  /** Item to select when the issue is clicked, when there is one. */
  itemId?: string
  roomId?: string
  severity: 'warn' | 'info'
}

const LABEL: Record<AirconIssueKind, string> = {
  'no-condenser': 'No condenser',
  'no-fancoil': 'No aircon',
  overloaded: 'System size',
  undersized: 'Undersized',
  oversized: 'Oversized',
  'long-run': 'Pipe run',
  'total-run': 'Pipe run',
  'off-ledge': 'Condenser',
  'blows-at-bed': 'Airflow',
  'mounted-low': 'Mounting',
}

export function airconIssueLabel(kind: AirconIssueKind): string {
  return LABEL[kind]
}

/** World-space direction a fan coil blows in: its local +z front face. */
export function blowDirection(item: Item): Vec2 {
  return { x: Math.sin(item.rotationY), z: Math.cos(item.rotationY) }
}

export function airconIssues(project: Project): AirconIssue[] {
  const coils = fanCoils(project)
  const outdoor = condensers(project)
  const plan = airconPlan(project)
  const issues: AirconIssue[] = []

  if (coils.length && !outdoor.length) {
    issues.push({
      kind: 'no-condenser',
      severity: 'warn',
      message: `${coils.length} fan coil${coils.length > 1 ? 's' : ''} with no condenser — add one on the aircon ledge.`,
    })
  }

  // fan coils vs the ports the condensers actually have
  const ports = outdoor.reduce((s, c) => s + systemSizeOf(c), 0)
  if (outdoor.length && coils.length > ports) {
    issues.push({
      kind: 'overloaded',
      severity: 'warn',
      itemId: outdoor[0].id,
      message: `${coils.length} fan coils on ${ports} condenser port${ports > 1 ? 's' : ''} — you need a bigger system (or a second condenser).`,
    })
  }

  // per-room capacity
  for (const cap of roomCapacities(project)) {
    if (cap.unconditioned) continue
    if (cap.area < MIN_CONDITIONED_AREA) continue
    if (cap.fanCoils === 0) {
      issues.push({
        kind: 'no-fancoil',
        severity: 'info',
        roomId: cap.roomId,
        message: `${cap.roomName} (${cap.area.toFixed(1)} m²) has no fan coil — it needs about ${fmtBtu(cap.required)} BTU.`,
      })
      continue
    }
    if (cap.installed < cap.required) {
      issues.push({
        kind: 'undersized',
        severity: 'warn',
        roomId: cap.roomId,
        message: `${cap.roomName} has ${fmtBtu(cap.installed)} BTU for ${cap.area.toFixed(1)} m² — about ${fmtBtu(cap.required)} is needed${cap.westSun ? ' (west-facing, so it runs hotter)' : ''}.`,
      })
    } else if (cap.installed > cap.required * OVERSIZE_RATIO) {
      issues.push({
        kind: 'oversized',
        severity: 'info',
        roomId: cap.roomId,
        message: `${cap.roomName} has ${fmtBtu(cap.installed)} BTU for ${cap.area.toFixed(1)} m² — oversized units short-cycle and leave the room clammy.`,
      })
    }
  }

  // pipe runs
  for (const run of plan.runs) {
    const L = runLength(run.points)
    if (L > MAX_RUN_LENGTH) {
      const coil = coils.find((c) => c.id === run.fanCoilId)
      issues.push({
        kind: 'long-run',
        severity: 'warn',
        itemId: run.fanCoilId,
        message: `${coil?.name ?? 'A fan coil'} is ${L.toFixed(1)} m of pipe from its condenser — past about ${MAX_RUN_LENGTH} m you lose capacity and need a bigger pipe size.`,
      })
    }
  }
  const total = totalTrunkingLength(plan)
  if (total > MAX_TOTAL_LENGTH) {
    issues.push({
      kind: 'total-run',
      severity: 'warn',
      message: `${total.toFixed(1)} m of trunking in total — check the total pipe length against the condenser's rating.`,
    })
  }

  // a condenser has to land on the ledge, not on the living room floor
  const ledges = project.items.filter((i) => i.catalogId === 'aircon-ledge')
  for (const c of outdoor) {
    if (!ledges.length) {
      issues.push({
        kind: 'off-ledge',
        severity: 'info',
        itemId: c.id,
        message: `${c.name} has no aircon ledge under it — add one from the HDB category so the height is right.`,
      })
      break
    }
    const near = ledges.some((l) => dist(l.position, c.position) < 1.2)
    if (!near) {
      issues.push({
        kind: 'off-ledge',
        severity: 'warn',
        itemId: c.id,
        message: `${c.name} isn't on an aircon ledge — HDB condensers go on the ledge, not inside the flat.`,
      })
    }
  }

  // fan coils
  for (const coil of coils) {
    if (coil.y < 1.8) {
      issues.push({
        kind: 'mounted-low',
        severity: 'warn',
        itemId: coil.id,
        message: `${coil.name} is mounted ${coil.y.toFixed(2)} m up — fan coils go near the ceiling so cold air falls across the room.`,
      })
    }
    const bed = bedInAirflow(coil, project)
    if (bed) {
      issues.push({
        kind: 'blows-at-bed',
        severity: 'info',
        itemId: coil.id,
        message: `${coil.name} blows straight onto ${bed.name} — turn it to run along the bed instead, or you'll wake up with a sore throat.`,
      })
    }
  }

  return issues
}

/**
 * A bed sitting in the fan coil's discharge, within the couple of metres where
 * the jet is still cold and fast. Only the head end matters, so the test is
 * whether the bed's centre is close to the axis the unit blows along.
 */
function bedInAirflow(coil: Item, project: Project): Item | null {
  const dir = blowDirection(coil)
  for (const bed of project.items) {
    if (bed.kind !== 'bed') continue
    const dx = bed.position.x - coil.position.x
    const dz = bed.position.z - coil.position.z
    const along = dx * dir.x + dz * dir.z
    if (along < 0.5 || along > 3.5) continue
    const across = Math.abs(dx * dir.z - dz * dir.x)
    if (across < 0.7) return bed
  }
  return null
}

export function fmtBtu(btu: number): string {
  return btu.toLocaleString('en-SG')
}

/** "System 3", or "System 3 + 2" when the flat has more than one condenser. */
export function systemLabel(project: Project): string | null {
  const outdoor = condensers(project)
  if (!outdoor.length) return null
  const sizes = outdoor.map(systemSizeOf).sort((a, b) => b - a)
  return `System ${sizes.join(' + ')}`
}
