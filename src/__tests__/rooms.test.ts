import { describe, it, expect } from 'vitest'
import { detectRoomLoops } from '../features/trace/rooms'
import type { Wall } from '../types/project'

const mat = { color: '#fff', roughness: 1, metalness: 0 }
const mkWall = (ax: number, az: number, bx: number, bz: number): Wall => ({
  id: `${ax},${az}-${bx},${bz}`,
  a: { x: ax, z: az },
  b: { x: bx, z: bz },
  height: 2.8,
  thickness: 0.1,
  material: { ...mat },
})

describe('detectRoomLoops', () => {
  it('finds a single square room', () => {
    const rooms = detectRoomLoops([
      mkWall(0, 0, 4, 0),
      mkWall(4, 0, 4, 3),
      mkWall(4, 3, 0, 3),
      mkWall(0, 3, 0, 0),
    ])
    expect(rooms).toHaveLength(1)
    expect(rooms[0]).toHaveLength(4)
  })

  it('splits at T-junctions to find two rooms', () => {
    // outer 7x5 rectangle with a partition down the middle at x=4
    const rooms = detectRoomLoops([
      mkWall(0, 0, 7, 0),
      mkWall(7, 0, 7, 5),
      mkWall(7, 5, 0, 5),
      mkWall(0, 5, 0, 0),
      mkWall(4, 0, 4, 5),
    ])
    expect(rooms).toHaveLength(2)
  })

  it('returns nothing for too few walls', () => {
    expect(detectRoomLoops([mkWall(0, 0, 1, 0)])).toHaveLength(0)
  })
})
