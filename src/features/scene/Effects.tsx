import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { EffectComposer, N8AO, Bloom, SMAA, Vignette } from '@react-three/postprocessing'

// High-quality render pass: ambient occlusion (contact darkening in corners),
// a subtle bloom on highlights, anti-aliasing and a gentle vignette.
export function Effects() {
  const gl = useThree((s) => s.gl)

  // The composer takes over clearing by setting renderer.autoClear = false, and
  // never puts it back. Switching HQ off then leaves the plain render loop with
  // no clear at all: last frame's depth survives and rejects the sky, so the
  // scene smears into a trail as the camera moves. Hand the renderer back the
  // way we found it.
  useEffect(
    () => () => {
      gl.autoClear = true
    },
    [gl],
  )

  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.7} intensity={2.2} distanceFalloff={1} halfRes />
      <Bloom luminanceThreshold={0.85} intensity={0.35} mipmapBlur />
      <Vignette eskil={false} offset={0.25} darkness={0.5} />
      <SMAA />
    </EffectComposer>
  )
}
