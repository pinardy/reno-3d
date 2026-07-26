import type { SavedView } from '../../types/project'

// Bridge from the HTML overlay to the live camera, mirroring focus.ts. Reading or
// setting the camera every frame through the store would re-render the tree, so
// this stays outside React.

export type Pose = Pick<SavedView, 'pos' | 'target'>

interface Control {
  get: () => Pose | null
  apply: (p: Pose) => void
}

let control: Control | null = null

export function registerCameraControl(c: Control | null) {
  control = c
}

export function getCameraPose(): Pose | null {
  return control ? control.get() : null
}

export function applyCameraPose(p: Pose) {
  if (control) control.apply(p)
}
