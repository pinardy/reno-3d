import type { Vec2 } from '../types/project'

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, z: a.z + b.z })
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, z: a.z - b.z })
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, z: a.z * s })
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.z * b.z
export const len = (a: Vec2): number => Math.hypot(a.x, a.z)
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z)

export function normalize(a: Vec2): Vec2 {
  const l = len(a)
  return l === 0 ? { x: 0, z: 0 } : { x: a.x / l, z: a.z / l }
}

/** perpendicular (rotate 90deg) */
export const perp = (a: Vec2): Vec2 => ({ x: -a.z, z: a.x })

export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  z: a.z + (b.z - a.z) * t,
})

/** Project point p onto segment a-b, returns { t (0..1 clamped), point, dist } */
export function projectOnSegment(p: Vec2, a: Vec2, b: Vec2) {
  const ab = sub(b, a)
  const abLen2 = dot(ab, ab)
  let t = abLen2 === 0 ? 0 : dot(sub(p, a), ab) / abLen2
  t = Math.max(0, Math.min(1, t))
  const point = add(a, scale(ab, t))
  return { t, point, dist: dist(p, point) }
}

/** Signed area of polygon (positive = CCW in x/z with z up-screen). */
export function polygonArea(pts: Vec2[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    a += p.x * q.z - q.x * p.z
  }
  return a / 2
}

/** Centroid of a polygon. */
export function polygonCentroid(pts: Vec2[]): Vec2 {
  let x = 0
  let z = 0
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    const cross = p.x * q.z - q.x * p.z
    a += cross
    x += (p.x + q.x) * cross
    z += (p.z + q.z) * cross
  }
  a *= 0.5
  if (Math.abs(a) < 1e-9) {
    // degenerate: average
    const avg = pts.reduce((acc, p) => add(acc, p), { x: 0, z: 0 })
    return scale(avg, 1 / pts.length)
  }
  return { x: x / (6 * a), z: z / (6 * a) }
}

export function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i]
    const pj = poly[j]
    const intersect =
      pi.z > p.z !== pj.z > p.z &&
      p.x < ((pj.x - pi.x) * (p.z - pi.z)) / (pj.z - pi.z) + pi.x
    if (intersect) inside = !inside
  }
  return inside
}

export function snapAngle(a: Vec2, b: Vec2, stepDeg = 15): Vec2 {
  // snap the direction a->b to nearest stepDeg, keep length
  const d = sub(b, a)
  const l = len(d)
  if (l < 1e-6) return b
  const ang = Math.atan2(d.z, d.x)
  const step = (stepDeg * Math.PI) / 180
  const snapped = Math.round(ang / step) * step
  return { x: a.x + Math.cos(snapped) * l, z: a.z + Math.sin(snapped) * l }
}
