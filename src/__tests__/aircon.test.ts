import { describe, it, expect } from 'vitest'
import {
  airconIssues,
  autoRoute,
  btuOf,
  elbowOfRun,
  elbowRoutes,
  pruneRuns,
  requiredBtu,
  roomCapacities,
  routeTrunking,
  runLength,
  systemLabel,
  systemSizeOf,
  totalTrunkingLength,
  trunkingHeight,
} from '../features/aircon/aircon'
import { catalogById, newItemFromCatalog } from '../features/catalog/catalog'
import {
  emptyProject,
  makeMaterial,
  type Item,
  type Project,
  type Room,
  type Wall,
} from '../types/project'
import { migrateProject } from '../features/persistence/io'

function itemOf(catalogId: string, x: number, z: number, rotationY = 0, id?: string): Item {
  const entry = catalogById(catalogId)!
  return {
    ...newItemFromCatalog(entry, { x, z }),
    id: id ?? `${catalogId}@${x},${z}`,
    rotationY,
  }
}

function wall(ax: number, az: number, bx: number, bz: number): Wall {
  return {
    id: `w${ax},${az}-${bx},${bz}`,
    a: { x: ax, z: az },
    b: { x: bx, z: bz },
    height: 2.8,
    thickness: 0.1,
    material: makeMaterial(),
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
  return { ...emptyProject('aircon-test'), ...over }
}

describe('aircon catalog', () => {
  it('reads BTU and system size off the catalog entries', () => {
    expect(btuOf(itemOf('fancoil-9k', 0, 0))).toBe(9000)
    expect(btuOf(itemOf('fancoil-18k', 0, 0))).toBe(18000)
    expect(systemSizeOf(itemOf('condenser-sys3', 0, 0))).toBe(3)
    expect(systemSizeOf(itemOf('condenser-sys4', 0, 0))).toBe(4)
  })

  it('lifts fan coils near the ceiling and condensers onto the ledge', () => {
    expect(itemOf('fancoil-12k', 0, 0).y).toBeGreaterThan(2)
    expect(itemOf('condenser-sys3', 0, 0).y).toBeCloseTo(0.35, 5)
  })

  it('labels the system by its condensers', () => {
    expect(systemLabel(projectWith())).toBeNull()
    expect(systemLabel(projectWith({ items: [itemOf('condenser-sys3', 0, 0)] }))).toBe(
      'System 3',
    )
    expect(
      systemLabel(
        projectWith({
          items: [itemOf('condenser-sys2', 0, 0), itemOf('condenser-sys4', 5, 0)],
        }),
      ),
      // biggest first, so it reads the way an installer would quote it
    ).toBe('System 4 + 2')
  })
})

describe('trunking routing', () => {
  it('offers both right-angled elbows between two points', () => {
    const { x, z } = elbowRoutes({ x: 0, z: 0 }, { x: 3, z: 4 })
    expect(x).toEqual([{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 3, z: 4 }])
    expect(z).toEqual([{ x: 0, z: 0 }, { x: 0, z: 4 }, { x: 3, z: 4 }])
  })

  it('routes at right angles, so the length is the Manhattan distance', () => {
    const pts = routeTrunking({ x: 0, z: 0 }, { x: 3, z: 4 }, [])
    expect(runLength(pts)).toBeCloseTo(7, 5)
  })

  it('collapses a straight run to two points', () => {
    // same z: the elbow is degenerate and shouldn't leave a duplicate vertex
    expect(routeTrunking({ x: 0, z: 2 }, { x: 5, z: 2 }, []).length).toBe(2)
  })

  it('picks the elbow that keeps the run against a wall', () => {
    // A wall along z=0. Going across x first hugs it; going across z first
    // strikes out into the middle of the room straight away.
    const walls = [wall(0, 0, 6, 0)]
    const pts = routeTrunking({ x: 0.2, z: 0.2 }, { x: 5, z: 4 }, walls)
    expect(pts[1]).toEqual({ x: 5, z: 0.2 })
  })

  it('honours a forced elbow', () => {
    const walls = [wall(0, 0, 6, 0)]
    const pts = routeTrunking({ x: 0.2, z: 0.2 }, { x: 5, z: 4 }, walls, 'z')
    expect(pts[1]).toEqual({ x: 0.2, z: 4 })
  })

  it('reports which elbow a run used, so it can be flipped', () => {
    const run = {
      id: 'r',
      fanCoilId: 'a',
      condenserId: 'b',
      y: 2.6,
      points: [
        { x: 0, z: 0 },
        { x: 4, z: 0 },
        { x: 4, z: 1 },
      ],
    }
    expect(elbowOfRun(run)).toBe('x')
    expect(elbowOfRun({ ...run, elbowOf: 'z' })).toBe('z')
  })

  it('runs the trunking just under the ceiling', () => {
    expect(trunkingHeight(projectWith({ wallHeight: 2.8 }))).toBeCloseTo(2.65, 5)
  })
})

describe('auto-routing', () => {
  it('needs both a fan coil and a condenser', () => {
    expect(autoRoute(projectWith({ items: [itemOf('fancoil-9k', 1, 1)] }))).toEqual([])
    expect(autoRoute(projectWith({ items: [itemOf('condenser-sys3', 1, 1)] }))).toEqual([])
  })

  it('routes one run per fan coil', () => {
    const p = projectWith({
      items: [
        itemOf('fancoil-9k', 1, 1, 0, 'c1'),
        itemOf('fancoil-9k', 4, 1, 0, 'c2'),
        itemOf('condenser-sys3', 8, 0, 0, 'cond'),
      ],
    })
    const runs = autoRoute(p)
    expect(runs.length).toBe(2)
    expect(runs.map((r) => r.fanCoilId).sort()).toEqual(['c1', 'c2'])
    expect(runs.every((r) => r.condenserId === 'cond')).toBe(true)
    expect(runs.every((r) => r.points.length >= 2)).toBe(true)
  })

  it('is idempotent — re-routing updates runs instead of duplicating them', () => {
    const p = projectWith({
      items: [itemOf('fancoil-9k', 1, 1, 0, 'c1'), itemOf('condenser-sys3', 8, 0, 0, 'cond')],
    })
    const once = autoRoute(p)
    const twice = autoRoute({ ...p, aircon: { runs: once, trunkingW: 0.1, trunkingH: 0.1 } })
    expect(twice.length).toBe(1)
    expect(twice[0].id).toBe(once[0].id)
  })

  it('spreads fan coils across condensers by spare port, nearest first', () => {
    // Two System 2s at opposite ends, four fan coils clustered near each.
    const p = projectWith({
      items: [
        itemOf('condenser-sys2', 0, 0, 0, 'left'),
        itemOf('condenser-sys2', 20, 0, 0, 'right'),
        itemOf('fancoil-9k', 1, 1, 0, 'a'),
        itemOf('fancoil-9k', 2, 1, 0, 'b'),
        itemOf('fancoil-9k', 19, 1, 0, 'c'),
        itemOf('fancoil-9k', 18, 1, 0, 'd'),
      ],
    })
    const by = new Map(autoRoute(p).map((r) => [r.fanCoilId, r.condenserId]))
    expect(by.get('a')).toBe('left')
    expect(by.get('b')).toBe('left')
    expect(by.get('c')).toBe('right')
    expect(by.get('d')).toBe('right')
  })

  it('keeps a hand-flipped elbow when the pairing is unchanged', () => {
    const walls = [wall(0, 0, 12, 0)]
    const p = projectWith({
      walls,
      items: [itemOf('fancoil-9k', 1, 1, 0, 'c1'), itemOf('condenser-sys3', 8, 4, 0, 'cond')],
    })
    const flipped = autoRoute(p).map((r) => ({ ...r, elbowOf: 'z' as const }))
    const again = autoRoute({ ...p, aircon: { runs: flipped, trunkingW: 0.1, trunkingH: 0.1 } })
    expect(again[0].elbowOf).toBe('z')
    expect(again[0].points[1]).toEqual({ x: 1, z: 4 })
  })

  it('drops runs whose units have been deleted', () => {
    const p = projectWith({
      items: [itemOf('fancoil-9k', 1, 1, 0, 'c1'), itemOf('condenser-sys3', 8, 0, 0, 'cond')],
    })
    const runs = autoRoute(p)
    const withPlan = { ...p, aircon: { runs, trunkingW: 0.1, trunkingH: 0.1 } }
    expect(pruneRuns(withPlan).length).toBe(1)
    // delete the condenser
    const orphaned = { ...withPlan, items: withPlan.items.filter((i) => i.id !== 'cond') }
    expect(pruneRuns(orphaned)).toEqual([])
  })

  it('totals the trunking across all runs', () => {
    const plan = {
      trunkingW: 0.1,
      trunkingH: 0.1,
      runs: [
        { id: 'a', fanCoilId: 'f', condenserId: 'c', y: 2.6, points: [{ x: 0, z: 0 }, { x: 3, z: 0 }] },
        { id: 'b', fanCoilId: 'g', condenserId: 'c', y: 2.6, points: [{ x: 0, z: 0 }, { x: 0, z: 4 }] },
      ],
    }
    expect(totalTrunkingLength(plan)).toBeCloseTo(7, 5)
  })
})

describe('cooling capacity', () => {
  it('sizes a room at roughly 650 BTU per m², rounded to 500', () => {
    expect(requiredBtu(10, false)).toBe(6500)
    // a 20 m² living room lands where an 18,000 BTU unit is the usual answer
    expect(requiredBtu(20, false)).toBe(13000)
  })

  it('sizes a west-facing room up for the afternoon sun', () => {
    expect(requiredBtu(10, true)).toBeGreaterThan(requiredBtu(10, false))
    // 10 m² × 650 × 1.2 = 7,800, rounded up to the next 500
    expect(requiredBtu(10, true)).toBe(8000)
  })

  it('attributes fan coils to the room they stand in', () => {
    const p = projectWith({
      rooms: [room('Bedroom', 3, 3), room('Kitchen', 3, 3, 4, 0)],
      items: [itemOf('fancoil-9k', 1.5, 1.5)],
    })
    const caps = roomCapacities(p)
    const bed = caps.find((c) => c.roomName === 'Bedroom')!
    const kitchen = caps.find((c) => c.roomName === 'Kitchen')!
    expect(bed.fanCoils).toBe(1)
    expect(bed.installed).toBe(9000)
    expect(kitchen.fanCoils).toBe(0)
    expect(kitchen.unconditioned).toBe(true)
    expect(bed.unconditioned).toBe(false)
  })

  it('treats wet and service areas as unconditioned', () => {
    const names = ['Kitchen', 'Bathroom', 'Master Bath', 'Service Yard', 'WC', 'Balcony']
    const caps = roomCapacities(projectWith({ rooms: names.map((n) => room(n, 2, 2)) }))
    expect(caps.every((c) => c.unconditioned)).toBe(true)
  })
})

describe('aircon checks', () => {
  it('is quiet on a plan with nothing in it', () => {
    expect(airconIssues(projectWith())).toEqual([])
  })

  it('flags fan coils with no condenser', () => {
    const issues = airconIssues(projectWith({ items: [itemOf('fancoil-9k', 1, 1)] }))
    expect(issues.map((i) => i.kind)).toContain('no-condenser')
  })

  it('flags more fan coils than the condensers have ports', () => {
    const items = [
      itemOf('condenser-sys2', 0, 0, 0, 'cond'),
      itemOf('fancoil-9k', 1, 1, 0, 'a'),
      itemOf('fancoil-9k', 2, 1, 0, 'b'),
      itemOf('fancoil-9k', 3, 1, 0, 'c'),
    ]
    const issues = airconIssues(projectWith({ items }))
    const overload = issues.find((i) => i.kind === 'overloaded')
    expect(overload).toBeDefined()
    expect(overload!.message).toContain('3 fan coils')
  })

  it('flags an undersized room and stays quiet on a correctly sized one', () => {
    // 4x4 = 16 m² needs 10,400 BTU
    const rooms = [room('Bedroom', 4, 4)]
    const small = airconIssues(
      projectWith({
        rooms,
        items: [itemOf('fancoil-9k', 2, 2), itemOf('condenser-sys3', 20, 20)],
      }),
    )
    expect(small.some((i) => i.kind === 'undersized')).toBe(true)

    const right = airconIssues(
      projectWith({
        rooms,
        items: [itemOf('fancoil-12k', 2, 2), itemOf('condenser-sys3', 20, 20)],
      }),
    )
    expect(right.some((i) => i.kind === 'undersized')).toBe(false)
  })

  it('flags a room with no fan coil, but not a kitchen', () => {
    const issues = airconIssues(
      projectWith({
        rooms: [room('Bedroom 2', 3, 3), room('Kitchen', 3, 3, 4, 0)],
        items: [itemOf('fancoil-9k', 20, 20), itemOf('condenser-sys3', 21, 20)],
      }),
    )
    const missing = issues.filter((i) => i.kind === 'no-fancoil')
    expect(missing.length).toBe(1)
    expect(missing[0].message).toContain('Bedroom 2')
  })

  it('flags an oversized unit', () => {
    const issues = airconIssues(
      projectWith({
        rooms: [room('Study', 2.5, 2.5)], // 6.25 m² -> 4,500 BTU
        items: [itemOf('fancoil-18k', 1, 1), itemOf('condenser-sys3', 20, 20)],
      }),
    )
    expect(issues.some((i) => i.kind === 'oversized')).toBe(true)
  })

  it('flags a pipe run that is too long', () => {
    const p = projectWith({
      items: [itemOf('fancoil-9k', 0, 0, 0, 'c1'), itemOf('condenser-sys3', 14, 8, 0, 'cond')],
    })
    const runs = autoRoute(p)
    expect(runLength(runs[0].points)).toBeGreaterThan(15)
    const issues = airconIssues({ ...p, aircon: { runs, trunkingW: 0.1, trunkingH: 0.1 } })
    expect(issues.some((i) => i.kind === 'long-run')).toBe(true)
  })

  it('flags a condenser that is not on a ledge', () => {
    const items = [
      itemOf('aircon-ledge', 0, 0),
      itemOf('condenser-sys3', 6, 6, 0, 'cond'),
      itemOf('fancoil-9k', 5, 5),
    ]
    const issues = airconIssues(projectWith({ items }))
    const off = issues.find((i) => i.kind === 'off-ledge')
    expect(off).toBeDefined()
    expect(off!.severity).toBe('warn')

    // sitting on the ledge is fine
    const ok = airconIssues(
      projectWith({
        items: [itemOf('aircon-ledge', 0, 0), itemOf('condenser-sys3', 0, 0.2), itemOf('fancoil-9k', 5, 5)],
      }),
    )
    expect(ok.some((i) => i.kind === 'off-ledge')).toBe(false)
  })

  it('flags a fan coil blowing straight onto a bed', () => {
    // fan coil at rotationY 0 blows toward +z; the bed sits 2m along that axis
    const items = [
      itemOf('fancoil-9k', 2, 0, 0, 'coil'),
      itemOf('bed-queen', 2, 2, 0, 'bed'),
      itemOf('condenser-sys3', 20, 20),
    ]
    const issues = airconIssues(projectWith({ items }))
    expect(issues.some((i) => i.kind === 'blows-at-bed')).toBe(true)

    // turned 90° it blows along the bed instead, which is the fix
    const sideways = airconIssues(
      projectWith({
        items: [
          itemOf('fancoil-9k', 2, 0, Math.PI / 2, 'coil'),
          itemOf('bed-queen', 2, 2, 0, 'bed'),
          itemOf('condenser-sys3', 20, 20),
        ],
      }),
    )
    expect(sideways.some((i) => i.kind === 'blows-at-bed')).toBe(false)
  })

  it('flags a fan coil mounted too low', () => {
    const coil = { ...itemOf('fancoil-9k', 1, 1, 0, 'coil'), y: 1.2 }
    const issues = airconIssues(
      projectWith({ items: [coil, itemOf('condenser-sys3', 20, 20)] }),
    )
    expect(issues.some((i) => i.kind === 'mounted-low')).toBe(true)
  })
})

describe('aircon persistence', () => {
  it('leaves projects without an aircon plan untouched', () => {
    expect(migrateProject({ name: 'Old' }).aircon).toBeUndefined()
  })

  it('fills in a partial plan and drops malformed runs', () => {
    const migrated = migrateProject({
      name: 'Partial',
      aircon: {
        runs: [
          { id: 'good', fanCoilId: 'a', condenserId: 'b', y: 2.6, points: [{ x: 0, z: 0 }, { x: 1, z: 0 }] },
          // a single point isn't a run
          { id: 'bad', fanCoilId: 'a', condenserId: 'b', y: 2.6, points: [{ x: 0, z: 0 }] },
        ],
      } as Project['aircon'],
    })
    expect(migrated.aircon!.runs.map((r) => r.id)).toEqual(['good'])
    expect(migrated.aircon!.trunkingW).toBeGreaterThan(0)
    expect(migrated.aircon!.trunkingH).toBeGreaterThan(0)
  })
})
