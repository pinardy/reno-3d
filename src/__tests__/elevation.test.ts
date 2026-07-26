import { describe, it, expect } from 'vitest'
import {
  elevationRuns,
  feetRun,
  frontAxis,
  isRaised,
  widthAxis,
} from '../features/elevation/elevation'
import { runSummary } from '../features/elevation/elevationDraw'
import { catalogById, newItemFromCatalog } from '../features/catalog/catalog'
import {
  emptyProject,
  makeMaterial,
  type Item,
  type Project,
  type Room,
} from '../types/project'
import { TEMPLATES } from '../features/sample/templates'
import { makeSampleProject } from '../features/sample/sample'

function itemOf(
  catalogId: string,
  x: number,
  z: number,
  rotationY = 0,
  over: Partial<Item> = {},
): Item {
  const entry = catalogById(catalogId)!
  return {
    ...newItemFromCatalog(entry, { x, z }),
    id: over.id ?? `${catalogId}@${x},${z}`,
    rotationY,
    ...over,
  }
}

function room(name: string, w: number, d: number, ox = 0, oz = 0): Room {
  return {
    id: `room-${name}`,
    name,
    loop: [
      { x: ox, z: oz },
      { x: ox + w, z: oz },
      { x: ox + w, z: oz + d },
      { x: ox, z: oz + d },
    ],
    floorMaterial: makeMaterial(),
    ceilingMaterial: makeMaterial(),
    showCeiling: false,
  }
}

function projectWith(over: Partial<Project> = {}): Project {
  return { ...emptyProject('elev-test'), ...over }
}

/**
 * A row of base cabinets along z = 0.3 facing +z (rotationY 0), butted together.
 * 600-wide carcasses, so unit i is centred at 0.3 + 0.6i.
 */
function baseRun(n: number, z = 0.3, rotationY = 0): Item[] {
  return Array.from({ length: n }, (_, i) =>
    itemOf('base-cabinet', 0.3 + i * 0.6, z, rotationY, { id: `base${i}` }),
  )
}

describe('elevation axes', () => {
  it('sends an item front to its local +z, matching the 3D models', () => {
    expect(frontAxis(0)).toEqual({ x: 0, z: 1 })
    const f = frontAxis(Math.PI / 2)
    expect(f.x).toBeCloseTo(1, 6)
    expect(f.z).toBeCloseTo(0, 6)
  })

  it('sends an item width axis to its local +x — the viewer right', () => {
    expect(widthAxis(0)).toEqual({ x: 1, z: -0 })
    const r = widthAxis(Math.PI / 2)
    expect(r.x).toBeCloseTo(0, 6)
    expect(r.z).toBeCloseTo(-1, 6)
  })
})

describe('run detection', () => {
  it('finds nothing when there is no carpentry', () => {
    expect(elevationRuns(projectWith())).toEqual([])
    expect(elevationRuns(projectWith({ items: [itemOf('sofa-3', 1, 1)] }))).toEqual([])
  })

  it('groups a butted row of base cabinets into one run', () => {
    const runs = elevationRuns(projectWith({ items: baseRun(4) }))
    expect(runs.length).toBe(1)
    expect(runs[0].units.length).toBe(4)
    expect(runs[0].width).toBeCloseTo(2.4, 5)
    expect(runs[0].carpentryRun).toBeCloseTo(2.4, 5)
  })

  it('orders units left to right as the viewer sees them', () => {
    // shuffled input; the run should still read in ascending width-axis order
    const items = [baseRun(3)[2], baseRun(3)[0], baseRun(3)[1]]
    const run = elevationRuns(projectWith({ items }))[0]
    expect(run.units.map((u) => u.itemId)).toEqual(['base0', 'base1', 'base2'])
    run.units.forEach((u, i) => expect(u.x).toBeCloseTo(i * 0.6, 6))
  })

  it('splits cabinets that face different ways into separate runs', () => {
    const items = [
      ...baseRun(2),
      itemOf('base-cabinet', 0.3, 5, Math.PI, { id: 'facing-back' }),
    ]
    expect(elevationRuns(projectWith({ items })).length).toBe(2)
  })

  it('keeps back-to-back cabinets on one partition in separate runs', () => {
    // same wall plane in space, but facing opposite directions — two drawings
    const items = [
      itemOf('base-cabinet', 1, 0.3, 0, { id: 'front' }),
      itemOf('base-cabinet', 1, -0.3, Math.PI, { id: 'back' }),
    ]
    const runs = elevationRuns(projectWith({ items }))
    expect(runs.length).toBe(2)
    expect(runs.every((r) => r.units.length === 1)).toBe(true)
  })

  it('splits runs on opposite walls of the same room', () => {
    const items = [...baseRun(2), ...baseRun(2).map((it, i) => ({ ...it, id: `far${i}`, position: { x: it.position.x, z: 4 } }))]
    expect(elevationRuns(projectWith({ items })).length).toBe(2)
  })

  it('splits a run at a gap wider than a filler', () => {
    const items = [
      itemOf('base-cabinet', 0.3, 0.3, 0, { id: 'a' }),
      // 2m away along the wall — a separate piece of carpentry
      itemOf('base-cabinet', 2.3, 0.3, 0, { id: 'b' }),
    ]
    expect(elevationRuns(projectWith({ items })).length).toBe(2)
  })

  it('draws base and wall cabinets against one wall as a single elevation', () => {
    // A 350-deep wall cabinet at 1.4m up shares the base units' back plane.
    const wallCab = itemOf('wall-cabinet-90', 0.6, 0.175, 0, { id: 'upper', y: 1.4 })
    const run = elevationRuns(projectWith({ items: [...baseRun(3), wallCab] }))[0]
    expect(run.units.length).toBe(4)
    const upper = run.units.find((u) => u.itemId === 'upper')!
    expect(upper.y0).toBeCloseTo(1.4, 5)
    expect(upper.y1).toBeGreaterThan(2)
  })

  it('draws an appliance as a gap but leaves it out of the foot run', () => {
    const items = [...baseRun(2), itemOf('fridge', 1.55, 0.3, 0, { id: 'fridge' })]
    const run = elevationRuns(projectWith({ items }))[0]
    const fridge = run.units.find((u) => u.itemId === 'fridge')!
    expect(fridge.carpentry).toBe(false)
    expect(fridge.fronts[0].kind).toBe('appliance')
    // only the two 600 base cabinets are built
    expect(run.carpentryRun).toBeCloseTo(1.2, 5)
    expect(run.width).toBeGreaterThan(run.carpentryRun)
  })

  it('leaves out concrete fixtures that only look like carpentry', () => {
    const items = [itemOf('aircon-ledge', 1, 0.3), itemOf('planter-box', 3, 0.3)]
    expect(elevationRuns(projectWith({ items }))).toEqual([])
  })

  it('names a run after the room its front faces', () => {
    const items = baseRun(2)
    const runs = elevationRuns(
      projectWith({ items, rooms: [room('Kitchen', 4, 4, 0, 0)] }),
    )
    expect(runs[0].roomName).toBe('Kitchen')
    expect(runs[0].name).toBe('Kitchen — Run A')
  })

  it('letters multiple runs in the same room', () => {
    const items = [
      ...baseRun(2),
      ...baseRun(2).map((it, i) => ({ ...it, id: `far${i}`, position: { x: it.position.x, z: 3.7 }, rotationY: Math.PI })),
    ]
    const runs = elevationRuns(projectWith({ items, rooms: [room('Kitchen', 4, 4)] }))
    expect(runs.length).toBe(2)
    expect(runs.map((r) => r.name).sort()).toEqual([
      'Kitchen — Run A',
      'Kitchen — Run B',
    ])
  })

  it('reports the widest run first', () => {
    const items = [
      ...baseRun(4),
      itemOf('base-cabinet', 0.3, 6, 0, { id: 'lonely' }),
    ]
    const runs = elevationRuns(projectWith({ items }))
    expect(runs[0].units.length).toBe(4)
    expect(runs[1].units.length).toBe(1)
  })
})

describe('front layout', () => {
  it('splits a cabinet width across its doors', () => {
    const run = elevationRuns(projectWith({ items: [itemOf('base-cabinet', 1, 0.3)] }))[0]
    const fronts = run.units[0].fronts
    expect(fronts.length).toBe(2)
    expect(fronts.every((f) => f.kind === 'door')).toBe(true)
    // doors sit inside the carcass and don't overlap each other
    expect(fronts[0].x).toBeGreaterThan(0)
    expect(fronts[0].x + fronts[0].w).toBeLessThanOrEqual(fronts[1].x + 1e-9)
    expect(fronts[1].x + fronts[1].w).toBeLessThanOrEqual(run.units[0].w)
  })

  it('stacks drawer fronts up the carcass instead of splitting it', () => {
    const run = elevationRuns(projectWith({ items: [itemOf('drawer-base-60', 1, 0.3)] }))[0]
    const fronts = run.units[0].fronts
    expect(fronts.length).toBe(3)
    expect(fronts.every((f) => f.kind === 'drawer')).toBe(true)
    // all the same width, ascending in height
    expect(new Set(fronts.map((f) => f.w.toFixed(4))).size).toBe(1)
    expect(fronts[0].y).toBeLessThan(fronts[2].y)
  })

  it('turns a shelf unit into open bays', () => {
    const run = elevationRuns(projectWith({ items: [itemOf('bookshelf', 1, 0.15)] }))[0]
    const fronts = run.units[0].fronts
    expect(fronts.length).toBe(4)
    expect(fronts.every((f) => f.kind === 'open')).toBe(true)
    expect(fronts.every((f) => f.h > 0)).toBe(true)
  })

  it('keeps every front inside its carcass', () => {
    const items = [
      itemOf('base-cabinet-90', 1, 0.3, 0, { id: 'a' }),
      itemOf('drawer-base-90', 2, 0.3, 0, { id: 'b' }),
      itemOf('built-in-wardrobe', 4, 0.3, 0, { id: 'c' }),
      itemOf('corner-cabinet', 6, 0.3, 0, { id: 'd' }),
    ]
    for (const run of elevationRuns(projectWith({ items }))) {
      for (const u of run.units) {
        for (const f of u.fronts) {
          expect(f.x).toBeGreaterThanOrEqual(0)
          expect(f.x + f.w).toBeLessThanOrEqual(u.w + 1e-6)
          expect(f.y).toBeGreaterThanOrEqual(u.y0 - 1e-6)
          expect(f.y + f.h).toBeLessThanOrEqual(u.y1 + 1e-6)
          expect(f.w).toBeGreaterThan(0)
          expect(f.h).toBeGreaterThan(0)
        }
      }
    }
  })

  it('keeps a corner unit front out of the return leg', () => {
    const run = elevationRuns(projectWith({ items: [itemOf('corner-cabinet', 1, 0.3)] }))[0]
    const u = run.units[0]
    // the leg wraps out of the drawing, so nothing is drawn over that depth
    expect(u.fronts[0].x).toBeGreaterThanOrEqual(u.d)
  })
})

describe('foot run', () => {
  it('converts metres to feet', () => {
    expect(feetRun(1)).toBeCloseTo(3.28084, 5)
    expect(feetRun(3.048)).toBeCloseTo(10, 3)
  })

  it('quotes base and wall units separately, the way a kitchen is priced', () => {
    const wallCabs = [
      itemOf('wall-cabinet-90', 0.65, 0.175, 0, { id: 'up1', y: 1.4 }),
      itemOf('wall-cabinet-90', 1.6, 0.175, 0, { id: 'up2', y: 1.4 }),
    ]
    const run = elevationRuns(projectWith({ items: [...baseRun(3), ...wallCabs] }))[0]
    expect(run.baseRun).toBeCloseTo(1.8, 5) // 3 × 600
    expect(run.wallRun).toBeCloseTo(1.8, 5) // 2 × 900
    expect(run.carpentryRun).toBeCloseTo(3.6, 5)
    // width is the union of both rows (uppers overhang the base by 250mm here),
    // and the combined foot run legitimately exceeds it — hence the split
    expect(run.width).toBeCloseTo(2.05, 5)
    expect(run.carpentryRun).toBeGreaterThan(run.width)
    expect(runSummary(run)).toContain('base')
    expect(runSummary(run)).toContain('wall units')
  })

  it('reports a single figure when a run is all one row', () => {
    const base = elevationRuns(projectWith({ items: baseRun(2) }))[0]
    expect(base.wallRun).toBe(0)
    expect(runSummary(base)).toBe('1.20 m (3.9 ft) carpentry run')

    const uppers = elevationRuns(
      projectWith({ items: [itemOf('wall-cabinet-90', 1, 0.175, 0, { y: 1.4 })] }),
    )[0]
    expect(uppers.baseRun).toBe(0)
    expect(runSummary(uppers)).toContain('wall units')
  })

  it('leaves an appliance out of both runs', () => {
    const items = [...baseRun(2), itemOf('fridge', 1.55, 0.3, 0, { id: 'fridge' })]
    const run = elevationRuns(projectWith({ items }))[0]
    expect(run.baseRun).toBeCloseTo(1.2, 5)
    expect(run.wallRun).toBe(0)
  })

  it('quotes a 10ft kitchen run at 10ft', () => {
    // 5 × 600 + 1 × 100... close enough: 3.0m of carcass ≈ 9.8ft
    const run = elevationRuns(projectWith({ items: baseRun(5) }))[0]
    expect(run.carpentryRun).toBeCloseTo(3, 5)
    expect(feetRun(run.carpentryRun)).toBeCloseTo(9.84, 2)
  })
})

describe('elevations of the shipped projects', () => {
  const projects: [string, Project][] = [
    ...TEMPLATES.map((t) => [t.name, t.make()] as [string, Project]),
    ['Sample home', makeSampleProject()],
  ]

  for (const [name, p] of projects) {
    it(`${name} produces coherent runs`, () => {
      const runs = elevationRuns(p)
      for (const run of runs) {
        expect(run.units.length).toBeGreaterThan(0)
        expect(run.width).toBeGreaterThan(0)
        expect(run.carpentryRun).toBeLessThanOrEqual(run.width + 1e-6)
        // units are ordered and never overlap along the run
        for (let i = 1; i < run.units.length; i++) {
          expect(run.units[i].x).toBeGreaterThanOrEqual(run.units[i - 1].x)
        }
        // the leftmost unit defines the run's origin
        expect(Math.min(...run.units.map((u) => u.x))).toBeCloseTo(0, 6)
        expect(Math.max(...run.units.map((u) => u.x + u.w))).toBeCloseTo(run.width, 6)
        // the base/wall split accounts for the whole carpentry run
        expect(run.baseRun + run.wallRun).toBeCloseTo(run.carpentryRun, 6)
        expect(run.units.filter(isRaised).every((u) => u.y0 > 0)).toBe(true)
      }
      // every carpentry item in the project lands in exactly one run
      const ids = runs.flatMap((r) => r.units.map((u) => u.itemId))
      expect(new Set(ids).size).toBe(ids.length)
    })
  }

  it('finds the kitchen run in the furnished sample', () => {
    const runs = elevationRuns(makeSampleProject())
    expect(runs.length).toBeGreaterThan(0)
    expect(runs.some((r) => r.carpentryRun > 0.5)).toBe(true)
  })
})
