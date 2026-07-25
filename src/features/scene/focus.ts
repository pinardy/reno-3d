import type { Vec2 } from '../../types/project'

// Bridge so the HTML layer (the catalog) can place new items where the camera is
// looking. A module-level registry rather than store state on purpose: the focus
// point changes on every camera move, and putting it in the store would re-render
// the React tree throughout an orbit.

export type FocusPicker = () => Vec2 | null

let picker: FocusPicker | null = null

export function registerFocusPicker(fn: FocusPicker | null) {
  picker = fn
}

/** Floor point the camera is currently looking at, or null if no 3D view is live. */
export function getFocusPoint(): Vec2 | null {
  return picker ? picker() : null
}
