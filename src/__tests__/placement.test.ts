import { describe, it, expect } from 'vitest'
import { clearOf } from '../features/catalog/placement'
import { makeMaterial, type Item, type Vec2 } from '../types/project'
import { dist } from '../geometry/vec'

function itemAt(id: string, x: number, z: number): Item {
  return {
    id,
    catalogId: 'test',
    kind: 'table',
    name: 'Test',
    position: { x, z },
    y: 0,
    rotationY: 0,
    scale: 1,
    material: makeMaterial(),
  }
}

const nearest = (p: Vec2, items: Item[]) =>
  Math.min(...items.map((i) => dist(i.position, p)))

describe('clearOf', () => {
  it('leaves an empty spot untouched', () => {
    expect(clearOf({ x: 2, z: 3 }, [])).toEqual({ x: 2, z: 3 })
  })

  it('leaves a spot untouched when nearby items are not on top of it', () => {
    const items = [itemAt('a', 3, 3)]
    expect(clearOf({ x: 2, z: 3 }, items)).toEqual({ x: 2, z: 3 })
  })

  it('steps aside when an item already occupies the spot', () => {
    const items = [itemAt('a', 2, 3)]
    const p = clearOf({ x: 2, z: 3 }, items)
    expect(p).not.toEqual({ x: 2, z: 3 })
    expect(nearest(p, items)).toBeGreaterThanOrEqual(0.35)
  })

  it('stays near the requested spot rather than wandering off', () => {
    const items = [itemAt('a', 2, 3)]
    const p = clearOf({ x: 2, z: 3 }, items)
    expect(dist(p, { x: 2, z: 3 })).toBeLessThanOrEqual(0.6)
  })

  it('keeps finding room as items pile up, so a run of adds never overlaps', () => {
    const placed: Item[] = []
    for (let n = 0; n < 8; n++) {
      const p = clearOf({ x: 0, z: 0 }, placed)
      if (placed.length) expect(nearest(p, placed)).toBeGreaterThanOrEqual(0.35)
      placed.push(itemAt(`i${n}`, p.x, p.z))
    }
    expect(placed).toHaveLength(8)
  })

  it('gives up on the original spot when every ring is full', () => {
    // blanket the search area so no candidate can be clear
    const items: Item[] = []
    let n = 0
    for (let x = -3; x <= 3; x += 0.25)
      for (let z = -3; z <= 3; z += 0.25) items.push(itemAt(`i${n++}`, x, z))
    expect(clearOf({ x: 0, z: 0 }, items)).toEqual({ x: 0, z: 0 })
  })
})
