import { useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { isTypingTarget } from '../../lib/dom'

// Space-to-pan in the 3D view, matching the 2D trace editor where space + drag
// pans as well. Module state rather than store state on two counts: a furniture
// drag has to read it synchronously inside its pointerdown handler, and holding a
// key should not re-render the scene.
let held = false

/** Whether space is being held, turning a left-drag into a camera pan. */
export function isPanModifierHeld(): boolean {
  return held
}

interface OrbitLike {
  mouseButtons: { LEFT: number; MIDDLE: number; RIGHT: number }
}

/**
 * Hold space to pan with a left-drag instead of orbiting. OrbitControls reads
 * `mouseButtons` when the drag begins, so space has to go down before the mouse
 * button — the same order Figma and Blender expect.
 */
export function usePanModifier(
  orbitRef: React.MutableRefObject<OrbitLike | null>,
  enabled: boolean,
) {
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    const apply = (on: boolean) => {
      held = on && enabled
      const controls = orbitRef.current
      if (controls?.mouseButtons)
        controls.mouseButtons.LEFT = held ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE
      gl.domElement.style.cursor = held ? 'grab' : ''
    }

    if (!enabled) {
      apply(false)
      return
    }

    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTypingTarget(e.target)) apply(true)
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') apply(false)
    }
    // alt-tabbing away mid-hold never delivers the keyup, which would strand the
    // left button on pan
    const cancel = () => apply(false)

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', cancel)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', cancel)
      apply(false)
    }
  }, [gl, orbitRef, enabled])
}
