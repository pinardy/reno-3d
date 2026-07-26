import { describe, it, expect } from 'vitest'
import { findIssues, wallRect, accessZone } from '../features/checks/clearance'
import { bearingOf, compassOf, roomSunExposure } from '../features/checks/sun'
import { rectsOverlap, pointInRect, rectCorners } from '../geometry/rect'
import { emptyProject, makeMaterial, type Item, type Project } from '../types/project'
import { newItemFromCatalog, catalogById } from '../features/catalog/catalog'
import { alignToItems, snapAngle } from '../features/scene/alignment'
import {
  shoppingListByRoom,
  furnitureTotal,
  UNPLACED,
} from '../features/persistence/shoppingList'

function itemOf(catalogId: string, x: number, z: number, rotationY = 0): Item {
  const entry = catalogById(catalogId)!
  return { ...newItemFromCatalog(entry, { x, z }), id: `${catalogId}@${x},${z}`, rotationY }
}

function projectWith(items: Item[], extra: Partial<Project> = {}): Project {
  return { ...emptyProject('test-project'), items, ...extra }
}

describe('oriented rectangles', () => {
  it('detects overlap and separation', () => {
    const a = { cx: 0, cz: 0, w: 1, d: 1, rot: 0 }
    expect(rectsOverlap(a, { ...a, cx: 0.5 })).toBe(true)
    expect(rectsOverlap(a, { ...a, cx: 2 })).toBe(false)
  })

  it('treats a touching edge as clear, given slack', () => {
    const a = { cx: 0, cz: 0, w: 1, d: 1, rot: 0 }
    const flush = { ...a, cx: 1 } // edges exactly meet
    expect(rectsOverlap(a, flush, 0.05)).toBe(false)
  })

  it('accounts for rotation', () => {
    const a = { cx: 0, cz: 0, w: 2, d: 0.2, rot: 0 }
    const across = { cx: 0.9, cz: 0, w: 2, d: 0.2, rot: Math.PI / 2 }
    expect(rectsOverlap(a, across)).toBe(true)
    expect(rectsOverlap(a, { ...across, cz: 3 })).toBe(false)
  })

  it('puts a rotated front where rotationY says it should be', () => {
    // rotationY sends local +z to (sin, cos): at 90° the front faces +x
    const corners = rectCorners({ cx: 0, cz: 0, w: 0.2, d: 2, rot: Math.PI / 2 })
    expect(Math.max(...corners.map((c) => c.x))).toBeCloseTo(1, 5)
    expect(Math.max(...corners.map((c) => c.z))).toBeCloseTo(0.1, 5)
  })

  it('builds a wall rect spanning a to b', () => {
    const r = wallRect({
      id: 'w',
      a: { x: 0, z: 0 },
      b: { x: 4, z: 0 },
      height: 2.8,
      thickness: 0.1,
      material: makeMaterial(),
    })
    expect(r.w).toBeCloseTo(4)
    expect(r.d).toBeCloseTo(0.1)
    expect(r.cx).toBeCloseTo(2)
    expect(pointInRect({ x: 3.5, z: 0 }, r)).toBe(true)
    expect(pointInRect({ x: 3.5, z: 1 }, r)).toBe(false)
  })
})

describe('clearance checks', () => {
  it('reports nothing for well-spaced furniture', () => {
    const p = projectWith([itemOf('sofa-3', 0, 0), itemOf('coffee-table', 0, 3)])
    expect(findIssues(p)).toEqual([])
  })

  it('flags two items in the same place', () => {
    const p = projectWith([itemOf('sofa-3', 0, 0), itemOf('bed-queen', 0.1, 0)])
    const kinds = findIssues(p).map((i) => i.kind)
    expect(kinds).toContain('overlap')
  })

  it('ignores rugs, which belong under furniture', () => {
    const p = projectWith([itemOf('rug', 0, 0), itemOf('coffee-table', 0, 0)])
    expect(findIssues(p).filter((i) => i.kind === 'overlap')).toEqual([])
  })

  it('ignores items stacked at different heights', () => {
    // a table lamp sits on a side table: same footprint, different span
    const p = projectWith([itemOf('side-table', 0, 0), itemOf('table-lamp', 0, 0)])
    expect(findIssues(p).filter((i) => i.kind === 'overlap')).toEqual([])
  })

  it('flags furniture sunk into a wall', () => {
    const wall = {
      id: 'w1',
      a: { x: -3, z: 0 },
      b: { x: 3, z: 0 },
      height: 2.8,
      thickness: 0.1,
      material: makeMaterial(),
    }
    const p = projectWith([itemOf('sofa-3', 0, 0)], { walls: [wall] })
    expect(findIssues(p).map((i) => i.kind)).toContain('in-wall')
  })

  it('lets a cabinet sit flush against a wall', () => {
    const wall = {
      id: 'w1',
      a: { x: -3, z: 0 },
      b: { x: 3, z: 0 },
      height: 2.8,
      thickness: 0.1,
      material: makeMaterial(),
    }
    // back on the wall face: half depth (0.3) + half thickness (0.05)
    const p = projectWith([itemOf('base-cabinet', 0, 0.35)], { walls: [wall] })
    expect(findIssues(p).filter((i) => i.kind === 'in-wall')).toEqual([])
  })

  it('flags a wardrobe with no room to open', () => {
    // wardrobe front faces +z; park a bed right in front of it
    const p = projectWith([itemOf('wardrobe', 0, 0), itemOf('bed-queen', 0, 0.75)])
    expect(findIssues(p).map((i) => i.kind)).toContain('access')
  })

  it('gives the wardrobe a clear zone in front, not behind', () => {
    const zone = accessZone({
      item: itemOf('wardrobe', 0, 0),
      rect: { cx: 0, cz: 0, w: 1.2, d: 0.6, rot: 0 },
      y0: 0,
      y1: 2.2,
    })!
    expect(zone.cz).toBeGreaterThan(0)
  })

  it('flags furniture standing in a door swing', () => {
    const wall = {
      id: 'w1',
      a: { x: -3, z: 0 },
      b: { x: 3, z: 0 },
      height: 2.8,
      thickness: 0.1,
      material: makeMaterial(),
    }
    const door = {
      id: 'd1',
      wallId: 'w1',
      type: 'door' as const,
      offset: 3, // centre of the wall
      width: 0.9,
      height: 2.1,
      sillHeight: 0,
    }
    const clear = projectWith([itemOf('coffee-table', 0, 2.5)], {
      walls: [wall],
      openings: [door],
    })
    expect(clear.items.length).toBe(1)
    expect(findIssues(clear).filter((i) => i.kind === 'door-blocked')).toEqual([])

    const blocked = projectWith([itemOf('coffee-table', 0.3, 0.7)], {
      walls: [wall],
      openings: [door],
    })
    expect(findIssues(blocked).map((i) => i.kind)).toContain('door-blocked')
  })
})

describe('sun exposure', () => {
  it('maps world directions to bearings with the plan facing north', () => {
    expect(bearingOf({ x: 0, z: -1 }, 0)).toBeCloseTo(0) // plan-up is north
    expect(bearingOf({ x: 1, z: 0 }, 0)).toBeCloseTo(90)
    expect(bearingOf({ x: 0, z: 1 }, 0)).toBeCloseTo(180)
    expect(bearingOf({ x: -1, z: 0 }, 0)).toBeCloseTo(270)
  })

  it('rotates bearings with the plan orientation', () => {
    expect(bearingOf({ x: 0, z: -1 }, 90)).toBeCloseTo(90)
    expect(bearingOf({ x: -1, z: 0 }, 180)).toBeCloseTo(90)
  })

  it('names the compass points', () => {
    expect(compassOf(0)).toBe('N')
    expect(compassOf(46)).toBe('NE')
    expect(compassOf(270)).toBe('W')
    expect(compassOf(359)).toBe('N')
  })

  it('reports a west-facing window as afternoon sun', () => {
    // room spanning x 0..4, z 0..3; wall on the x=0 side faces west
    const wall = {
      id: 'w',
      a: { x: 0, z: 0 },
      b: { x: 0, z: 3 },
      height: 2.8,
      thickness: 0.1,
      material: makeMaterial(),
    }
    const project = projectWith([], {
      walls: [wall],
      openings: [
        {
          id: 'win',
          wallId: 'w',
          type: 'window',
          offset: 1.5,
          width: 1.2,
          height: 1.2,
          sillHeight: 0.9,
        },
      ],
      rooms: [
        {
          id: 'r',
          name: 'Bedroom',
          loop: [
            { x: 0, z: 0 },
            { x: 4, z: 0 },
            { x: 4, z: 3 },
            { x: 0, z: 3 },
          ],
          floorMaterial: makeMaterial(),
          ceilingMaterial: makeMaterial(),
          showCeiling: false,
        },
      ],
    })
    const [sun] = roomSunExposure(project)
    expect(sun.roomName).toBe('Bedroom')
    expect(sun.facings).toEqual(['W'])
    expect(sun.afternoon).toBe(true)
    expect(sun.morning).toBe(false)
  })

  it('ignores solid doors, which let no light in', () => {
    const project = projectWith([], {
      walls: [
        {
          id: 'w',
          a: { x: 0, z: 0 },
          b: { x: 0, z: 3 },
          height: 2.8,
          thickness: 0.1,
          material: makeMaterial(),
        },
      ],
      openings: [
        {
          id: 'd',
          wallId: 'w',
          type: 'door',
          offset: 1.5,
          width: 0.9,
          height: 2.1,
          sillHeight: 0,
        },
      ],
      rooms: [
        {
          id: 'r',
          name: 'Bedroom',
          loop: [
            { x: 0, z: 0 },
            { x: 4, z: 0 },
            { x: 4, z: 3 },
            { x: 0, z: 3 },
          ],
          floorMaterial: makeMaterial(),
          ceilingMaterial: makeMaterial(),
          showCeiling: false,
        },
      ],
    })
    expect(roomSunExposure(project)).toEqual([])
  })
})

describe('alignment + snapping', () => {
  it('pulls a dragged item onto a neighbour’s centre line', () => {
    const items = [itemOf('coffee-table', 2, 5)]
    const { point, guides } = alignToItems({ x: 2.04, z: 1 }, 'dragged', items)
    expect(point.x).toBeCloseTo(2)
    expect(point.z).toBeCloseTo(1) // z was nowhere near, so left alone
    expect(guides.map((g) => g.axis)).toEqual(['x'])
  })

  it('leaves a position alone when nothing is close', () => {
    const items = [itemOf('coffee-table', 2, 5)]
    const { point, guides } = alignToItems({ x: 4, z: 1 }, 'dragged', items)
    expect(point).toEqual({ x: 4, z: 1 })
    expect(guides).toEqual([])
  })

  it('never snaps an item to itself', () => {
    const self = itemOf('coffee-table', 2, 5)
    const { point, guides } = alignToItems({ x: 2.01, z: 5.01 }, self.id, [self])
    expect(point).toEqual({ x: 2.01, z: 5.01 })
    expect(guides).toEqual([])
  })

  it('snaps rotation to 15 degree steps', () => {
    const deg = (r: number) => (r * 180) / Math.PI
    expect(deg(snapAngle(0.05))).toBeCloseTo(0)
    expect(deg(snapAngle((14 * Math.PI) / 180))).toBeCloseTo(15)
    expect(deg(snapAngle((88 * Math.PI) / 180))).toBeCloseTo(90)
    expect(deg(snapAngle((-46 * Math.PI) / 180))).toBeCloseTo(-45)
  })
})

describe('shopping list by room', () => {
  const room = (name: string, x0: number, x1: number) => ({
    id: name,
    name,
    loop: [
      { x: x0, z: 0 },
      { x: x1, z: 0 },
      { x: x1, z: 4 },
      { x: x0, z: 4 },
    ],
    floorMaterial: makeMaterial(),
    ceilingMaterial: makeMaterial(),
    showCeiling: false,
  })

  it('groups items by the room they stand in', () => {
    const p = projectWith([itemOf('sofa-3', 1, 2), itemOf('bed-queen', 6, 2)], {
      rooms: [room('Living', 0, 4), room('Bedroom', 5, 9)],
    })
    const groups = shoppingListByRoom(p)
    expect(groups.map((g) => g.room).sort()).toEqual(['Bedroom', 'Living'])
    expect(groups.find((g) => g.room === 'Living')!.lines[0].name).toBe('3-seat Sofa')
  })

  it('collects items outside every room, and puts that group last', () => {
    const p = projectWith([itemOf('sofa-3', 1, 2), itemOf('piano', 40, 40)], {
      rooms: [room('Living', 0, 4)],
    })
    const groups = shoppingListByRoom(p)
    expect(groups[groups.length - 1].room).toBe(UNPLACED)
  })

  it('totals per room and matches the flat total', () => {
    const p = projectWith([itemOf('sofa-3', 1, 2), itemOf('bed-queen', 6, 2)], {
      rooms: [room('Living', 0, 4), room('Bedroom', 5, 9)],
    })
    const sum = shoppingListByRoom(p).reduce((s, g) => s + g.total, 0)
    expect(sum).toBe(furnitureTotal(p))
  })
})
