import { useEffect, useRef, useState, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { useStore, storeApi } from '../../store/store'
import {
  type Vec2,
  DEFAULT_WALL_MATERIAL,
  DEFAULT_FLOOR_MATERIAL,
  DEFAULT_CEILING_MATERIAL,
} from '../../types/project'
import { type View, screenToWorld, zoomAt } from './view'
import { dist, projectOnSegment } from '../../geometry/vec'
import { drawTrace } from './renderer'
import { near, pointInPoly, cursorFor, hintFor } from './canvasUtil'

const PROVISIONAL_PPM = 100 // px/m used before the plan image is calibrated
const GRID = 0.1 // metres — fine grid snap step

interface DragState {
  kind: 'vertex' | 'wall' | 'pan'
  // vertex drag: original world position of the vertex being moved
  origin?: Vec2
  wallId?: string
  end?: 'a' | 'b' | 'both'
  wallOffset?: Vec2 // for wall body drag: pointer->a vector
  startScreen?: { x: number; y: number }
  startPan?: { x: number; y: number }
  preProject?: import('../../types/project').Project // snapshot for undo
}

export function TraceEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [view, setView] = useState<View>({ zoom: 60, panX: 100, panY: 100 })
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  // transient interaction state kept in refs (no re-render churn)
  const chainRef = useRef<Vec2[]>([])
  const hoverRef = useRef<{ point: Vec2; snap: string } | null>(null)
  const scaleRef = useRef<{ a: Vec2; b: Vec2 | null } | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const rafRef = useRef<number | null>(null)

  // exact-length entry while tracing ("type 3.6 + Enter")
  const [dimEntry, setDimEntry] = useState<string | null>(null)
  const dimEntryRef = useRef<string | null>(null)
  const setDim = (v: string | null) => {
    dimEntryRef.current = v
    setDimEntry(v)
  }

  const tool = useStore((s) => s.tool)
  const toolRef = useRef(tool)
  useEffect(() => {
    toolRef.current = tool
    // reset any in-progress drawing when switching tools
    chainRef.current = []
    scaleRef.current = null
    setDim(null)
    requestRedraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool])

  const ppm = () =>
    useStore.getState().project.floorPlan.pxPerMeter ?? PROVISIONAL_PPM

  // ---- load background image ---------------------------------------------
  useEffect(() => {
    const unsub = useStore.subscribe((s) => {
      const url = s.project.floorPlan.imageDataUrl
      if (!url) {
        imgRef.current = null
        requestRedraw()
        return
      }
      if (imgRef.current?.src === url) return
      const img = new Image()
      img.onload = () => {
        imgRef.current = img
        fitView()
        requestRedraw()
      }
      img.src = url
    })
    // trigger once for current state
    const url0 = useStore.getState().project.floorPlan.imageDataUrl
    if (url0) {
      const img = new Image()
      img.onload = () => {
        imgRef.current = img
        fitView()
        requestRedraw()
      }
      img.src = url0
    }
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // redraw whenever the store changes
  useEffect(() => {
    const unsub = useStore.subscribe(requestRedraw)
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- canvas sizing ------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current!
    const container = containerRef.current!
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      const { clientWidth: w, clientHeight: h } = container
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      requestRedraw()
    })
    ro.observe(container)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fitView = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const cw = container.clientWidth
    const ch = container.clientHeight
    const p = useStore.getState().project
    // fit to image if present, else to walls bbox, else default 8x6m
    let minX = 0
    let minZ = 0
    let maxX = 8
    let maxZ = 6
    if (imgRef.current) {
      maxX = imgRef.current.naturalWidth / ppm()
      maxZ = imgRef.current.naturalHeight / ppm()
    } else if (p.walls.length) {
      minX = Math.min(...p.walls.flatMap((w) => [w.a.x, w.b.x]))
      minZ = Math.min(...p.walls.flatMap((w) => [w.a.z, w.b.z]))
      maxX = Math.max(...p.walls.flatMap((w) => [w.a.x, w.b.x]))
      maxZ = Math.max(...p.walls.flatMap((w) => [w.a.z, w.b.z]))
    }
    const pad = 40
    const zoom = Math.min(
      (cw - pad * 2) / Math.max(0.5, maxX - minX),
      (ch - pad * 2) / Math.max(0.5, maxZ - minZ),
    )
    const z = Math.max(4, Math.min(200, zoom))
    setView({
      zoom: z,
      panX: pad - minX * z,
      panY: pad - minZ * z,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- drawing ------------------------------------------------------------
  const requestRedraw = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      draw()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')!
    const { project, selection } = useStore.getState()
    drawTrace(ctx, {
      view: viewRef.current,
      W: container.clientWidth,
      H: container.clientHeight,
      project,
      selection,
      img: imgRef.current,
      ppm: ppm(),
      tool: toolRef.current,
      chain: chainRef.current,
      hover: hoverRef.current,
      scale: scaleRef.current,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // redraw when view changes
  useEffect(() => {
    requestRedraw()
  }, [view, requestRedraw])

  // ---- snapping -----------------------------------------------------------
  const collectVertices = (): Vec2[] => {
    const p = useStore.getState().project
    const vs: Vec2[] = []
    for (const w of p.walls) {
      vs.push(w.a, w.b)
    }
    return vs
  }

  const snap = useCallback(
    (raw: Vec2): { point: Vec2; snap: string } => {
      const v = viewRef.current
      const tolWorld = 10 / v.zoom
      // 1. vertex snap
      let best: Vec2 | null = null
      let bestD = tolWorld
      for (const vert of collectVertices()) {
        const d = dist(raw, vert)
        if (d < bestD) {
          bestD = d
          best = vert
        }
      }
      const chain = chainRef.current
      if (chain.length && dist(raw, chain[0]) < tolWorld) {
        return { point: { ...chain[0] }, snap: 'close' }
      }
      if (best) return { point: { ...best }, snap: 'vertex' }
      // 2. axis snap from last chain point
      let pt = { ...raw }
      let snapKind = 'free'
      if (chain.length) {
        const last = chain[chain.length - 1]
        if (Math.abs(raw.x - last.x) < tolWorld) {
          pt.x = last.x
          snapKind = 'axis'
        }
        if (Math.abs(raw.z - last.z) < tolWorld) {
          pt.z = last.z
          snapKind = 'axis'
        }
      }
      // 3. grid snap
      pt = {
        x: Math.round(pt.x / GRID) * GRID,
        z: Math.round(pt.z / GRID) * GRID,
      }
      if (snapKind === 'free') snapKind = 'grid'
      return { point: pt, snap: snapKind }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // ---- hit testing --------------------------------------------------------
  const hitTest = (world: Vec2) => {
    const p = useStore.getState().project
    const v = viewRef.current
    const tol = 8 / v.zoom
    // vertices first
    for (const w of p.walls) {
      for (const end of ['a', 'b'] as const) {
        if (dist(world, w[end]) < tol)
          return { type: 'vertex' as const, wallId: w.id, end, pos: w[end] }
      }
    }
    // openings
    for (const op of p.openings) {
      const w = p.walls.find((x) => x.id === op.wallId)
      if (!w) continue
      const { point, dist: dd } = projectOnSegment(world, w.a, w.b)
      const off = dist(w.a, point)
      if (dd < tol && Math.abs(off - op.offset) < op.width / 2)
        return { type: 'opening' as const, id: op.id }
    }
    // walls
    for (const w of p.walls) {
      const { dist: dd } = projectOnSegment(world, w.a, w.b)
      if (dd < Math.max(tol, w.thickness / 2)) return { type: 'wall' as const, id: w.id }
    }
    // rooms
    for (const r of p.rooms) {
      if (pointInPoly(world, r.loop)) return { type: 'room' as const, id: r.id }
    }
    return null
  }

  // ---- pointer handlers ---------------------------------------------------
  const getWorld = (e: React.PointerEvent): Vec2 => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top, viewRef.current)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    canvasRef.current!.setPointerCapture(e.pointerId)
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = getWorld(e)
    const t = toolRef.current

    // pan: middle mouse, right mouse, or space held
    if (e.button === 1 || e.button === 2 || spaceRef.current) {
      dragRef.current = {
        kind: 'pan',
        startScreen: { x: sx, y: sy },
        startPan: { x: viewRef.current.panX, y: viewRef.current.panY },
      }
      return
    }
    if (e.button !== 0) return

    const st = useStore.getState()

    if (t === 'scale') {
      const s = snap(world)
      if (!scaleRef.current) {
        scaleRef.current = { a: s.point, b: null }
      } else {
        scaleRef.current.b = s.point
        finishScale()
      }
      requestRedraw()
      return
    }

    if (t === 'wall' || t === 'room') {
      if (!canTrace()) {
        alert('Set the scale first: pick the Scale tool and draw a line over a known dimension.')
        return
      }
      const s = snap(world)
      const chain = chainRef.current
      if (s.snap === 'close' && chain.length >= (t === 'room' ? 3 : 2)) {
        finishChain(true)
      } else {
        chain.push(s.point)
      }
      setDim(null)
      requestRedraw()
      return
    }

    if (t === 'door' || t === 'window') {
      placeOpening(world, t)
      return
    }

    // select tool
    const hit = hitTest(world)
    if (!hit) {
      st.clearSelection()
      requestRedraw()
      return
    }
    if (hit.type === 'vertex') {
      st.select({ type: 'wall', id: hit.wallId })
      dragRef.current = {
        kind: 'vertex',
        origin: { ...hit.pos },
        preProject: st.project,
      }
    } else if (hit.type === 'wall') {
      st.select({ type: 'wall', id: hit.id })
      const w = st.project.walls.find((x) => x.id === hit.id)!
      dragRef.current = {
        kind: 'wall',
        wallId: hit.id,
        wallOffset: { x: world.x - w.a.x, z: world.z - w.a.z },
        preProject: st.project,
      }
    } else if (hit.type === 'opening') {
      st.select({ type: 'opening', id: hit.id })
    } else if (hit.type === 'room') {
      st.select({ type: 'room', id: hit.id })
    }
    requestRedraw()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = getWorld(e)
    const drag = dragRef.current

    if (drag?.kind === 'pan') {
      setView((v) => ({
        ...v,
        panX: drag.startPan!.x + (sx - drag.startScreen!.x),
        panY: drag.startPan!.y + (sy - drag.startScreen!.y),
      }))
      return
    }

    if (drag?.kind === 'vertex') {
      const s = snap(world)
      const from = drag.origin!
      useStore.getState().update((p) => {
        for (const w of p.walls) {
          if (near(w.a, from)) w.a = { ...s.point }
          if (near(w.b, from)) w.b = { ...s.point }
        }
      })
      drag.origin = { ...s.point }
      requestRedraw()
      return
    }

    if (drag?.kind === 'wall') {
      const w0 = useStore.getState().project.walls.find((x) => x.id === drag.wallId)
      if (w0) {
        const newA = { x: world.x - drag.wallOffset!.x, z: world.z - drag.wallOffset!.z }
        const s = snap(newA)
        const dx = s.point.x - w0.a.x
        const dz = s.point.z - w0.a.z
        useStore.getState().update((p) => {
          const w = p.walls.find((x) => x.id === drag.wallId)!
          w.a = { x: w.a.x + dx, z: w.a.z + dz }
          w.b = { x: w.b.x + dx, z: w.b.z + dz }
        })
      }
      requestRedraw()
      return
    }

    // hover snapping for drawing tools
    const t = toolRef.current
    if (t === 'wall' || t === 'room' || t === 'scale') {
      hoverRef.current = snap(world)
    } else {
      hoverRef.current = null
    }
    requestRedraw()
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if ((drag?.kind === 'vertex' || drag?.kind === 'wall') && drag.preProject) {
      // the move was applied via update() (no history); record the pre-drag
      // snapshot as a single undo step, but only if something actually moved.
      if (drag.preProject !== useStore.getState().project) {
        useStore.getState().pushPast(drag.preProject)
      }
    }
    dragRef.current = null
    try {
      canvasRef.current!.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onDoubleClick = () => {
    const t = toolRef.current
    if (t === 'wall' || t === 'room') finishChain(false)
  }

  const onWheel = (e: React.WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    setView((v) => zoomAt(v, sx, sy, factor))
  }

  // ---- actions ------------------------------------------------------------
  const canTrace = () => {
    const p = useStore.getState().project
    return !p.floorPlan.imageDataUrl || p.floorPlan.pxPerMeter != null
  }

  const finishChain = (closed: boolean) => {
    const chain = chainRef.current
    const t = toolRef.current
    if (t === 'wall') {
      if (chain.length >= 2) {
        const st = useStore.getState()
        st.commit((p) => {
          for (let i = 0; i < chain.length - 1; i++) {
            p.walls.push({
              id: nanoid(),
              a: { ...chain[i] },
              b: { ...chain[i + 1] },
              height: p.wallHeight,
              thickness: p.wallThickness,
              material: { ...DEFAULT_WALL_MATERIAL },
            })
          }
          if (closed && chain.length >= 3) {
            p.walls.push({
              id: nanoid(),
              a: { ...chain[chain.length - 1] },
              b: { ...chain[0] },
              height: p.wallHeight,
              thickness: p.wallThickness,
              material: { ...DEFAULT_WALL_MATERIAL },
            })
          }
        })
      }
    } else if (t === 'room') {
      if (chain.length >= 3) {
        storeApi.addRoom({
          name: `Room ${useStore.getState().project.rooms.length + 1}`,
          loop: chain.map((p) => ({ ...p })),
          floorMaterial: { ...DEFAULT_FLOOR_MATERIAL },
          ceilingMaterial: { ...DEFAULT_CEILING_MATERIAL },
          showCeiling: false,
        })
      }
    }
    chainRef.current = []
    hoverRef.current = null
    setDim(null)
    requestRedraw()
  }

  // place the next chain point at an exact distance in the current hover direction
  const placeByLength = (len: number) => {
    const chain = chainRef.current
    const hover = hoverRef.current
    if (!chain.length || !hover || !(len > 0)) return
    const last = chain[chain.length - 1]
    let dx = hover.point.x - last.x
    let dz = hover.point.z - last.z
    const d = Math.hypot(dx, dz)
    if (d < 1e-6) return
    dx /= d
    dz /= d
    chain.push({ x: last.x + dx * len, z: last.z + dz * len })
    requestRedraw()
  }

  const finishScale = () => {
    const sc = scaleRef.current
    if (!sc || !sc.b) return
    const worldLen = dist(sc.a, sc.b)
    const input = prompt(
      `This line is currently ${worldLen.toFixed(2)} m.\nEnter its real length in metres:`,
      worldLen.toFixed(2),
    )
    scaleRef.current = null
    if (!input) {
      requestRedraw()
      return
    }
    const real = parseFloat(input)
    if (!Number.isFinite(real) || real <= 0) {
      requestRedraw()
      return
    }
    const pOld = ppm()
    const pNew = (worldLen * pOld) / real
    useStore.getState().commit((p) => {
      p.floorPlan.pxPerMeter = pNew
    })
    useStore.getState().setTool('wall')
    fitView()
  }

  const placeOpening = (world: Vec2, type: 'door' | 'window') => {
    const p = useStore.getState().project
    const v = viewRef.current
    let bestWall: string | null = null
    let bestOffset = 0
    let bestD = 14 / v.zoom
    for (const w of p.walls) {
      const { point, dist: dd } = projectOnSegment(world, w.a, w.b)
      if (dd < bestD) {
        bestD = dd
        bestWall = w.id
        bestOffset = dist(w.a, point)
      }
    }
    if (!bestWall) {
      alert('Click on a wall to place a ' + type + '.')
      return
    }
    storeApi.addOpening({
      wallId: bestWall,
      type,
      offset: bestOffset,
      width: type === 'door' ? 0.9 : 1.2,
      height: type === 'door' ? 2.05 : 1.2,
      sillHeight: type === 'door' ? 0 : 0.9,
    })
    useStore.getState().select({
      type: 'opening',
      id: useStore.getState().project.openings.at(-1)!.id,
    })
  }

  // ---- keyboard: space pan, enter/esc for chains --------------------------
  const spaceRef = useRef(false)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tgt = e.target
      if (
        tgt instanceof HTMLElement &&
        (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)
      )
        return
      if (e.code === 'Space') spaceRef.current = true
      const t = toolRef.current
      const drawing = (t === 'wall' || t === 'room') && chainRef.current.length >= 1

      // type an exact segment length: digits/decimal + Enter
      if (drawing && /^[0-9.]$/.test(e.key)) {
        setDim((dimEntryRef.current ?? '') + e.key)
        e.preventDefault()
        return
      }
      if (drawing && e.key === 'Backspace' && dimEntryRef.current != null) {
        const nv = dimEntryRef.current.slice(0, -1)
        setDim(nv || null)
        e.preventDefault()
        return
      }

      if (e.key === 'Enter') {
        if (t === 'wall' || t === 'room') {
          if (dimEntryRef.current) {
            placeByLength(parseFloat(dimEntryRef.current))
            setDim(null)
          } else {
            finishChain(false)
          }
        }
      }
      if (e.key === 'Escape') {
        if (dimEntryRef.current != null) {
          setDim(null)
          return
        }
        if (chainRef.current.length || scaleRef.current) {
          chainRef.current = []
          scaleRef.current = null
          requestRedraw()
        }
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceRef.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasImage = useStore((s) => !!s.project.floorPlan.imageDataUrl)
  const calibrated = useStore((s) => s.project.floorPlan.pxPerMeter != null)

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        style={{ cursor: cursorFor(tool) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* exact-length entry chip */}
      {dimEntry !== null && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          Length: {dimEntry || '0'} m — Enter to place · Esc to cancel
        </div>
      )}

      {/* status hints */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-panel/80 px-3 py-1.5 text-[11px] text-neutral-400 backdrop-blur">
        {(tool === 'wall' || tool === 'room')
          ? 'Tip: point with the mouse, then type a number + Enter for an exact length. '
          : ''}
        {hintFor(tool, hasImage, calibrated)}
      </div>
      <button
        type="button"
        onClick={fitView}
        className="pointer-events-auto absolute bottom-3 right-3 rounded-md bg-panel px-3 py-1.5 text-[11px] text-neutral-300 ring-1 ring-edge hover:bg-panel2"
      >
        Fit view
      </button>
    </div>
  )
}

