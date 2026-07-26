import { useEffect, useState } from 'react'
import { nanoid } from 'nanoid'
import { FolderOpen, Plus, Copy, Trash2, Check, GitCompare, GitBranch } from 'lucide-react'
import { useStore } from '../../store/store'
import {
  listProjects,
  loadProject as dbLoad,
  saveProject,
  deleteProject,
} from './db'
import { migrateProject } from './io'
import { familyRoot, nextVariantName } from '../variants/variants'

interface Row {
  id: string
  name: string
  updatedAt: number
}

/** `compact` drops the label so the trigger fits a phone header. */
export function ProjectsMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const currentId = useStore((s) => s.project.id)
  const storeLoad = useStore((s) => s.loadProject)
  const newProject = useStore((s) => s.newProject)

  const refresh = async () => setRows(await listProjects())

  useEffect(() => {
    if (open) refresh()
  }, [open])

  async function openProject(id: string) {
    if (id === currentId) {
      setOpen(false)
      return
    }
    const p = await dbLoad(id)
    if (p) storeLoad(migrateProject(p))
    setOpen(false)
  }

  async function duplicate(id: string) {
    const p = await dbLoad(id)
    if (!p) return
    const copy = {
      ...migrateProject(p),
      id: nanoid(),
      name: `${p.name} copy`,
      updatedAt: Date.now(),
    }
    await saveProject(copy, false) // don't move the "last opened" pointer
    refresh()
  }

  /**
   * Copy a layout as an alternative to weigh against the original, rather than as
   * an unrelated project: it joins the source's variant family so Compare can put
   * their numbers side by side. Opens it straight away, since the point is to start
   * rearranging it.
   */
  async function duplicateAsVariant(id: string) {
    const src = await dbLoad(id)
    if (!src) return
    const base = migrateProject(src)
    const root = familyRoot(base)
    // names already in the family, so the new one gets the next free letter
    const all = await Promise.all((await listProjects()).map((r) => dbLoad(r.id)))
    const family = all
      .filter(Boolean)
      .map((p) => migrateProject(p!))
      .filter((p) => familyRoot(p) === root)
    const variant = {
      ...base,
      id: nanoid(),
      name: nextVariantName(base.name, family.map((p) => p.name)),
      variantOf: root,
      updatedAt: Date.now(),
    }
    await saveProject(variant)
    storeLoad(variant)
    setOpen(false)
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await deleteProject(id)
    if (id === currentId) {
      // load the most recent remaining project, or start fresh
      const remaining = (await listProjects()).filter((r) => r.id !== id)
      if (remaining[0]) {
        const p = await dbLoad(remaining[0].id)
        if (p) storeLoad(migrateProject(p))
        else newProject()
      } else {
        newProject()
      }
    }
    refresh()
  }

  return (
    <div className="relative">
      <button
        type="button"
        title="Projects"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded px-2.5 text-xs text-neutral-300 hover:bg-panel2"
      >
        <FolderOpen size={15} />
        {!compact && 'Projects'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-72 rounded-lg border border-edge bg-panel shadow-xl">
            <div className="flex items-center justify-between border-b border-edge px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Saved homes
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  title="Compare layouts side by side"
                  onClick={() => {
                    setOpen(false)
                    useStore.getState().setCompareOpen(true)
                  }}
                  className="flex items-center gap-1 rounded bg-panel2 px-2 py-1 text-[11px] text-neutral-300 hover:bg-edge"
                >
                  <GitCompare size={12} /> Compare
                </button>
                <button
                  type="button"
                  onClick={() => {
                    newProject()
                    setOpen(false)
                  }}
                  className="flex items-center gap-1 rounded bg-accent/15 px-2 py-1 text-[11px] text-accent hover:bg-accent/25"
                >
                  <Plus size={12} /> New
                </button>
              </span>
            </div>
            <div className="no-scrollbar max-h-80 overflow-y-auto py-1">
              {rows.length === 0 && (
                <div className="px-3 py-4 text-center text-[11px] text-neutral-500">
                  No saved projects yet.
                </div>
              )}
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="group flex items-center gap-1 px-2 py-1.5 hover:bg-panel2"
                >
                  <button
                    type="button"
                    onClick={() => openProject(r.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="w-4 shrink-0">
                      {r.id === currentId && <Check size={14} className="text-accent" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-neutral-200">
                        {r.name || 'Untitled'}
                      </span>
                      <span className="block text-[10px] text-neutral-500">
                        {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : 'unsaved'}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    title="Duplicate as variant — an alternative to compare against this one"
                    onClick={() => duplicateAsVariant(r.id)}
                    className="rounded p-1 text-neutral-400 opacity-0 hover:bg-edge hover:text-neutral-200 group-hover:opacity-100"
                  >
                    <GitBranch size={13} />
                  </button>
                  <button
                    type="button"
                    title="Duplicate"
                    onClick={() => duplicate(r.id)}
                    className="rounded p-1 text-neutral-400 opacity-0 hover:bg-edge hover:text-neutral-200 group-hover:opacity-100"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => remove(r.id, r.name)}
                    className="rounded p-1 text-neutral-400 opacity-0 hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
