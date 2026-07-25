import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { resolveWallCollision } from './collision'

// First-person walk: WASD / arrows to move, with wall collision (doorways stay
// passable). PointerLock captures the mouse.
export function WalkControls() {
  const { camera } = useThree()
  const keys = useRef<Record<string, boolean>>({})
  const started = useRef(false)

  useEffect(() => {
    if (!started.current) {
      started.current = true
      camera.position.set(2, 1.6, 5)
      camera.lookAt(4, 1.6, 0)
    }
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true)
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [camera])

  useFrame((_, dt) => {
    const speed = 2.4 * dt
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    dir.y = 0
    dir.normalize()
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0))
    const k = keys.current
    if (k['KeyW'] || k['ArrowUp']) camera.position.addScaledVector(dir, speed)
    if (k['KeyS'] || k['ArrowDown']) camera.position.addScaledVector(dir, -speed)
    if (k['KeyD'] || k['ArrowRight']) camera.position.addScaledVector(right, speed)
    if (k['KeyA'] || k['ArrowLeft']) camera.position.addScaledVector(right, -speed)
    resolveWallCollision(camera.position, 1.6)
    camera.position.y = 1.6
  })

  return <PointerLockControls makeDefault />
}
