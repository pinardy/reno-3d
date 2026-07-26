import {
  type Project,
  SCHEMA_VERSION,
  emptyProject,
  emptyAirconPlan,
} from '../../types/project'
import { nanoid } from 'nanoid'

/** Bring an older/partial project up to the current schema shape. */
export function migrateProject(raw: Partial<Project>): Project {
  const base = emptyProject(raw.id ?? nanoid(), raw.name ?? 'Untitled Home')
  const merged: Project = {
    ...base,
    ...raw,
    schemaVersion: SCHEMA_VERSION,
    floorPlan: { ...base.floorPlan, ...(raw.floorPlan ?? {}) },
    walls: raw.walls ?? [],
    openings: raw.openings ?? [],
    rooms: raw.rooms ?? [],
    items: raw.items ?? [],
  }
  // Projects saved before aircon planning existed have no plan at all; ones saved
  // mid-feature may be missing the trunking size. Leave it absent entirely when
  // there was none, so an untouched project doesn't gain empty state.
  if (raw.aircon) {
    merged.aircon = {
      ...emptyAirconPlan(),
      ...raw.aircon,
      runs: (raw.aircon.runs ?? []).filter((r) => Array.isArray(r.points) && r.points.length >= 2),
    }
  }
  return merged
}

export function exportProjectFile(project: Project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.replace(/[^\w-]+/g, '_') || 'home'}.reno.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importProjectFile(): Promise<Project | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const raw = JSON.parse(String(reader.result))
          // give imported project a fresh id so it doesn't clobber the current one
          const migrated = migrateProject(raw)
          migrated.id = nanoid()
          resolve(migrated)
        } catch (e) {
          alert('Could not read that file — is it a valid Reno project?')
          console.error(e)
          resolve(null)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  })
}
