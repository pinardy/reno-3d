import { describe, it, expect } from 'vitest'
import { clearOf, clearForItems } from '../features/catalog/placement'
import { makeMaterial, type Item, type Room, type Vec2, type Wall } from '../types/project'
import { dist, pointInPolygon } from '../geometry/vec'
import { catalogById, newItemFromCatalog } from '../features/catalog/catalog'
import { findIssues } from '../features/checks/clearance'
import { emptyProject } from '../types/project'

/**
 * Does the layout checker report `candidate` as overlapping any of `others`? Using
 * the real check is the point: a spot the placement search calls clear must also
 * be a spot the user never sees a warning about.
 */
function overlaps(candidate: Item, others: Item[]): boolean {
  const p = { ...emptyProject('t'), items: [...others, candidate] }
  return findIssues(p).some((i) => i.kind === 'overlap')
}

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

describe('clearForItems', () => {
  const ORIGIN = { x: 0, z: 0 }
  /** A real catalog item, so the search has a footprint to work with. */
  const of = (catalogId: string, id: string, x = 0, z = 0): Item => ({
    ...newItemFromCatalog(catalogById(catalogId)!, { x, z }),
    id,
  })
  const probe = (item: Item, offset: Vec2 = ORIGIN) => ({ item, offset })

  it('leaves an empty spot untouched', () => {
    const sofa = of('sofa-3', 'p')
    expect(clearForItems({ x: 2, z: 3 }, [probe(sofa)], { items: [] })).toEqual({ x: 2, z: 3 })
  })

  it('spaces a big item by its own size, not by a fixed radius', () => {
    // A 2.0 x 0.9m sofa: the old fixed 0.35m test called 0.55m aside "clear",
    // which still overlaps by more than a metre.
    const standing = of('sofa-3', 'a', 0, 0)
    const p = clearForItems(ORIGIN, [probe(of('sofa-3', 'p'))], { items: [standing] })
    expect(dist(p, ORIGIN)).toBeGreaterThan(0.55)
    expect(overlaps(of('sofa-3', 'p', p.x, p.z), [standing])).toBe(false)
  })

  it('never lands a repeated paste overlapping, however many times', () => {
    const placed: Item[] = []
    for (let n = 0; n < 6; n++) {
      const p = clearForItems(ORIGIN, [probe(of('sofa-3', `p${n}`))], { items: placed })
      const landed = of('sofa-3', `i${n}`, p.x, p.z)
      expect(overlaps(landed, placed)).toBe(false)
      placed.push(landed)
    }
    expect(placed).toHaveLength(6)
  })

  it('steps aside when a group member clashes even though the anchor is clear', () => {
    // 'a' sits where the pair's right-hand member would land; the anchor itself
    // is in the gap between the two, so testing it alone would say "fine"
    const standing = of('chair', 'a', 0.7, 0)
    const pair = [
      probe(of('chair', 'l'), { x: -0.7, z: 0 }),
      probe(of('chair', 'r'), { x: 0.7, z: 0 }),
    ]
    const p = clearForItems(ORIGIN, pair, { items: [standing] })
    expect(p).not.toEqual(ORIGIN)
    for (const q of pair)
      expect(
        overlaps(of('chair', 'x', p.x + q.offset.x, p.z + q.offset.z), [standing]),
      ).toBe(false)
  })

  it('ignores an item it clears vertically, so a wall cabinet can go over a base unit', () => {
    const base = of('base-cabinet', 'base', 0, 0)
    const upper = of('wall-cabinet-90', 'upper', 0, 0)
    expect(upper.y).toBeGreaterThan(1) // hangs above the worktop
    // directly over the base unit is exactly where it belongs
    expect(clearForItems(ORIGIN, [probe(upper)], { items: [base] })).toEqual(ORIGIN)
  })

  it('falls back to the pile test for an item with no catalog entry', () => {
    const glb: Item = { ...of('sofa-3', 'g'), catalogId: 'glb', kind: 'glb' }
    const p = clearForItems(ORIGIN, [probe(glb)], { items: [itemAt('a', 0, 0)] })
    expect(nearest(p, [itemAt('a', 0, 0)])).toBeGreaterThanOrEqual(0.35)
  })

  it('keeps the copy out of the walls rather than pushing it through one', () => {
    // a 3m-wide room; stepping aside from the sofa already in it must not land
    // the copy in a wall, which is what happens when only items are considered
    const walls = room3m()
    const standing = of('sofa-3', 'a', 1.5, 1.5)
    const p = clearForItems(ORIGIN, [probe(of('sofa-3', 'p'))], { items: [standing], walls })
    const landed = of('sofa-3', 'q', p.x, p.z)
    expect(inAWall(landed, walls)).toBe(false)
  })

  it('still reports a wall clash when walls are not passed, so the guard is doing the work', () => {
    const walls = room3m()
    const standing = of('sofa-3', 'a', 1.5, 1.5)
    const naive = clearForItems(ORIGIN, [probe(of('sofa-3', 'p'))], { items: [standing] })
    const guarded = clearForItems(ORIGIN, [probe(of('sofa-3', 'p'))], { items: [standing], walls })
    expect(guarded).not.toEqual(naive)
  })

  it('keeps a copy inside the flat when the plan has rooms', () => {
    const walls = room3m()
    const rooms = [floor3m()]
    const standing = of('sofa-3', 'a', 1.5, 1.5)
    // aim at the middle of the little room, which is already taken
    const p = clearForItems({ x: 1.5, z: 1.5 }, [probe(of('sofa-3', 'p'))], {
      items: [standing],
      walls,
      rooms,
    })
    expect(pointInPolygon(p, rooms[0].loop)).toBe(true)
  })

  it('settles for overlapping rather than for a wall when the room is full', () => {
    // A 3m room with a sofa dead centre has nowhere clear for a second 2m sofa,
    // so the search has to choose which compromise to make.
    const walls = room3m()
    const rooms = [floor3m()]
    const standing = of('sofa-3', 'a', 1.5, 1.5)
    const p = clearForItems({ x: 1.5, z: 1.5 }, [probe(of('sofa-3', 'p'))], {
      items: [standing],
      walls,
      rooms,
    })
    const landed = of('sofa-3', 'q', p.x, p.z)
    // in-bounds is the property worth keeping; overlapping is one drag from fixed
    expect(inAWall(landed, walls)).toBe(false)
    expect(pointInPolygon(p, rooms[0].loop)).toBe(true)
  })
})

/** Four walls enclosing a 3 x 3m room with its corner at the origin. */
function room3m(): Wall[] {
  const corners: [number, number][] = [
    [0, 0],
    [3, 0],
    [3, 3],
    [0, 3],
  ]
  return corners.map((c, i) => {
    const n = corners[(i + 1) % corners.length]
    return {
      id: `w${i}`,
      a: { x: c[0], z: c[1] },
      b: { x: n[0], z: n[1] },
      height: 2.8,
      thickness: 0.1,
      material: makeMaterial(),
    }
  })
}

/** The floor polygon matching room3m(), inset to the inner face of the walls. */
function floor3m(): Room {
  return {
    id: 'r1',
    name: 'Room',
    loop: [
      { x: 0.05, z: 0.05 },
      { x: 2.95, z: 0.05 },
      { x: 2.95, z: 2.95 },
      { x: 0.05, z: 2.95 },
    ],
    floorMaterial: makeMaterial(),
    ceilingMaterial: makeMaterial(),
    showCeiling: false,
  }
}

function inAWall(candidate: Item, walls: Wall[]): boolean {
  const p = { ...emptyProject('t'), walls, items: [candidate] }
  return findIssues(p).some((i) => i.kind === 'in-wall')
}
