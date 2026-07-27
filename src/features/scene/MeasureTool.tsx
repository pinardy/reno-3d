import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Line, Html } from '@react-three/drei'

// Click two points on any surface to measure the straight-line distance. A
// third click starts a new measurement. Camera orbiting (drag) is unaffected —
// only non-drag clicks place points.
export function MeasureTool() {
  const { gl, camera, scene, raycaster } = useThree()
  const [pts, setPts] = useState<THREE.Vector3[]>([])
  const downRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const el = gl.domElement
    const onDown = (e: PointerEvent) => {
      // middle and right are camera controls, not measurement points
      if (e.button !== 0) return
      downRef.current = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e: PointerEvent) => {
      const d = downRef.current
      downRef.current = null
      if (e.button !== 0) return
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return // was a drag
      const rect = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      const hit = hits.find(
        (h) => (h.object as THREE.Mesh).isMesh && !h.object.userData.measureHelper,
      )
      if (!hit) return
      setPts((prev) => (prev.length >= 2 ? [hit.point.clone()] : [...prev, hit.point.clone()]))
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
    }
  }, [gl, camera, scene, raycaster])

  const mid =
    pts.length === 2
      ? pts[0].clone().add(pts[1]).multiplyScalar(0.5)
      : null

  return (
    <>
      {pts.map((p, i) => (
        <mesh key={i} position={p} userData={{ measureHelper: true }}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color="#ffd24f" depthTest={false} />
        </mesh>
      ))}
      {pts.length === 2 && (
        <Line points={[pts[0], pts[1]]} color="#ffd24f" lineWidth={2} depthTest={false} />
      )}
      {mid && (
        <Html position={mid} center zIndexRange={[20, 0]}>
          <div
            style={{
              background: '#ffd24f',
              color: '#20242c',
              padding: '2px 7px',
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'system-ui, sans-serif',
              whiteSpace: 'nowrap',
              transform: 'translate(-50%,-50%)',
              pointerEvents: 'none',
            }}
          >
            {pts[0].distanceTo(pts[1]).toFixed(2)} m
          </div>
        </Html>
      )}
    </>
  )
}
