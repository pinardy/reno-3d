import { describe, it, expect, beforeEach } from 'vitest'
import { useStore, storeApi } from '../store/store'
import { makeSampleProject } from '../features/sample/sample'
import { roomSunExposure } from '../features/checks/sun'

beforeEach(() => {
  useStore.getState().loadProject(makeSampleProject())
})

describe('duplicate furniture', () => {
  it('duplicates the selected item with an offset and undoes cleanly', () => {
    const items = useStore.getState().project.items
    const before = items.length
    useStore.getState().select({ type: 'item', id: items[0].id })
    const newId = storeApi.duplicateSelectedItem()
    const after = useStore.getState().project.items
    expect(after.length).toBe(before + 1)
    expect(useStore.getState().selection.id).toBe(newId)
    const orig = after.find((i) => i.id === items[0].id)!
    const dup = after.find((i) => i.id === newId)!
    expect(dup.position).not.toEqual(orig.position)
    expect(dup.material).not.toBe(orig.material)
    useStore.getState().undo()
    expect(useStore.getState().project.items.length).toBe(before)
  })
})

describe('plan orientation', () => {
  // Regression: this was written as `update((p) => (p.orientationDeg = ...))`, a
  // parenthesised assignment, so the recipe returned the assigned number as well as
  // mutating the draft. Immer rejects that, so the setter threw and the compass did
  // nothing at all — taking the sun exposure, the aircon west-sun uplift and the
  // exported north arrow down with it. Anything reachable from a click deserves a
  // test that actually calls it.
  it('sets a bearing without tripping immer', () => {
    expect(() => storeApi.setOrientation(90)).not.toThrow()
    expect(useStore.getState().project.orientationDeg).toBe(90)
  })

  it('normalises into 0..359', () => {
    storeApi.setOrientation(450)
    expect(useStore.getState().project.orientationDeg).toBe(90)
    storeApi.setOrientation(-90)
    expect(useStore.getState().project.orientationDeg).toBe(270)
    storeApi.setOrientation(360)
    expect(useStore.getState().project.orientationDeg).toBe(0)
  })

  it('changes what the sun pass reports', () => {
    storeApi.setOrientation(0)
    const north = roomSunExposure(useStore.getState().project)
    storeApi.setOrientation(90)
    const east = roomSunExposure(useStore.getState().project)
    // same windows, rotated plan — the facings must differ
    expect(north.length).toBeGreaterThan(0)
    expect(east.map((r) => r.facings.join())).not.toEqual(north.map((r) => r.facings.join()))
  })

  it('stays transient, the way the slider expects', () => {
    const steps = useStore.getState().past.length
    for (const d of [10, 20, 30, 40]) storeApi.setOrientation(d)
    expect(useStore.getState().past.length).toBe(steps)
  })
})

describe('copy / paste furniture', () => {
  it('copies the selected item and pastes an independent duplicate', () => {
    const src = useStore.getState().project.items[0]
    useStore.getState().select({ type: 'item', id: src.id })
    expect(storeApi.copyItems()).toBe(1)
    expect(useStore.getState().clipboard).toHaveLength(1)

    const before = useStore.getState().project.items.length
    expect(storeApi.pasteItems()).toBe(1)
    const items = useStore.getState().project.items
    expect(items.length).toBe(before + 1)

    const pasted = items[items.length - 1]
    expect(pasted.id).not.toBe(src.id)
    expect(pasted.catalogId).toBe(src.catalogId)
    expect(pasted.rotationY).toBe(src.rotationY)
    expect(pasted.scale).toBe(src.scale)
    expect(pasted.y).toBe(src.y)
    // nested objects are cloned, not shared with the original or the clipboard
    expect(pasted.material).not.toBe(src.material)
    expect(pasted.material).toEqual(src.material)
    expect(pasted.material).not.toBe(useStore.getState().clipboard[0].material)
  })

  it('leaves the pasted copy selected so it can be nudged', () => {
    const src = useStore.getState().project.items[0]
    useStore.getState().select({ type: 'item', id: src.id })
    storeApi.copyItems()
    storeApi.pasteItems()
    const items = useStore.getState().project.items
    const pastedId = items[items.length - 1].id
    expect(useStore.getState().selectedItemIds).toEqual([pastedId])
    expect(useStore.getState().selection.id).toBe(pastedId)
  })

  it('pastes as one undo step', () => {
    const src = useStore.getState().project.items[0]
    useStore.getState().select({ type: 'item', id: src.id })
    storeApi.copyItems()
    const before = useStore.getState().project.items.length
    storeApi.pasteItems()
    useStore.getState().undo()
    expect(useStore.getState().project.items.length).toBe(before)
  })

  it('is a no-op with nothing selected or an empty clipboard', () => {
    useStore.getState().clearSelection()
    useStore.setState({ clipboard: [] })
    expect(storeApi.copyItems()).toBe(0)
    const before = useStore.getState().project.items.length
    expect(storeApi.pasteItems()).toBe(0)
    expect(useStore.getState().project.items.length).toBe(before)
  })

  it('copying does not consume the clipboard — paste repeats', () => {
    const src = useStore.getState().project.items[0]
    useStore.getState().select({ type: 'item', id: src.id })
    storeApi.copyItems()
    const before = useStore.getState().project.items.length
    storeApi.pasteItems()
    storeApi.pasteItems()
    storeApi.pasteItems()
    expect(useStore.getState().project.items.length).toBe(before + 3)
    // repeated pastes step aside instead of stacking in one pile
    const pasted = useStore.getState().project.items.slice(-3)
    const spots = new Set(pasted.map((i) => `${i.position.x.toFixed(3)},${i.position.z.toFixed(3)}`))
    expect(spots.size).toBe(3)
  })

  it('keeps a copied group’s arrangement when pasted', () => {
    const [a, b] = useStore.getState().project.items
    useStore.getState().select({ type: 'item', id: a.id })
    useStore.getState().toggleItem(b.id)
    expect(storeApi.copyItems()).toBe(2)

    expect(storeApi.pasteItems()).toBe(2)
    const pasted = useStore.getState().project.items.slice(-2)
    // the offset between the two copies matches the offset between the originals
    expect(pasted[1].position.x - pasted[0].position.x).toBeCloseTo(
      b.position.x - a.position.x,
      5,
    )
    expect(pasted[1].position.z - pasted[0].position.z).toBeCloseTo(
      b.position.z - a.position.z,
      5,
    )
  })

  it('survives switching projects, so furniture can move between flats', () => {
    const src = useStore.getState().project.items[0]
    useStore.getState().select({ type: 'item', id: src.id })
    storeApi.copyItems()

    useStore.getState().newProject()
    expect(useStore.getState().project.items).toHaveLength(0)
    expect(useStore.getState().clipboard).toHaveLength(1)

    expect(storeApi.pasteItems()).toBe(1)
    expect(useStore.getState().project.items).toHaveLength(1)
    expect(useStore.getState().project.items[0].catalogId).toBe(src.catalogId)
  })

  it('does not put the clipboard in the saved project', () => {
    const src = useStore.getState().project.items[0]
    useStore.getState().select({ type: 'item', id: src.id })
    storeApi.copyItems()
    expect(JSON.stringify(useStore.getState().project)).not.toContain('clipboard')
  })
})

describe('multi-select', () => {
  it('toggles items and deletes/duplicates the group', () => {
    const [a, b, c] = useStore.getState().project.items.map((i) => i.id)
    useStore.getState().select({ type: 'item', id: a })
    expect(useStore.getState().selectedItemIds).toEqual([a])
    useStore.getState().toggleItem(b)
    useStore.getState().toggleItem(c)
    expect(useStore.getState().selectedItemIds).toHaveLength(3)
    useStore.getState().toggleItem(b)
    expect(useStore.getState().selectedItemIds).not.toContain(b)

    const beforeDup = useStore.getState().project.items.length
    storeApi.duplicateSelectedItem()
    expect(useStore.getState().project.items.length).toBe(beforeDup + 2)
    expect(useStore.getState().selectedItemIds).toHaveLength(2)

    const beforeDel = useStore.getState().project.items.length
    storeApi.removeSelected()
    expect(useStore.getState().project.items.length).toBe(beforeDel - 2)
    expect(useStore.getState().selectedItemIds).toHaveLength(0)
  })
})

describe('checkpoint', () => {
  it('makes a subsequent update() undoable as one step', () => {
    const it0 = useStore.getState().project.items[0]
    const startX = it0.position.x
    useStore.getState().checkpoint()
    // simulate a continuous edit gesture (no history of its own)
    useStore.getState().update((p) => {
      p.items[0].position.x = startX + 1
    })
    useStore.getState().update((p) => {
      p.items[0].position.x = startX + 2
    })
    expect(useStore.getState().project.items[0].position.x).toBe(startX + 2)
    useStore.getState().undo()
    expect(useStore.getState().project.items[0].position.x).toBe(startX)
  })
})

describe('renaming a project', () => {
  it('does not spend an undo step per keystroke', () => {
    const steps = useStore.getState().past.length
    for (const n of ['M', 'My', 'My ', 'My H', 'My Ho', 'My Home'])
      useStore.getState().renameProject(n)
    expect(useStore.getState().project.name).toBe('My Home')
    expect(useStore.getState().past.length).toBe(steps)
  })

  it('is undoable as one step when the field checkpoints on focus', () => {
    const original = useStore.getState().project.name
    useStore.getState().checkpoint() // what onFocus does
    for (const n of ['A', 'AB', 'ABC']) useStore.getState().renameProject(n)
    expect(useStore.getState().project.name).toBe('ABC')
    useStore.getState().undo()
    expect(useStore.getState().project.name).toBe(original)
  })

  it('still stamps updatedAt so the projects list reorders', () => {
    const before = useStore.getState().project.updatedAt
    useStore.getState().renameProject('Renamed')
    expect(useStore.getState().project.updatedAt).toBeGreaterThanOrEqual(before)
  })
})

describe('undo / redo', () => {
  it('reverts and reapplies a commit', () => {
    const n = useStore.getState().project.walls.length
    useStore.getState().commit((p) => {
      p.walls = []
    })
    expect(useStore.getState().project.walls.length).toBe(0)
    useStore.getState().undo()
    expect(useStore.getState().project.walls.length).toBe(n)
    useStore.getState().redo()
    expect(useStore.getState().project.walls.length).toBe(0)
  })
})

describe('duplicate and mirror rooms', () => {
  it('duplicates a room and the furniture standing on it', () => {
    const room = useStore.getState().project.rooms[0]
    const inside = useStore
      .getState()
      .project.items.filter((i) => {
        // rough: items whose position is within the room's bbox
        const xs = room.loop.map((v) => v.x)
        const zs = room.loop.map((v) => v.z)
        return (
          i.position.x >= Math.min(...xs) &&
          i.position.x <= Math.max(...xs) &&
          i.position.z >= Math.min(...zs) &&
          i.position.z <= Math.max(...zs)
        )
      }).length
    const beforeRooms = useStore.getState().project.rooms.length
    const beforeItems = useStore.getState().project.items.length

    storeApi.duplicateRoom(room.id)

    expect(useStore.getState().project.rooms.length).toBe(beforeRooms + 1)
    // at least the room itself is added; contained items ride along
    expect(useStore.getState().project.items.length).toBeGreaterThanOrEqual(
      beforeItems + inside,
    )
    useStore.getState().undo()
    expect(useStore.getState().project.rooms.length).toBe(beforeRooms)
    expect(useStore.getState().project.items.length).toBe(beforeItems)
  })

  it('mirrors a room in place across its centre, flipping rotation', () => {
    const room = useStore.getState().project.rooms[0]
    const cx = room.loop.reduce((s, v) => s + v.x, 0) / room.loop.length
    const target = useStore
      .getState()
      .project.items.find((i) => {
        const xs = room.loop.map((v) => v.x)
        const zs = room.loop.map((v) => v.z)
        return (
          i.position.x > Math.min(...xs) &&
          i.position.x < Math.max(...xs) &&
          i.position.z > Math.min(...zs) &&
          i.position.z < Math.max(...zs)
        )
      })
    if (!target) return // nothing inside to assert on
    const before = { x: target.position.x, z: target.position.z, rot: target.rotationY }

    storeApi.mirrorRoom(room.id)

    const after = useStore.getState().project.items.find((i) => i.id === target.id)!
    expect(after.position.x).toBeCloseTo(2 * cx - before.x, 5)
    expect(after.position.z).toBeCloseTo(before.z, 5)
    expect(after.rotationY).toBeCloseTo(-before.rot, 5)
  })
})
