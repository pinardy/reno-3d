import type { Material } from '../../types/project'
import { Row, ColorSwatch, Slider } from '../../app/ui'
import { TEXTURE_IDS, type TextureId } from './textureIds'
import { TEXTURE_LABELS, type Preset } from './presets'

export function MaterialEditor({
  material,
  onChange,
  presets,
  showTexture = true,
}: {
  material: Material
  onChange: (patch: Partial<Material>) => void
  presets?: Preset[]
  showTexture?: boolean
}) {
  return (
    <div>
      <Row label="Colour">
        <ColorSwatch value={material.color} onChange={(color) => onChange({ color })} />
      </Row>
      <Row label="Roughness">
        <Slider value={material.roughness} onChange={(roughness) => onChange({ roughness })} />
      </Row>
      <Row label="Metalness">
        <Slider value={material.metalness} onChange={(metalness) => onChange({ metalness })} />
      </Row>
      {showTexture && (
        <Row label="Texture">
          <select
            value={material.texture ?? 'none'}
            onChange={(e) => {
              const t = e.target.value as TextureId
              onChange({ texture: t === 'none' ? undefined : t })
            }}
            className="w-32 rounded border border-edge bg-panel2 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-accent"
          >
            {TEXTURE_IDS.map((t) => (
              <option key={t} value={t}>
                {TEXTURE_LABELS[t]}
              </option>
            ))}
          </select>
        </Row>
      )}
      {presets && (
        <div className="mt-2">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">
            Presets
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.name}
                type="button"
                title={p.name}
                onClick={() => onChange(p.material)}
                className="h-6 w-6 rounded border border-edge transition-transform hover:scale-110"
                style={{ background: p.material.color }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
