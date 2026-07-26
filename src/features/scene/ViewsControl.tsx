import { Bookmark, BookmarkPlus, X } from 'lucide-react'
import { useStore, storeApi } from '../../store/store'
import { getCameraPose, applyCameraPose } from './cameraBridge'

/**
 * Park the current camera angle and jump back to it later — handy for showing the
 * same corner to a contractor twice, or comparing two layouts from one viewpoint.
 * Views live in the project, so they export and share with it.
 */
export function ViewsControl() {
  const views = useStore((s) => s.project.views ?? [])

  function save() {
    const pose = getCameraPose()
    if (!pose) return
    storeApi.addView(`View ${views.length + 1}`, pose)
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-panel/90 p-1 backdrop-blur">
      <button
        type="button"
        onClick={save}
        title="Save this camera angle"
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-neutral-300 hover:bg-panel2"
      >
        <BookmarkPlus size={14} /> <span className="hidden sm:inline">Save view</span>
      </button>
      {views.map((v) => (
        <span key={v.id} className="group flex items-center rounded-md bg-panel2">
          <button
            type="button"
            onClick={() => applyCameraPose(v)}
            title={`Jump to ${v.name}`}
            className="flex items-center gap-1 py-1 pl-2 pr-1 text-xs text-neutral-300 hover:text-white"
          >
            <Bookmark size={12} className="text-accent" />
            {v.name.replace(/^View /, '')}
          </button>
          <button
            type="button"
            onClick={() => storeApi.removeView(v.id)}
            title={`Delete ${v.name}`}
            className="px-1 py-1 text-neutral-500 hover:text-red-300"
          >
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  )
}
