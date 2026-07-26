import type { Item, Vec2 } from '../../types/project'

// While dragging, pull an item into line with the ones already placed. Nothing
// here touches the scene: it returns the adjusted point plus the guide lines to
// draw, so it can be tested on its own.

export const SNAP_RANGE = 0.08 // metres of pull towards an existing edge/centre
const GUIDE_REACH = 6 // how far a guide line extends either side, metres

export interface Guide {
  axis: 'x' | 'z' // the coordinate being matched
  at: number
  from: number // extent of the line along the other axis
  to: number
}

export interface AlignResult {
  point: Vec2
  guides: Guide[]
}

/**
 * Snap `pos` so the dragged item lines up with another item's centre on either
 * axis. Centres only — matching edges too fires so often on a floor plan that the
 * guides become noise, and centre alignment is what reads as "tidy".
 */
export function alignToItems(
  pos: Vec2,
  movingId: string,
  items: Item[],
  range = SNAP_RANGE,
): AlignResult {
  const others = items.filter((i) => i.id !== movingId)
  const out: Vec2 = { x: pos.x, z: pos.z }
  const guides: Guide[] = []

  for (const axis of ['x', 'z'] as const) {
    let best: { at: number; d: number } | null = null
    for (const o of others) {
      const d = Math.abs(o.position[axis] - pos[axis])
      if (d <= range && (!best || d < best.d)) best = { at: o.position[axis], d }
    }
    if (!best) continue
    out[axis] = best.at
    const other = axis === 'x' ? 'z' : 'x'
    const coords = others
      .filter((o) => Math.abs(o.position[axis] - best!.at) <= 1e-6)
      .map((o) => o.position[other])
      .concat(pos[other])
    guides.push({
      axis,
      at: best.at,
      from: Math.min(...coords) - GUIDE_REACH / 6,
      to: Math.max(...coords) + GUIDE_REACH / 6,
    })
  }

  return { point: out, guides }
}

/** Nearest multiple of `stepDeg` degrees, in radians. */
export function snapAngle(rad: number, stepDeg = 15): number {
  const step = (stepDeg * Math.PI) / 180
  return Math.round(rad / step) * step
}
