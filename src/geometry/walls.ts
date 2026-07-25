import type { Wall, Opening } from '../types/project'
import { dist } from './vec'

export interface WallPiece {
  position: [number, number, number]
  size: [number, number, number] // [along-wall length, height, thickness]
  angle: number // rotation around Y
}

// Build the solid box pieces for a wall, leaving gaps for door/window openings.
// Doors leave a full-height gap (with a header above); windows leave a gap with
// a sill below and a header above.
export function buildWallPieces(wall: Wall, openings: Opening[]): WallPiece[] {
  const L = dist(wall.a, wall.b)
  if (L < 1e-4) return []
  const dirX = (wall.b.x - wall.a.x) / L
  const dirZ = (wall.b.z - wall.a.z) / L
  const angle = Math.atan2(dirZ, dirX)
  const H = wall.height
  const T = wall.thickness

  const mine = openings
    .filter((o) => o.wallId === wall.id)
    .map((o) => ({
      start: Math.max(0, o.offset - o.width / 2),
      end: Math.min(L, o.offset + o.width / 2),
      sill: Math.max(0, o.sillHeight),
      top: Math.min(H, o.sillHeight + o.height),
    }))
    .filter((o) => o.end > o.start)
    .sort((a, b) => a.start - b.start)

  const pieces: WallPiece[] = []
  const addPiece = (x0: number, x1: number, y0: number, y1: number) => {
    const len = x1 - x0
    const hgt = y1 - y0
    if (len < 1e-3 || hgt < 1e-3) return
    const cxLen = (x0 + x1) / 2
    const px = wall.a.x + dirX * cxLen
    const pz = wall.a.z + dirZ * cxLen
    const py = (y0 + y1) / 2
    pieces.push({ position: [px, py, pz], size: [len, hgt, T], angle })
  }

  let cursor = 0
  for (const o of mine) {
    // solid full-height wall before the opening
    addPiece(cursor, o.start, 0, H)
    // sill below the opening
    if (o.sill > 0) addPiece(o.start, o.end, 0, o.sill)
    // header above the opening
    if (o.top < H) addPiece(o.start, o.end, o.top, H)
    cursor = Math.max(cursor, o.end)
  }
  addPiece(cursor, L, 0, H)

  return pieces
}
