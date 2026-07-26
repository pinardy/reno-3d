import type { Project, Vec2 } from '../../types/project'
import { dist, pointInPolygon } from '../../geometry/vec'

// Which way each room's glazing faces, and so when it takes sun. In Singapore the
// afternoon west sun is the one people plan around — a west-facing bedroom runs
// hot from about 3pm and drives aircon load and curtain choices.

export type Compass8 = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

const POINTS: Compass8[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export const MORNING: ReadonlySet<Compass8> = new Set<Compass8>(['NE', 'E', 'SE'])
export const AFTERNOON: ReadonlySet<Compass8> = new Set<Compass8>(['SW', 'W', 'NW'])

export interface RoomSun {
  roomId: string
  roomName: string
  facings: Compass8[] // sorted, de-duplicated
  windows: number
  morning: boolean
  afternoon: boolean
}

/**
 * Compass bearing (degrees clockwise from North) of a world-space direction.
 * Plan-up is -z and faces `orientationDeg`, matching how Lighting places the sun.
 */
export function bearingOf(dir: Vec2, orientationDeg: number): number {
  const local = (Math.atan2(dir.x, -dir.z) * 180) / Math.PI
  return ((local + orientationDeg) % 360 + 360) % 360
}

export function compassOf(bearing: number): Compass8 {
  const i = Math.round((((bearing % 360) + 360) % 360) / 45) % 8
  return POINTS[i]
}

/** Windows and sliding doors let light in; solid doors and cased openings don't. */
const GLAZED = new Set(['window', 'sliding'])

export function roomSunExposure(project: Project): RoomSun[] {
  const orientation = project.orientationDeg ?? 0
  const byRoom = new Map<string, Compass8[]>()

  for (const op of project.openings) {
    if (!GLAZED.has(op.type)) continue
    const wall = project.walls.find((w) => w.id === op.wallId)
    if (!wall) continue
    const L = dist(wall.a, wall.b)
    if (L < 1e-6) continue

    const dir = { x: (wall.b.x - wall.a.x) / L, z: (wall.b.z - wall.a.z) / L }
    const mid = {
      x: wall.a.x + dir.x * op.offset,
      z: wall.a.z + dir.z * op.offset,
    }
    const n = { x: -dir.z, z: dir.x }

    // step off each face; whichever lands inside a room tells us that room owns
    // the window, and the opposite normal is the outward (sun-facing) direction
    for (const s of [1, -1]) {
      const probe = { x: mid.x + n.x * 0.4 * s, z: mid.z + n.z * 0.4 * s }
      const room = project.rooms.find((r) => r.loop.length >= 3 && pointInPolygon(probe, r.loop))
      if (!room) continue
      const outward = { x: -n.x * s, z: -n.z * s }
      const facing = compassOf(bearingOf(outward, orientation))
      const list = byRoom.get(room.id) ?? []
      list.push(facing)
      byRoom.set(room.id, list)
    }
  }

  return project.rooms
    .filter((r) => byRoom.has(r.id))
    .map((r) => {
      const all = byRoom.get(r.id)!
      const facings = POINTS.filter((p) => all.includes(p))
      return {
        roomId: r.id,
        roomName: r.name,
        windows: all.length,
        facings,
        morning: facings.some((f) => MORNING.has(f)),
        afternoon: facings.some((f) => AFTERNOON.has(f)),
      }
    })
}
