import type { Wall, Vec2 } from '../../types/project'
import { polygonArea, projectOnSegment } from '../../geometry/vec'

// Auto-detect enclosed rooms from a set of walls using planar-graph face
// traversal (the "next edge clockwise" / left-hand rule). Returns candidate
// room loops (each an ordered polygon of metres). The unbounded outer face is
// discarded. This is best-effort: walls must share coincident endpoints, which
// the tracing snap enforces.

const TOL = 0.03 // metres — vertices closer than this are merged

interface HalfEdge {
  from: number
  to: number
  angle: number // angle of direction from->to
}

export function detectRoomLoops(walls: Wall[]): Vec2[][] {
  if (walls.length < 3) return []

  // 1. unique vertices
  const verts: Vec2[] = []
  const vindex = (p: Vec2): number => {
    for (let i = 0; i < verts.length; i++) {
      if (Math.abs(verts[i].x - p.x) < TOL && Math.abs(verts[i].z - p.z) < TOL)
        return i
    }
    verts.push({ x: p.x, z: p.z })
    return verts.length - 1
  }

  // Register every endpoint up front so T-junctions can be detected.
  for (const w of walls) {
    vindex(w.a)
    vindex(w.b)
  }

  // 1b. split each wall at any vertex lying on its interior (T-junctions),
  // producing a set of edges whose only shared points are graph nodes.
  const edges: [number, number][] = []
  for (const w of walls) {
    const onWall: { t: number; idx: number }[] = []
    for (let i = 0; i < verts.length; i++) {
      const { t, dist: dd } = projectOnSegment(verts[i], w.a, w.b)
      if (dd < TOL && t > 1e-6 && t < 1 - 1e-6) onWall.push({ t, idx: i })
    }
    onWall.sort((p, q) => p.t - q.t)
    const seq = [vindex(w.a), ...onWall.map((o) => o.idx), vindex(w.b)]
    for (let i = 0; i < seq.length - 1; i++) {
      if (seq[i] !== seq[i + 1]) edges.push([seq[i], seq[i + 1]])
    }
  }

  // 2. half-edges (both directions) from the split edges
  const halfEdges: HalfEdge[] = []
  const key = (a: number, b: number) => `${a}->${b}`
  const heIndex = new Map<string, number>()
  for (const [a, b] of edges) {
    if (a === b) continue
    const angAB = Math.atan2(verts[b].z - verts[a].z, verts[b].x - verts[a].x)
    const angBA = Math.atan2(verts[a].z - verts[b].z, verts[a].x - verts[b].x)
    if (!heIndex.has(key(a, b))) {
      heIndex.set(key(a, b), halfEdges.length)
      halfEdges.push({ from: a, to: b, angle: angAB })
    }
    if (!heIndex.has(key(b, a))) {
      heIndex.set(key(b, a), halfEdges.length)
      halfEdges.push({ from: b, to: a, angle: angBA })
    }
  }

  // 3. outgoing half-edges per vertex, sorted CCW by angle
  const outgoing: number[][] = verts.map(() => [])
  halfEdges.forEach((he, i) => outgoing[he.from].push(i))
  for (const list of outgoing) {
    list.sort((i, j) => halfEdges[i].angle - halfEdges[j].angle)
  }

  // next(h): at h.to, take the half-edge immediately clockwise from the twin
  const twinOf = (h: number) => {
    const he = halfEdges[h]
    return heIndex.get(key(he.to, he.from))!
  }
  const nextOf = (h: number): number => {
    const he = halfEdges[h]
    const twin = twinOf(h)
    const list = outgoing[he.to]
    const twinAngle = halfEdges[twin].angle
    // find twin position, then take the previous one (clockwise) in CCW-sorted list
    let idx = list.indexOf(twin)
    if (idx === -1) {
      // fallback: nearest by angle
      idx = 0
      let best = Infinity
      list.forEach((e, k) => {
        const d = Math.abs(halfEdges[e].angle - twinAngle)
        if (d < best) {
          best = d
          idx = k
        }
      })
    }
    const prev = (idx - 1 + list.length) % list.length
    return list[prev]
  }

  // 4. traverse faces
  const visited = new Set<number>()
  const loops: Vec2[][] = []
  for (let h = 0; h < halfEdges.length; h++) {
    if (visited.has(h)) continue
    const faceHE: number[] = []
    let cur = h
    let guard = 0
    while (!visited.has(cur) && guard++ < halfEdges.length + 2) {
      visited.add(cur)
      faceHE.push(cur)
      cur = nextOf(cur)
    }
    if (cur !== h) continue // not a clean cycle
    const poly = faceHE.map((e) => ({ ...verts[halfEdges[e].from] }))
    if (poly.length < 3) continue
    const area = polygonArea(poly)
    // keep bounded faces (positive area in our convention); skip outer + slivers
    if (area > 0.25) {
      loops.push(poly)
    }
  }

  return loops
}

/** Rough dimensions label for a room polygon (bounding box, metres). */
export function roomBBoxSize(loop: Vec2[]): { w: number; d: number; area: number } {
  const xs = loop.map((p) => p.x)
  const zs = loop.map((p) => p.z)
  const w = Math.max(...xs) - Math.min(...xs)
  const d = Math.max(...zs) - Math.min(...zs)
  return { w, d, area: Math.abs(polygonArea(loop)) }
}
