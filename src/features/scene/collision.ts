import type * as THREE from 'three'
import type { Vec2, Wall } from '../../types/project'
import { projectOnSegment, dist } from '../../geometry/vec'
import { useStore } from '../../store/store'

// Push a walker position out of any wall it penetrates. Openings that are open
// at the given eye height (doors always; windows only within their vertical
// span) are treated as passable gaps.
export function resolveWallCollision(pos: THREE.Vector3, eyeY: number) {
  const { walls, openings } = useStore.getState().project
  const radius = 0.28
  for (const w of walls) {
    const proj = projectOnSegment({ x: pos.x, z: pos.z }, w.a, w.b)
    const minDist = radius + w.thickness / 2
    if (proj.dist >= minDist || proj.dist < 1e-5) continue
    const offset = dist(w.a, proj.point)
    const passable = openings.some((o) => {
      if (o.wallId !== w.id) return false
      if (Math.abs(offset - o.offset) >= o.width / 2) return false
      return eyeY >= o.sillHeight && eyeY <= o.sillHeight + o.height
    })
    if (passable) continue
    const nx = (pos.x - proj.point.x) / proj.dist
    const nz = (pos.z - proj.point.z) / proj.dist
    pos.x = proj.point.x + nx * minDist
    pos.z = proj.point.z + nz * minDist
  }
}

// Snap a cabinet so its back sits against the nearest wall (within maxDist).
// Returns snapped position + rotation, or null if no wall is close enough.
export function snapCabinetToWall(
  pos: Vec2,
  depth: number,
  walls: Wall[],
  maxDist = 0.7,
): { x: number; z: number; rotationY: number } | null {
  let best: { w: Wall; point: Vec2 } | null = null
  let bestD = maxDist
  for (const w of walls) {
    const proj = projectOnSegment(pos, w.a, w.b)
    if (proj.t <= 0.001 || proj.t >= 0.999) continue
    if (proj.dist < bestD) {
      bestD = proj.dist
      best = { w, point: proj.point }
    }
  }
  if (!best) return null
  const w = best.w
  const L = dist(w.a, w.b)
  if (L < 1e-4) return null
  const dirx = (w.b.x - w.a.x) / L
  const dirz = (w.b.z - w.a.z) / L
  let nx = -dirz
  let nz = dirx
  // point the normal toward the current (interior) side
  if (nx * (pos.x - best.point.x) + nz * (pos.z - best.point.z) < 0) {
    nx = -nx
    nz = -nz
  }
  const off = depth / 2 + w.thickness / 2
  return {
    x: best.point.x + nx * off,
    z: best.point.z + nz * off,
    rotationY: Math.atan2(nx, nz), // local +z (front) faces the interior normal
  }
}
