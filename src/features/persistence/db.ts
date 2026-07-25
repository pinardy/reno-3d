import { get, set, del, keys } from 'idb-keyval'
import type { Project } from '../../types/project'

const PREFIX = 'reno:project:'
const LAST_KEY = 'reno:lastProjectId'

export async function saveProject(p: Project): Promise<void> {
  await set(PREFIX + p.id, p)
  await set(LAST_KEY, p.id)
}

export async function loadProject(id: string): Promise<Project | undefined> {
  return (await get(PREFIX + id)) as Project | undefined
}

export async function deleteProject(id: string): Promise<void> {
  await del(PREFIX + id)
}

export async function lastProjectId(): Promise<string | undefined> {
  return (await get(LAST_KEY)) as string | undefined
}

export async function listProjects(): Promise<
  { id: string; name: string; updatedAt: number }[]
> {
  const all = await keys()
  const ids = all
    .filter((k): k is string => typeof k === 'string' && k.startsWith(PREFIX))
    .map((k) => k.slice(PREFIX.length))
  const projects = await Promise.all(ids.map((id) => loadProject(id)))
  return projects
    .filter((p): p is Project => !!p)
    .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}
