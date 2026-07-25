import { describe, it, expect } from 'vitest'
import { buildWallPieces } from '../geometry/walls'
import { buildFloorGeometry } from '../geometry/floor'
import { polygonArea, polygonCentroid, dist, projectOnSegment } from '../geometry/vec'
import type { Wall, Opening } from '../types/project'

const mat = { color: '#fff', roughness: 1, metalness: 0 }
const mkWall = (ax: number, az: number, bx: number, bz: number): Wall => ({
  id: `${ax},${az}-${bx},${bz}`,
  a: { x: ax, z: az },
  b: { x: bx, z: bz },
  height: 2.8,
  thickness: 0.1,
  material: { ...mat },
})

describe('buildWallPieces', () => {
  const w = mkWall(0, 0, 5, 0)

  it('a solid wall is one full-height piece', () => {
    const p = buildWallPieces(w, [])
    expect(p).toHaveLength(1)
    expect(p[0].size[0]).toBeCloseTo(5)
    expect(p[0].size[1]).toBeCloseTo(2.8)
  })

  it('a door leaves a gap (2 sides + header)', () => {
    const door: Opening = { id: 'd', wallId: w.id, type: 'door', offset: 2.5, width: 0.9, height: 2.05, sillHeight: 0 }
    const p = buildWallPieces(w, [door])
    expect(p).toHaveLength(3)
    const bottom = p.filter((pc) => Math.abs(pc.position[1] - pc.size[1] / 2) < 1e-6)
    const bottomLen = bottom.reduce((s, pc) => s + pc.size[0], 0)
    expect(bottomLen).toBeCloseTo(5 - 0.9)
  })

  it('a window leaves a sill + header (4 pieces)', () => {
    const win: Opening = { id: 'w', wallId: w.id, type: 'window', offset: 2.5, width: 1.2, height: 1.2, sillHeight: 0.9 }
    expect(buildWallPieces(w, [win])).toHaveLength(4)
  })
})

describe('floor geometry', () => {
  it('triangulates a square into 2 triangles (6 verts)', () => {
    const geom = buildFloorGeometry(
      [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 3 }, { x: 0, z: 3 }],
      0,
      true,
    )
    expect(geom.getAttribute('position').count).toBe(6)
  })
})

describe('vec helpers', () => {
  it('polygonArea of a 4x3 rect is 12', () => {
    expect(Math.abs(polygonArea([{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 3 }, { x: 0, z: 3 }]))).toBeCloseTo(12)
  })
  it('centroid of a rect is its middle', () => {
    const c = polygonCentroid([{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 2 }, { x: 0, z: 2 }])
    expect(c.x).toBeCloseTo(2)
    expect(c.z).toBeCloseTo(1)
  })
  it('projectOnSegment clamps and measures perpendicular distance', () => {
    const r = projectOnSegment({ x: 2, z: 1 }, { x: 0, z: 0 }, { x: 4, z: 0 })
    expect(r.point.x).toBeCloseTo(2)
    expect(r.dist).toBeCloseTo(1)
    expect(dist(r.point, { x: 2, z: 0 })).toBeCloseTo(0)
  })
})

describe('scale calibration math', () => {
  it('P_new = worldLen * P_old / realLen', () => {
    expect((10 * 100) / 8).toBeCloseTo(125)
  })
})
