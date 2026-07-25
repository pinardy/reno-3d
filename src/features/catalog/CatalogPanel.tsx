import { useState } from 'react'
import { Sofa, Package, Upload } from 'lucide-react'
import { useStore, storeApi } from '../../store/store'
import { makeMaterial } from '../../types/project'
import { Section } from '../../app/ui'
import {
  CATALOG,
  CATEGORIES,
  newItemFromCatalog,
  type Category,
  type CatalogEntry,
} from './catalog'
import { polygonCentroid } from '../../geometry/vec'

export function CatalogPanel() {
  const [cat, setCat] = useState<Category>('Living')
  const items = CATALOG.filter((c) => c.category === cat)

  function defaultPos() {
    const p = useStore.getState().project
    return p.rooms.length > 0 ? polygonCentroid(p.rooms[0].loop) : { x: 0, z: 0 }
  }

  function addAtDefault(entry: CatalogEntry) {
    const id = storeApi.addItem(newItemFromCatalog(entry, defaultPos()))
    useStore.getState().select({ type: 'item', id })
  }

  function onImportGlb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const pos = defaultPos()
      const id = storeApi.addItem({
        catalogId: 'glb',
        kind: 'glb',
        name: file.name.replace(/\.glb$/i, ''),
        position: pos,
        y: 0,
        rotationY: 0,
        scale: 1,
        material: makeMaterial(),
        modelUrl: String(reader.result),
      })
      useStore.getState().select({ type: 'item', id })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div>
      <Section title="Furniture">
        <div className="mb-3 flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`rounded px-2 py-1 text-[11px] transition-colors ${
                cat === c
                  ? 'bg-accent text-white'
                  : 'bg-panel2 text-neutral-300 hover:bg-edge'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {items.map((entry) => (
            <button
              key={entry.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/catalog-id', entry.id)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => addAtDefault(entry)}
              title={`${entry.name} — drag into the scene or click to add`}
              className="flex cursor-grab flex-col items-center gap-1.5 rounded-lg border border-edge bg-panel2 p-2.5 text-center transition-colors hover:border-accent/60 hover:bg-edge active:cursor-grabbing"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded"
                style={{ background: entry.material.color + '33' }}
              >
                {entry.kind === 'sofa' ? (
                  <Sofa size={18} className="text-neutral-200" />
                ) : (
                  <Package size={18} className="text-neutral-200" />
                )}
              </span>
              <span className="text-[11px] leading-tight text-neutral-300">
                {entry.name}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Custom model">
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded bg-panel2 px-2 text-xs text-neutral-200 hover:bg-edge">
          <Upload size={15} className="text-accent" />
          Import .glb model…
          <input type="file" accept=".glb,model/gltf-binary" className="hidden" onChange={onImportGlb} />
        </label>
        <p className="mt-1 text-[11px] text-neutral-500">
          Loads a glTF binary and places it in the first room. Adjust scale / lift on
          the right.
        </p>
      </Section>

      <Section title="How to place">
        <ul className="space-y-1 text-[11px] text-neutral-400">
          <li>• Drag an item into the scene to drop it precisely.</li>
          <li>• Or click to add it to the middle of the first room.</li>
          <li>• In the scene: drag to move, switch to Rotate to spin.</li>
          <li>• Cabinets snap their back to the nearest wall.</li>
          <li>• Cmd/Ctrl+D duplicates the selected item.</li>
        </ul>
      </Section>
    </div>
  )
}
