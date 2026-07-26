import { memo } from 'react'
import type { Item } from '../../types/project'

// Lamps and pendants emit real light once it gets dark, so a night scene reads as
// lived-in instead of a flat fill. This is on top of the per-room ceiling lights
// in Lighting.tsx — those give overall brightness; these give warm local pools
// around the actual fixtures the user placed.
//
// Point lights are not free on a phone GPU, so only the nearest few to the middle
// of the home are lit; the rest still render as objects, just unlit.
const MAX_LIGHTS = 8
const EMIT: ReadonlySet<Item['kind']> = new Set<Item['kind']>(['lamp', 'pendant'])

export const ItemLights = memo(function ItemLights({
  items,
  timeOfDay,
}: {
  items: Item[]
  timeOfDay: number // 0..1, 0.5 = midday
}) {
  const daylight = Math.max(0, Math.cos((timeOfDay - 0.5) * Math.PI * 1.15))
  const artificial = 1 - Math.min(1, daylight * 1.4)
  if (artificial < 0.05) return null

  const lamps = items.filter((it) => EMIT.has(it.kind)).slice(0, MAX_LIGHTS)
  if (lamps.length === 0) return null

  return (
    <>
      {lamps.map((it) => {
        const pendant = it.kind === 'pendant'
        // a pendant already hangs near the ceiling; a lamp's bulb sits a bit
        // above the piece's base
        const y = pendant ? it.y : it.y + 0.9
        return (
          <pointLight
            key={it.id}
            position={[it.position.x, y, it.position.z]}
            intensity={artificial * (pendant ? 6 : 4)}
            distance={pendant ? 6 : 4.5}
            decay={2}
            color="#ffd9a0"
          />
        )
      })}
    </>
  )
})
