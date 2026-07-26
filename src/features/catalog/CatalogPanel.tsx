import { useState } from 'react'
import {
  Sofa,
  Package,
  Upload,
  BedDouble,
  Lamp,
  Tv,
  Image,
  Bath,
  Armchair,
  Music,
  Flower2,
  Sprout,
  ShowerHead,
  WashingMachine,
  Table,
  SprayCan,
  Boxes,
  AirVent,
  Fan,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useStore, storeApi } from '../../store/store'
import { makeMaterial, type ItemKind, type Vec2 } from '../../types/project'
import { Section } from '../../app/ui'
import {
  CATALOG,
  CATEGORIES,
  newItemFromCatalog,
  type Category,
  type CatalogEntry,
} from './catalog'
import { polygonCentroid } from '../../geometry/vec'
import { getFocusPoint } from '../scene/focus'
import { clearOf } from './placement'
import { FURNITURE_SETS, type FurnitureSet } from './sets'
import { useIsCoarsePointer } from '../../lib/device'

const KIND_ICON: Partial<Record<ItemKind, LucideIcon>> = {
  sofa: Sofa,
  bed: BedDouble,
  chair: Armchair,
  table: Table,
  lamp: Lamp,
  pendant: Lamp,
  tv: Tv,
  piano: Music,
  vase: Flower2,
  plant: Sprout,
  picture: Image,
  bathtub: Bath,
  shower: ShowerHead,
  appliance: WashingMachine,
  toiletries: SprayCan,
  fancoil: AirVent,
  condenser: Fan,
}

export function CatalogPanel() {
  const [cat, setCat] = useState<Category>('Living')
  const [q, setQ] = useState('')
  const coarse = useIsCoarsePointer()
  const query = q.trim().toLowerCase()
  const items = query
    ? CATALOG.filter((c) => c.name.toLowerCase().includes(query))
    : CATALOG.filter((c) => c.category === cat)

  // Place new items where the camera is looking, so they land in view instead of
  // in the first room (which may be off-screen entirely). Falls back to the old
  // behaviour when the 3D view isn't mounted, e.g. while tracing a plan.
  function defaultPos(): Vec2 {
    const p = useStore.getState().project
    const focus = getFocusPoint()
    if (focus) return clearOf(focus, p.items)
    return p.rooms.length > 0 ? polygonCentroid(p.rooms[0].loop) : { x: 0, z: 0 }
  }

  function addAtDefault(entry: CatalogEntry) {
    const id = storeApi.addItem(newItemFromCatalog(entry, defaultPos()))
    useStore.getState().select({ type: 'item', id })
  }

  function addSet(set: FurnitureSet) {
    storeApi.addItems(set.make(defaultPos()))
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
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search furniture…"
          className="mb-2 w-full rounded border border-edge bg-panel2 px-2 py-1.5 text-xs text-neutral-100 outline-none focus:border-accent"
        />
        {!query && (
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
        )}

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
              title={
                coarse
                  ? `${entry.name} — tap to place it in view`
                  : `${entry.name} — drag into the scene or click to add`
              }
              className="flex cursor-grab flex-col items-center gap-1.5 rounded-lg border border-edge bg-panel2 p-2.5 text-center transition-colors hover:border-accent/60 hover:bg-edge active:cursor-grabbing"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded"
                style={{ background: entry.material.color + '33' }}
              >
                {(() => {
                  const Icon = KIND_ICON[entry.kind] ?? Package
                  return <Icon size={18} className="text-neutral-200" />
                })()}
              </span>
              <span className="text-[11px] leading-tight text-neutral-300">
                {entry.name}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Room sets">
        <div className="space-y-1.5">
          {FURNITURE_SETS.map((set) => (
            <button
              key={set.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/catalog-set', set.id)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => addSet(set)}
              title={
                coarse
                  ? `${set.name} set — tap to place it in view`
                  : `${set.name} set — drag into the scene or click to add`
              }
              className="flex w-full cursor-grab items-center gap-2 rounded-lg border border-edge bg-panel2 p-2 text-left transition-colors hover:border-accent/60 hover:bg-edge active:cursor-grabbing"
            >
              <Boxes size={16} className="shrink-0 text-accent" />
              <span className="min-w-0">
                <span className="block text-[12px] leading-tight text-neutral-200">{set.name}</span>
                <span className="block text-[10px] leading-tight text-neutral-500">{set.hint}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-neutral-500">
          Drops a grouped starter arrangement you can then nudge into place — they
          land selected, so drag any piece to move the whole group.
        </p>
      </Section>

      <Section title="Custom model">
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded bg-panel2 px-2 text-xs text-neutral-200 hover:bg-edge">
          <Upload size={15} className="text-accent" />
          Import .glb model…
          <input type="file" accept=".glb,model/gltf-binary" className="hidden" onChange={onImportGlb} />
        </label>
        <p className="mt-1 text-[11px] text-neutral-500">
          Loads a glTF binary and places it where the camera is looking. Adjust
          scale / lift on the right.
        </p>
      </Section>

      <Section title="How to place">
        {coarse ? (
          // touch devices never fire HTML5 drag-and-drop, so tapping is the only
          // way in — say so rather than advertising a drag that cannot work
          <ul className="space-y-1 text-[11px] text-neutral-400">
            <li>• Tap an item to add it where the camera is looking.</li>
            <li>• Drag it on the floor to move it, or switch to Rotate to spin.</li>
            <li>• Two fingers pan and zoom the view.</li>
            <li>• Cabinets snap their back to the nearest wall.</li>
          </ul>
        ) : (
          <ul className="space-y-1 text-[11px] text-neutral-400">
            <li>• Drag an item into the scene to drop it precisely.</li>
            <li>• Or click to add it where the camera is looking.</li>
            <li>• In the scene: drag to move, switch to Rotate to spin.</li>
            <li>• Cabinets snap their back to the nearest wall.</li>
            <li>• Cmd/Ctrl+D duplicates the selected item.</li>
          </ul>
        )}
      </Section>
    </div>
  )
}
