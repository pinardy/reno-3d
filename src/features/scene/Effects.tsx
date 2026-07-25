import { EffectComposer, N8AO, Bloom, SMAA, Vignette } from '@react-three/postprocessing'

// High-quality render pass: ambient occlusion (contact darkening in corners),
// a subtle bloom on highlights, anti-aliasing and a gentle vignette.
export function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.7} intensity={2.2} distanceFalloff={1} halfRes />
      <Bloom luminanceThreshold={0.85} intensity={0.35} mipmapBlur />
      <Vignette eskil={false} offset={0.25} darkness={0.5} />
      <SMAA />
    </EffectComposer>
  )
}
