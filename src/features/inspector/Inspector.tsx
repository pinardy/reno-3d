import { Trash2, Home, Copy, Boxes } from 'lucide-react'
import { useStore, storeApi } from '../../store/store'
import { Section, Row, NumberInput, TextInput } from '../../app/ui'
import { MaterialEditor } from '../materials/MaterialEditor'
import { PAINT_PRESETS, FLOOR_PRESETS } from '../materials/presets'
import { dist } from '../../geometry/vec'
import { num, bool } from '../../lib/params'
import type { Material } from '../../types/project'

export function Inspector() {
  const selection = useStore((s) => s.selection)
  const project = useStore((s) => s.project)
  const multiCount = useStore((s) => s.selectedItemIds.length)

  if (multiCount > 1) return <MultiInspector count={multiCount} />
  if (!selection.id) return <EmptyInspector />

  if (selection.type === 'wall') {
    const wall = project.walls.find((w) => w.id === selection.id)
    if (wall) return <WallInspector />
  }
  if (selection.type === 'room') {
    const room = project.rooms.find((r) => r.id === selection.id)
    if (room) return <RoomInspector />
  }
  if (selection.type === 'opening') {
    const op = project.openings.find((o) => o.id === selection.id)
    if (op) return <OpeningInspector />
  }
  if (selection.type === 'item') {
    const it = project.items.find((i) => i.id === selection.id)
    if (it) return <ItemInspector />
  }
  return <EmptyInspector />
}

function DeleteButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => storeApi.removeSelected()}
      className="mt-1 flex w-full items-center justify-center gap-2 rounded bg-red-500/10 py-2 text-xs text-red-300 hover:bg-red-500/20"
    >
      <Trash2 size={14} /> Delete {label}
    </button>
  )
}

function MultiInspector({ count }: { count: number }) {
  return (
    <Section title={`${count} items selected`}>
      <div className="flex items-center gap-2 text-sm text-neutral-300">
        <Boxes size={16} className="text-accent" /> Multiple furniture
      </div>
      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={() => storeApi.duplicateSelectedItem()}
          className="flex w-full items-center justify-center gap-2 rounded bg-panel2 py-2 text-xs text-neutral-300 hover:bg-edge"
        >
          <Copy size={14} /> Duplicate all
        </button>
        <button
          type="button"
          onClick={() => storeApi.removeSelected()}
          className="flex w-full items-center justify-center gap-2 rounded bg-red-500/10 py-2 text-xs text-red-300 hover:bg-red-500/20"
        >
          <Trash2 size={14} /> Delete all
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
        Drag any selected item to move the group. Shift-click items to add or
        remove them from the selection.
      </p>
    </Section>
  )
}

function EmptyInspector() {
  // Select primitives individually — returning a new object from a Zustand
  // selector each render triggers an infinite update loop.
  const walls = useStore((s) => s.project.walls.length)
  const rooms = useStore((s) => s.project.rooms.length)
  const openings = useStore((s) => s.project.openings.length)
  const items = useStore((s) => s.project.items.length)
  const counts = { walls, rooms, openings, items }
  return (
    <div>
      <Section title="Home">
        <div className="flex items-center gap-2 text-sm text-neutral-300">
          <Home size={16} className="text-accent" /> Nothing selected
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
          Select a wall, room, opening or piece of furniture to edit its
          properties, colour and materials here.
        </p>
      </Section>
      <Section title="Project">
        <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
          <Stat label="Walls" value={counts.walls} />
          <Stat label="Rooms" value={counts.rooms} />
          <Stat label="Openings" value={counts.openings} />
          <Stat label="Furniture" value={counts.items} />
        </div>
      </Section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-panel2 px-2 py-1.5">
      <div className="text-base font-semibold text-neutral-200">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
    </div>
  )
}

// --------------------------------------------------------------------------

function WallInspector() {
  const id = useStore((s) => s.selection.id)!
  const wall = useStore((s) => s.project.walls.find((w) => w.id === id))
  const commit = useStore((s) => s.commit)
  const update = useStore((s) => s.update)
  const checkpoint = useStore((s) => s.checkpoint)
  if (!wall) return null

  const patchMat = (patch: Partial<Material>) =>
    commit((p) => {
      const w = p.walls.find((x) => x.id === id)
      if (w) Object.assign(w.material, patch)
    })

  return (
    <div>
      <Section title="Wall">
        <Row label="Length">
          <NumberInput
            value={dist(wall.a, wall.b)}
            step={0.05}
            min={0.1}
            max={50}
            suffix="m"
            onChange={(len) => {
              if (!(len > 0)) return
              commit((p) => {
                const w = p.walls.find((x) => x.id === id)
                if (!w) return
                const L = dist(w.a, w.b)
                if (L < 1e-6) return
                const dx = (w.b.x - w.a.x) / L
                const dz = (w.b.z - w.a.z) / L
                const oldB = { ...w.b }
                const nb = { x: w.a.x + dx * len, z: w.a.z + dz * len }
                // move every endpoint coincident with the old b vertex
                for (const ww of p.walls) {
                  if (Math.abs(ww.a.x - oldB.x) < 0.02 && Math.abs(ww.a.z - oldB.z) < 0.02)
                    ww.a = { ...nb }
                  if (Math.abs(ww.b.x - oldB.x) < 0.02 && Math.abs(ww.b.z - oldB.z) < 0.02)
                    ww.b = { ...nb }
                }
              })
            }}
          />
        </Row>
        <Row label="Height">
          <NumberInput
            value={wall.height}
            step={0.05}
            min={1}
            max={5}
            suffix="m"
            onEditStart={checkpoint}
            onChange={(v) =>
              update((p) => {
                const w = p.walls.find((x) => x.id === id)
                if (w) w.height = v
              })
            }
          />
        </Row>
        <Row label="Thickness">
          <NumberInput
            value={wall.thickness}
            step={0.01}
            min={0.02}
            max={0.5}
            suffix="m"
            onEditStart={checkpoint}
            onChange={(v) =>
              update((p) => {
                const w = p.walls.find((x) => x.id === id)
                if (w) w.thickness = v
              })
            }
          />
        </Row>
        <label className="mt-1 flex items-center justify-between text-xs">
          <span className="text-neutral-400">Structural (can't hack)</span>
          <input
            type="checkbox"
            checked={!!wall.structural}
            onChange={(e) =>
              commit((p) => {
                const w = p.walls.find((x) => x.id === id)
                if (w) w.structural = e.target.checked
              })
            }
          />
        </label>
        {wall.structural && (
          <p className="mt-1 rounded bg-amber-500/10 px-2 py-1 text-[10px] leading-tight text-amber-300">
            ⚠ Load-bearing — HDB does not allow hacking structural walls or the
            household shelter. Verify with HDB / your contractor.
          </p>
        )}
      </Section>
      <Section title="Material">
        <MaterialEditor material={wall.material} onChange={patchMat} presets={PAINT_PRESETS} />
        <button
          type="button"
          onClick={() =>
            commit((p) => {
              for (const w of p.walls) Object.assign(w.material, wall.material)
            })
          }
          className="mt-3 w-full rounded bg-panel2 py-1.5 text-[11px] text-neutral-300 hover:bg-edge"
        >
          Apply colour to all walls
        </button>
        <DeleteButton label="wall" />
      </Section>
    </div>
  )
}

function RoomInspector() {
  const id = useStore((s) => s.selection.id)!
  const room = useStore((s) => s.project.rooms.find((r) => r.id === id))
  const commit = useStore((s) => s.commit)
  if (!room) return null

  const patchFloor = (patch: Partial<Material>) =>
    commit((p) => {
      const r = p.rooms.find((x) => x.id === id)
      if (r) Object.assign(r.floorMaterial, patch)
    })
  const patchCeil = (patch: Partial<Material>) =>
    commit((p) => {
      const r = p.rooms.find((x) => x.id === id)
      if (r) Object.assign(r.ceilingMaterial, patch)
    })

  return (
    <div>
      <Section title="Room">
        <TextInput
          value={room.name}
          onChange={(name) =>
            commit((p) => {
              const r = p.rooms.find((x) => x.id === id)
              if (r) r.name = name
            })
          }
        />
        <label className="mt-2 flex items-center justify-between text-xs text-neutral-300">
          <span className="text-neutral-400">Show ceiling</span>
          <input
            type="checkbox"
            checked={room.showCeiling}
            onChange={(e) =>
              commit((p) => {
                const r = p.rooms.find((x) => x.id === id)
                if (r) r.showCeiling = e.target.checked
              })
            }
          />
        </label>
      </Section>
      <Section title="Floor">
        <MaterialEditor material={room.floorMaterial} onChange={patchFloor} presets={FLOOR_PRESETS} />
      </Section>
      {room.showCeiling && (
        <Section title="Ceiling">
          <MaterialEditor material={room.ceilingMaterial} onChange={patchCeil} presets={PAINT_PRESETS} />
        </Section>
      )}
      <Section title="Actions">
        <DeleteButton label="room floor" />
      </Section>
    </div>
  )
}

function OpeningInspector() {
  const id = useStore((s) => s.selection.id)!
  const op = useStore((s) => s.project.openings.find((o) => o.id === id))
  const update = useStore((s) => s.update)
  const commit = useStore((s) => s.commit)
  const checkpoint = useStore((s) => s.checkpoint)
  if (!op) return null
  const set = (patch: Partial<typeof op>) =>
    update((p) => {
      const o = p.openings.find((x) => x.id === id)
      if (o) Object.assign(o, patch)
    })
  return (
    <div>
      <Section title={op.type[0].toUpperCase() + op.type.slice(1) + ' opening'}>
        <Row label="Width">
          <NumberInput value={op.width} step={0.05} min={0.3} max={4} suffix="m" onEditStart={checkpoint} onChange={(v) => set({ width: v })} />
        </Row>
        <Row label="Height">
          <NumberInput value={op.height} step={0.05} min={0.3} max={3} suffix="m" onEditStart={checkpoint} onChange={(v) => set({ height: v })} />
        </Row>
        <Row label="Sill height">
          <NumberInput value={op.sillHeight} step={0.05} min={0} max={2} suffix="m" onEditStart={checkpoint} onChange={(v) => set({ sillHeight: v })} />
        </Row>
        <Row label="Position">
          <NumberInput value={op.offset} step={0.05} min={0} max={20} suffix="m" onEditStart={checkpoint} onChange={(v) => set({ offset: v })} />
        </Row>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {(
            [
              ['door', 0, 2.05],
              ['window', 0.9, 1.2],
              ['cased', 0, 2.05],
              ['sliding', 0, 2.1],
            ] as const
          ).map(([t, sill, height]) => (
            <button
              key={t}
              type="button"
              onClick={() =>
                commit((p) => {
                  const o = p.openings.find((x) => x.id === id)
                  if (o) {
                    o.type = t
                    o.sillHeight = sill
                    o.height = height
                  }
                })
              }
              className={`rounded py-1 text-[10px] capitalize ${
                op.type === t ? 'bg-accent text-white' : 'bg-panel2 text-neutral-300 hover:bg-edge'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {op.type === 'door' && (
          <div className="mt-2">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">
              Hinge side
            </div>
            <div className="flex gap-1">
              {(['left', 'right'] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => commit((p) => {
                    const o = p.openings.find((x) => x.id === id)
                    if (o) o.hinge = h
                  })}
                  className={`flex-1 rounded py-1 text-[11px] capitalize ${
                    (op.hinge ?? 'left') === h
                      ? 'bg-accent text-white'
                      : 'bg-panel2 text-neutral-300 hover:bg-edge'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}
        <DeleteButton label={op.type} />
      </Section>
    </div>
  )
}

function ItemInspector() {
  const id = useStore((s) => s.selection.id)!
  const item = useStore((s) => s.project.items.find((i) => i.id === id))
  const update = useStore((s) => s.update)
  const commit = useStore((s) => s.commit)
  const checkpoint = useStore((s) => s.checkpoint)
  if (!item) return null

  const patchMat = (patch: Partial<Material>) =>
    commit((p) => {
      const it = p.items.find((x) => x.id === id)
      if (it) Object.assign(it.material, patch)
    })
  const setParam = (key: string, value: number | boolean) =>
    commit((p) => {
      const it = p.items.find((x) => x.id === id)
      if (it) {
        it.params = { ...(it.params ?? {}), [key]: value }
      }
    })

  const isCabinet = item.kind === 'cabinet'

  return (
    <div>
      <Section title="Furniture">
        <TextInput
          value={item.name}
          onChange={(name) =>
            commit((p) => {
              const it = p.items.find((x) => x.id === id)
              if (it) it.name = name
            })
          }
        />
        <div className="mt-2">
          <Row label="Position X">
            <NumberInput
              value={item.position.x}
              step={0.1}
              suffix="m"
              onEditStart={checkpoint}
              onChange={(v) =>
                update((p) => {
                  const it = p.items.find((x) => x.id === id)
                  if (it) it.position.x = v
                })
              }
            />
          </Row>
          <Row label="Position Z">
            <NumberInput
              value={item.position.z}
              step={0.1}
              suffix="m"
              onEditStart={checkpoint}
              onChange={(v) =>
                update((p) => {
                  const it = p.items.find((x) => x.id === id)
                  if (it) it.position.z = v
                })
              }
            />
          </Row>
          <Row label="Rotation">
            <NumberInput
              value={(item.rotationY * 180) / Math.PI}
              step={15}
              suffix="°"
              onEditStart={checkpoint}
              onChange={(v) =>
                update((p) => {
                  const it = p.items.find((x) => x.id === id)
                  if (it) it.rotationY = (v * Math.PI) / 180
                })
              }
            />
          </Row>
          <Row label="Scale">
            <NumberInput
              value={item.scale}
              step={0.05}
              min={0.2}
              max={5}
              suffix="×"
              onEditStart={checkpoint}
              onChange={(v) =>
                update((p) => {
                  const it = p.items.find((x) => x.id === id)
                  if (it) it.scale = v
                })
              }
            />
          </Row>
          <Row label="Lift (Y)">
            <NumberInput
              value={item.y}
              step={0.05}
              min={0}
              max={3}
              suffix="m"
              onEditStart={checkpoint}
              onChange={(v) =>
                update((p) => {
                  const it = p.items.find((x) => x.id === id)
                  if (it) it.y = v
                })
              }
            />
          </Row>
        </div>
      </Section>

      {isCabinet && (
        <Section title="Cabinet size">
          <Row label="Width">
            <NumberInput
              value={num(item.params?.width, 0.6)}
              step={0.05}
              min={0.2}
              max={3}
              suffix="m"
              onChange={(v) => setParam('width', v)}
            />
          </Row>
          <Row label="Depth">
            <NumberInput
              value={num(item.params?.depth, 0.6)}
              step={0.05}
              min={0.2}
              max={1}
              suffix="m"
              onChange={(v) => setParam('depth', v)}
            />
          </Row>
          <Row label="Height">
            <NumberInput
              value={num(item.params?.height, 0.9)}
              step={0.05}
              min={0.3}
              max={2.4}
              suffix="m"
              onChange={(v) => setParam('height', v)}
            />
          </Row>
          <Row label="Doors">
            <NumberInput
              value={num(item.params?.doors, 2)}
              step={1}
              min={1}
              max={6}
              onChange={(v) => setParam('doors', Math.round(v))}
            />
          </Row>
          <label className="mt-1 flex items-center justify-between text-xs text-neutral-300">
            <span className="text-neutral-400">Countertop</span>
            <input
              type="checkbox"
              checked={bool(item.params?.counter, false)}
              onChange={(e) => setParam('counter', e.target.checked)}
            />
          </label>
          <label className="mt-1 flex items-center justify-between text-xs text-neutral-300">
            <span className="text-neutral-400">Corner (L-shape)</span>
            <input
              type="checkbox"
              checked={bool(item.params?.corner, false)}
              onChange={(e) => setParam('corner', e.target.checked)}
            />
          </label>
          {bool(item.params?.corner, false) && (
            <Row label="Leg length">
              <NumberInput
                value={num(item.params?.legLen, 1.0)}
                step={0.05}
                min={0.3}
                max={3}
                suffix="m"
                onChange={(v) => setParam('legLen', v)}
              />
            </Row>
          )}
        </Section>
      )}

      <Section title="Material">
        <MaterialEditor material={item.material} onChange={patchMat} />
        <button
          type="button"
          onClick={() => storeApi.duplicateSelectedItem()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-panel2 py-2 text-xs text-neutral-300 hover:bg-edge"
        >
          <Copy size={14} /> Duplicate (Cmd/Ctrl+D)
        </button>
        <DeleteButton label="item" />
      </Section>
    </div>
  )
}

