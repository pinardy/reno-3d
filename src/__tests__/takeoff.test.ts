import { describe, it, expect } from 'vitest'
import {
  DEFAULT_WASTAGE,
  PAINT_COVERAGE,
  isWetRoom,
  paintQuantity,
  skirtingPieces,
  takeoff,
  tileQuantity,
  tileSizeById,
  TILE_SIZES,
} from '../features/takeoff/takeoff'
import {
  emptyProject,
  makeMaterial,
  type Opening,
  type Project,
  type Room,
  type Wall,
} from '../types/project'
import { TEMPLATES } from '../features/sample/templates'

const H = 2.8
const T = 0.1

function wall(ax: number, az: number, bx: number, bz: number): Wall {
  return {
    id: `w${ax},${az}-${bx},${bz}`,
    a: { x: ax, z: az },
    b: { x: bx, z: bz },
    height: H,
    thickness: T,
    material: makeMaterial(),
  }
}

function room(name: string, x: number, z: number, w: number, d: number): Room {
  const i = 0.05 // inset to the inner wall face, as the templates do
  return {
    id: `room-${name}`,
    name,
    loop: [
      { x: x + i, z: z + i },
      { x: x + w - i, z: z + i },
      { x: x + w - i, z: z + d - i },
      { x: x + i, z: z + d - i },
    ],
    floorMaterial: makeMaterial(),
    ceilingMaterial: makeMaterial(),
    showCeiling: false,
  }
}

/** A single 4 x 3m room, walls all round. */
function box(name = 'Bedroom', w = 4, d = 3): Project {
  return {
    ...emptyProject('t'),
    wallHeight: H,
    walls: [wall(0, 0, w, 0), wall(w, 0, w, d), wall(w, d, 0, d), wall(0, d, 0, 0)],
    rooms: [room(name, 0, 0, w, d)],
  }
}

function opening(wallId: string, over: Partial<Opening> = {}): Opening {
  return {
    id: `o-${wallId}`,
    wallId,
    type: 'door',
    offset: 2,
    width: 0.9,
    height: 2.05,
    sillHeight: 0,
    ...over,
  }
}

describe('wet rooms', () => {
  it('treats bathrooms, kitchens and service areas as tiled', () => {
    for (const n of ['Kitchen', 'Bathroom', 'Master Bath', 'WC', 'Service Yard', 'Balcony'])
      expect(isWetRoom({ ...room(n, 0, 0, 1, 1) })).toBe(true)
  })

  it('leaves dry rooms alone, including a store room', () => {
    for (const n of ['Living / Dining', 'Bedroom 2', 'Study', 'Store'])
      expect(isWetRoom({ ...room(n, 0, 0, 1, 1) })).toBe(false)
  })
})

describe('takeoff geometry', () => {
  it('is empty without rooms', () => {
    const t = takeoff({ ...emptyProject('t'), walls: [wall(0, 0, 4, 0)] })
    expect(t.rooms).toEqual([])
    expect(t.paintWallArea).toBe(0)
    expect(t.floorArea).toBe(0)
  })

  // Walls are measured on their inner face, not their centreline: a 4x3m box of
  // 100mm walls encloses 3.9 x 2.9m, so the run is 13.6m and not 14m. Using the
  // centreline would double-count every corner.
  const INNER_PERIMETER = 2 * (3.9 + 2.9)

  it('measures a plain room on its inner face, and the floor twice over', () => {
    const t = takeoff(box('Bedroom', 4, 3))
    expect(t.paintWallArea).toBeCloseTo(INNER_PERIMETER * H, 2)
    expect(t.skirting).toBeCloseTo(INNER_PERIMETER, 2)
    expect(t.floorArea).toBeCloseTo(3.9 * 2.9, 2)
    // ceiling is the same slab as the floor
    expect(t.ceilingArea).toBeCloseTo(t.floorArea, 5)
    expect(t.tileWallArea).toBe(0)
  })

  it('counts a wet room’s walls as tile, not paint', () => {
    const t = takeoff(box('Bathroom', 4, 3))
    expect(t.paintWallArea).toBe(0)
    expect(t.tileWallArea).toBeCloseTo(INNER_PERIMETER * H, 2)
    // ceilings get painted in wet rooms too
    expect(t.ceilingArea).toBeGreaterThan(0)
    // and skirting is excluded — a tiled skirting comes out of the floor tile
    expect(t.skirting).toBe(0)
  })

  it('deducts only the opening’s own height, not the whole column', () => {
    const p = box('Bedroom', 4, 3)
    const plain = takeoff(p).paintWallArea
    // a 1.4 x 1.2m window leaves wall above and below it
    const withWindow = takeoff({
      ...p,
      openings: [opening(p.walls[0].id, { type: 'window', width: 1.4, height: 1.2, sillHeight: 0.9 })],
    }).paintWallArea
    expect(plain - withWindow).toBeCloseTo(1.4 * 1.2, 1)
    // deducting the full column would have taken 1.4 × 2.8
    expect(plain - withWindow).toBeLessThan(1.4 * H - 0.5)
  })

  it('reports what the openings took out', () => {
    const p = box('Bedroom', 4, 3)
    const t = takeoff({ ...p, openings: [opening(p.walls[0].id)] })
    expect(t.openingDeduction).toBeCloseTo(0.9 * 2.05, 1)
  })

  it('stops skirting at a doorway but not at a window', () => {
    const p = box('Bedroom', 4, 3)
    const plain = takeoff(p).skirting
    const withDoor = takeoff({ ...p, openings: [opening(p.walls[0].id)] }).skirting
    expect(plain - withDoor).toBeCloseTo(0.9, 1)

    const withWindow = takeoff({
      ...p,
      openings: [opening(p.walls[0].id, { type: 'window', sillHeight: 0.9, height: 1.2 })],
    }).skirting
    expect(withWindow).toBeCloseTo(plain, 5) // a window doesn't interrupt skirting
  })

  it('splits a shared wall between the rooms on either side', () => {
    // two 3x3 rooms sharing a partition at x=3
    const p: Project = {
      ...emptyProject('t'),
      wallHeight: H,
      walls: [
        wall(0, 0, 6, 0),
        wall(6, 0, 6, 3),
        wall(6, 3, 0, 3),
        wall(0, 3, 0, 0),
        wall(3, 0, 3, 3), // partition
      ],
      rooms: [room('Bedroom 1', 0, 0, 3, 3), room('Bedroom 2', 3, 0, 3, 3)],
    }
    const t = takeoff(p)
    const [a, b] = t.rooms
    // the two rooms are mirror images, so their wall areas match
    expect(a.wallArea).toBeCloseTo(b.wallArea, 2)
    // the partition contributes to both, so the total exceeds a single count of it
    expect(t.paintWallArea).toBeCloseTo(a.wallArea + b.wallArea, 5)
  })

  it('credits a wall that borders several rooms to each of them', () => {
    // One spine wall down x=3 with the living room on the left and two rooms
    // stacked on the right. A midpoint probe would give the whole face to one.
    const p: Project = {
      ...emptyProject('t'),
      wallHeight: H,
      walls: [
        wall(0, 0, 6, 0),
        wall(6, 0, 6, 6),
        wall(6, 6, 0, 6),
        wall(0, 6, 0, 0),
        wall(3, 0, 3, 6), // spine
        wall(3, 3, 6, 3), // splits the right side
      ],
      rooms: [
        room('Living', 0, 0, 3, 6),
        room('Kitchen', 3, 0, 3, 3),
        room('Bedroom', 3, 3, 3, 3),
      ],
    }
    const t = takeoff(p)
    const kitchen = t.rooms.find((r) => r.roomName === 'Kitchen')!
    const bedroom = t.rooms.find((r) => r.roomName === 'Bedroom')!
    // both right-hand rooms get their own share of the spine
    expect(kitchen.wallArea).toBeGreaterThan(0)
    expect(bedroom.wallArea).toBeGreaterThan(0)
    expect(kitchen.wallArea).toBeCloseTo(bedroom.wallArea, 0)
    // the kitchen is wet, so its share lands in tile rather than paint
    expect(t.tileWallArea).toBeCloseTo(kitchen.wallArea, 5)
  })

  it('ignores wall faces with no room behind them', () => {
    // room occupies only half the walled area; the far half is unroomed
    const p: Project = {
      ...emptyProject('t'),
      wallHeight: H,
      walls: [wall(0, 0, 8, 0), wall(8, 0, 8, 3), wall(8, 3, 0, 3), wall(0, 3, 0, 0)],
      rooms: [room('Bedroom', 0, 0, 4, 3)],
    }
    const t = takeoff(p)
    // only the ~4m-wide room's own faces count, not the full 8m box
    expect(t.paintWallArea).toBeLessThan(14 * H)
    expect(t.paintWallArea).toBeGreaterThan(0)
  })
})

describe('paint quantities', () => {
  it('scales with area and coats at the stated coverage', () => {
    const q = paintQuantity(110, 2)
    expect(q.litres).toBeCloseTo((110 * 2) / PAINT_COVERAGE, 5)
    expect(q.coats).toBe(2)
    expect(paintQuantity(110, 3).litres).toBeGreaterThan(q.litres)
  })

  it('rounds pails up, because you cannot buy part of one', () => {
    expect(paintQuantity(55, 1).litres).toBeCloseTo(5, 5)
    expect(paintQuantity(55, 1).pails).toBe(1)
    expect(paintQuantity(56, 1).pails).toBe(2)
  })

  it('is zero for nothing to paint', () => {
    expect(paintQuantity(0).litres).toBe(0)
    expect(paintQuantity(0).pails).toBe(0)
  })
})

describe('tile quantities', () => {
  it('adds the wastage allowance to the ordered area', () => {
    const q = tileQuantity(100, tileSizeById('600x600'), 0.1)
    expect(q.area).toBe(100)
    expect(q.ordered).toBeCloseTo(110, 5)
  })

  it('counts whole pieces for the chosen size', () => {
    // 10 m² of 600x600 (0.36 m² each) with no wastage is 27.8 -> 28 pieces
    const q = tileQuantity(10, tileSizeById('600x600'), 0)
    expect(q.pieces).toBe(28)
    // a smaller tile needs more pieces for the same area
    expect(tileQuantity(10, tileSizeById('300x300'), 0).pieces).toBeGreaterThan(q.pieces)
  })

  it('offers the sizes an HDB reno is quoted in, defaulting to 600x600', () => {
    expect(TILE_SIZES.map((t) => t.id)).toContain('600x600')
    expect(tileSizeById('nonsense').id).toBe('600x600')
    expect(DEFAULT_WASTAGE).toBeGreaterThan(0)
  })
})

describe('skirting', () => {
  it('rounds a run up to whole 2.4m lengths', () => {
    expect(skirtingPieces(2.4)).toBe(1)
    expect(skirtingPieces(2.5)).toBe(2)
    expect(skirtingPieces(0)).toBe(0)
  })
})

describe('takeoff of the shipped templates', () => {
  for (const t of TEMPLATES) {
    it(`${t.name} produces plausible quantities`, () => {
      const p = t.make()
      const q = takeoff(p)
      expect(q.rooms.length).toBe(p.rooms.length)
      // every room gets some wall, and the floor matches the areas panel
      expect(q.rooms.every((r) => r.wallArea > 0)).toBe(true)
      expect(q.floorArea).toBeGreaterThan(20)
      // an HDB flat has both wet and dry rooms, so both buckets are used
      expect(q.paintWallArea).toBeGreaterThan(0)
      expect(q.tileWallArea).toBeGreaterThan(0)
      // wall area is bounded by perimeter-ish × height — a sanity ceiling that
      // would catch double counting every face
      const totalWallRun = p.walls.reduce(
        (s, w) => s + Math.hypot(w.b.x - w.a.x, w.b.z - w.a.z),
        0,
      )
      expect(q.paintWallArea + q.tileWallArea).toBeLessThanOrEqual(totalWallRun * 2 * H + 1)
      expect(q.skirting).toBeGreaterThan(0)
      expect(q.skirting).toBeLessThan(totalWallRun * 2)
    })
  }
})
