import { useStore, storeApi } from '../../store/store'

// Sets which compass bearing the plan's "up" faces, so the sun (with the
// time-of-day slider) aligns to real directions.
export function Compass() {
  const orientation = useStore((s) => s.project.orientationDeg ?? 0)
  const set = (v: number) => storeApi.setOrientation(v)

  return (
    <div
      className="flex items-center gap-2 rounded-lg bg-panel/90 px-2.5 py-1.5 backdrop-blur"
      title="Compass — which way the top of the plan faces"
    >
      <svg
        width="26"
        height="26"
        viewBox="-13 -13 26 26"
        style={{ transform: `rotate(${-orientation}deg)` }}
      >
        <circle r="12" fill="none" stroke="#3a3f4a" strokeWidth="1.5" />
        <polygon points="0,-10 3.2,0.5 0,-2 -3.2,0.5" fill="#ef5f5f" />
        <polygon points="0,10 3.2,-0.5 0,2 -3.2,-0.5" fill="#8b93a3" />
      </svg>
      <input
        type="range"
        min={0}
        max={359}
        step={5}
        value={orientation}
        onChange={(e) => set(parseFloat(e.target.value))}
        className="w-20"
      />
      <div className="flex gap-0.5">
        {([['N', 0], ['E', 90], ['S', 180], ['W', 270]] as const).map(([l, d]) => (
          <button
            key={l}
            type="button"
            onClick={() => set(d)}
            className={`rounded px-1 text-[10px] ${
              orientation === d ? 'bg-accent text-white' : 'text-neutral-400 hover:bg-panel2'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}
