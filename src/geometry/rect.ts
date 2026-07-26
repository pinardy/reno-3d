import type { Vec2 } from '../types/project'

/**
 * An oriented rectangle on the x/z ground plane.
 *
 * `rot` follows the scene's rotationY convention: rotating by it sends the local
 * +z axis (an item's front) to world (sin rot, cos rot), and local +x (its width)
 * to (cos rot, -sin rot). See snapCabinetToWall, which derives rotationY the same
 * way, so footprints here match what actually gets rendered.
 */
export interface Rect {
  cx: number
  cz: number
  w: number // extent along the local x axis
  d: number // extent along the local z axis
  rot: number // radians
}

/** Local axes in world space: u spans the width, v spans the depth. */
export function rectAxes(rot: number): { u: Vec2; v: Vec2 } {
  return {
    u: { x: Math.cos(rot), z: -Math.sin(rot) },
    v: { x: Math.sin(rot), z: Math.cos(rot) },
  }
}

export function rectCorners(r: Rect): Vec2[] {
  const { u, v } = rectAxes(r.rot)
  const hw = r.w / 2
  const hd = r.d / 2
  return [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ].map(([su, sv]) => ({
    x: r.cx + u.x * hw * su + v.x * hd * sv,
    z: r.cz + u.z * hw * su + v.z * hd * sv,
  }))
}

export function pointInRect(p: Vec2, r: Rect): boolean {
  const { u, v } = rectAxes(r.rot)
  const dx = p.x - r.cx
  const dz = p.z - r.cz
  return (
    Math.abs(dx * u.x + dz * u.z) <= r.w / 2 && Math.abs(dx * v.x + dz * v.z) <= r.d / 2
  )
}

/**
 * Separating-axis test. `slack` shrinks both rectangles, so rectangles that
 * merely touch (or overlap by less than `slack`) don't count — furniture pushed
 * flush against a wall or a neighbour is intentional, not a mistake.
 */
export function rectsOverlap(a: Rect, b: Rect, slack = 0): boolean {
  const axesA = rectAxes(a.rot)
  const axesB = rectAxes(b.rot)
  const ha = { w: Math.max(0, a.w / 2 - slack / 2), d: Math.max(0, a.d / 2 - slack / 2) }
  const hb = { w: Math.max(0, b.w / 2 - slack / 2), d: Math.max(0, b.d / 2 - slack / 2) }
  const dx = b.cx - a.cx
  const dz = b.cz - a.cz

  for (const n of [axesA.u, axesA.v, axesB.u, axesB.v]) {
    const ra =
      Math.abs(axesA.u.x * n.x + axesA.u.z * n.z) * ha.w +
      Math.abs(axesA.v.x * n.x + axesA.v.z * n.z) * ha.d
    const rb =
      Math.abs(axesB.u.x * n.x + axesB.u.z * n.z) * hb.w +
      Math.abs(axesB.v.x * n.x + axesB.v.z * n.z) * hb.d
    if (Math.abs(dx * n.x + dz * n.z) > ra + rb) return false // separated on this axis
  }
  return true
}

/** Do two closed intervals overlap by more than `slack`? */
export function spansOverlap(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
  slack = 0,
): boolean {
  return Math.min(a1, b1) - Math.max(a0, b0) > slack
}
