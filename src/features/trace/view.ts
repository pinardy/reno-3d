import type { Vec2 } from '../../types/project'

// The 2D editor works internally in METRES on the x/z ground plane. `View`
// maps world metres -> screen pixels. zoom = screen px per metre.
export interface View {
  zoom: number
  panX: number // screen px offset
  panY: number
}

export function worldToScreen(p: Vec2, v: View): { x: number; y: number } {
  return { x: p.x * v.zoom + v.panX, y: p.z * v.zoom + v.panY }
}

export function screenToWorld(x: number, y: number, v: View): Vec2 {
  return { x: (x - v.panX) / v.zoom, z: (y - v.panY) / v.zoom }
}

/** Zoom around a screen anchor point, keeping that point fixed. */
export function zoomAt(
  v: View,
  anchorX: number,
  anchorY: number,
  factor: number,
  min = 4,
  max = 400,
): View {
  const newZoom = Math.max(min, Math.min(max, v.zoom * factor))
  const world = screenToWorld(anchorX, anchorY, v)
  // solve pan so that world maps back to (anchorX, anchorY) at newZoom
  return {
    zoom: newZoom,
    panX: anchorX - world.x * newZoom,
    panY: anchorY - world.z * newZoom,
  }
}
