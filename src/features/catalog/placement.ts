import type { Item, Vec2 } from '../../types/project'
import { dist } from '../../geometry/vec'

const OCCUPIED = 0.35 // metres: closer than this and the two items read as one pile
const STEP = 0.55 // how far each ring sits from the last

/**
 * Step a spot clear of items already standing there. Adds all aim at the same
 * focus point, so without this a run of clicks buries each item inside the last.
 * Searches rings of candidates around `pos`; returns `pos` if the area is full.
 */
export function clearOf(pos: Vec2, items: Item[], rings = 3): Vec2 {
  const taken = (p: Vec2) => items.some((i) => dist(i.position, p) < OCCUPIED)
  if (!taken(pos)) return pos
  for (let ring = 1; ring <= rings; ring++) {
    for (let step = 0; step < 8; step++) {
      const a = (step / 8) * Math.PI * 2
      const c = {
        x: pos.x + Math.cos(a) * STEP * ring,
        z: pos.z + Math.sin(a) * STEP * ring,
      }
      if (!taken(c)) return c
    }
  }
  return pos
}
