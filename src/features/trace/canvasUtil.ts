import type { Vec2 } from '../../types/project'

export function near(a: Vec2, b: Vec2, tol = 0.02) {
  return Math.abs(a.x - b.x) < tol && Math.abs(a.z - b.z) < tol
}

export function pointInPoly(p: Vec2, poly: Vec2[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i]
    const pj = poly[j]
    if (
      pi.z > p.z !== pj.z > p.z &&
      p.x < ((pj.x - pi.x) * (p.z - pi.z)) / (pj.z - pi.z) + pi.x
    )
      inside = !inside
  }
  return inside
}

export function cursorFor(tool: string) {
  if (tool === 'wall' || tool === 'room' || tool === 'scale') return 'crosshair'
  if (tool === 'door' || tool === 'window') return 'copy'
  return 'default'
}

export function hintFor(tool: string, hasImage: boolean, calibrated: boolean) {
  if (tool === 'scale')
    return 'Scale: click two points across a known dimension, then enter its real length.'
  if ((tool === 'wall' || tool === 'room') && hasImage && !calibrated)
    return 'Set the scale first (Scale tool) before tracing.'
  if (tool === 'wall')
    return 'Wall: click to add corners · Enter/double-click to finish · click start to close · Esc cancels.'
  if (tool === 'room')
    return 'Room: click corners of a room · click start (or Enter) to close the floor.'
  if (tool === 'door') return 'Door: click on a wall to place a doorway.'
  if (tool === 'window') return 'Window: click on a wall to place a window.'
  return 'Select: click walls/rooms/openings · drag corners to edit · Space-drag or right-drag to pan · scroll to zoom.'
}
