// ---------------------------------------------------------------------------
// Reno 3D — core data model.
// A Project is the single source of truth. Everything (2D tracing + 3D scene)
// is derived from it. All world coordinates are in METRES, Y is up. The 2D
// plan lives on the X/Z ground plane (x = east, z = south on screen).
// ---------------------------------------------------------------------------

export const SCHEMA_VERSION = 1

export interface Vec2 {
  x: number
  z: number
}

export interface Material {
  color: string // hex, e.g. "#d8d3c8"
  roughness: number // 0..1
  metalness: number // 0..1
  texture?: string // preset texture id (see materials/presets)
}

export interface Wall {
  id: string
  a: Vec2 // start point (metres)
  b: Vec2 // end point (metres)
  height: number // metres
  thickness: number // metres
  material: Material
  structural?: boolean // load-bearing / can't be hacked (HDB)
}

export type OpeningType = 'door' | 'window' | 'cased' | 'sliding'

export interface Opening {
  id: string
  wallId: string
  type: OpeningType
  offset: number // distance along wall from a->b, to opening CENTER (metres)
  width: number // metres
  height: number // metres
  sillHeight: number // metres from floor to bottom of opening (0 for doors)
  hinge?: 'left' | 'right' // door hinge side (default 'left')
}

export interface Room {
  id: string
  name: string
  loop: Vec2[] // ordered polygon of floor corners (metres), CCW or CW
  floorMaterial: Material
  ceilingMaterial: Material
  showCeiling: boolean
}

export type ItemKind =
  | 'sofa'
  | 'bed'
  | 'table'
  | 'chair'
  | 'wardrobe'
  | 'rug'
  | 'lamp'
  | 'cabinet' // parametric kitchen cabinet
  | 'shelf' // open bookshelf
  | 'stool' // round stool / bar stool
  | 'tv' // flat-panel screen on a stand
  | 'toilet'
  | 'sink' // vanity / counter with basin
  | 'bathtub'
  | 'pendant' // hanging ceiling light
  | 'piano' // upright piano
  | 'vase' // decorative vase (optionally with flowers)
  | 'plant' // potted plant
  | 'picture' // framed wall art / mirror
  | 'appliance' // boxy appliance (fridge/washer/microwave…)
  | 'hood' // kitchen range hood
  | 'shower' // glass shower stall
  | 'toiletries' // small bottles cluster
  | 'curtain' // curtains / blinds panel
  | 'shelter' // HDB household shelter (bomb shelter)
  | 'gate' // HDB metal gate
  | 'fancoil' // aircon indoor unit (wall-mounted blower)
  | 'condenser' // aircon outdoor compressor (sits on the ledge)
  | 'glb' // external model

export interface Item {
  id: string
  catalogId: string
  kind: ItemKind
  name: string
  position: Vec2 // floor position (metres); y comes from item's base
  y: number // vertical offset (metres) — for wall cabinets etc.
  rotationY: number // radians
  scale: number // uniform scale multiplier
  material: Material
  // parametric params (cabinets, etc). Free-form per kind.
  params?: Record<string, number | string | boolean>
  modelUrl?: string // for kind === 'glb'
}

export type CameraMode = 'orbit' | 'walk'

export interface FloorPlan {
  imageDataUrl: string | null
  pxPerMeter: number | null // null until scale calibrated
  opacity: number // 0..1 background image opacity in 2D editor
  visible: boolean // show image in 2D editor
  // image placement in the 2D editor is implicit: image top-left at world (0,0),
  // 1 image pixel = 1/pxPerMeter metres.
}

/**
 * Refrigerant pipe + drain trunking from one fan coil back to its condenser.
 * `points` is the plan polyline (metres) from the fan coil end to the condenser
 * end; the run itself sits at `y` metres above the floor, usually tucked just
 * under the ceiling where a bulkhead or a length of casing would hide it.
 */
export interface TrunkingRun {
  id: string
  fanCoilId: string // item id, kind 'fancoil'
  condenserId: string // item id, kind 'condenser'
  points: Vec2[]
  y: number // centre height of the run above the floor (metres)
  /** Set once the corner has been flipped by hand, so re-routing keeps the choice. */
  elbowOf?: 'x' | 'z'
}

export interface AirconPlan {
  runs: TrunkingRun[]
  trunkingW: number // casing cross-section width (metres)
  trunkingH: number // casing cross-section height (metres)
}

export interface Project {
  schemaVersion: number
  id: string
  name: string
  updatedAt: number
  floorPlan: FloorPlan
  walls: Wall[]
  openings: Opening[]
  rooms: Room[]
  items: Item[]
  wallHeight: number // default wall height for new walls (metres)
  wallThickness: number // default wall thickness (metres)
  orientationDeg: number // compass bearing that screen-up / plan-up faces (0 = North up)
  views?: SavedView[] // optional so older saved projects load unchanged
  aircon?: AirconPlan // optional for the same reason
  /**
   * Id of the project this one is a variant of — the root of a family of layouts
   * being weighed against each other. Absent on a project that isn't a variant;
   * variants of variants point at the same root, so a family stays flat.
   */
  variantOf?: string
}

export const DEFAULT_TRUNKING_W = 0.1
export const DEFAULT_TRUNKING_H = 0.1

export function emptyAirconPlan(): AirconPlan {
  return { runs: [], trunkingW: DEFAULT_TRUNKING_W, trunkingH: DEFAULT_TRUNKING_H }
}

/** A parked camera position, so a layout can be shown from the same angle twice. */
export interface SavedView {
  id: string
  name: string
  pos: [number, number, number]
  target: [number, number, number]
}

// ---- defaults -------------------------------------------------------------

export const DEFAULT_WALL_HEIGHT = 2.8
export const DEFAULT_WALL_THICKNESS = 0.1

export const DEFAULT_WALL_MATERIAL: Material = {
  color: '#e8e4dc',
  roughness: 0.95,
  metalness: 0,
}
export const DEFAULT_FLOOR_MATERIAL: Material = {
  color: '#b7936a',
  roughness: 0.8,
  metalness: 0,
  texture: 'wood',
}
export const DEFAULT_CEILING_MATERIAL: Material = {
  color: '#f4f2ee',
  roughness: 1,
  metalness: 0,
}

export function makeMaterial(overrides: Partial<Material> = {}): Material {
  return { color: '#cccccc', roughness: 0.8, metalness: 0, ...overrides }
}

export function emptyProject(id: string, name = 'Untitled Home'): Project {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    name,
    updatedAt: 0,
    floorPlan: {
      imageDataUrl: null,
      pxPerMeter: null,
      opacity: 0.6,
      visible: true,
    },
    walls: [],
    openings: [],
    rooms: [],
    items: [],
    wallHeight: DEFAULT_WALL_HEIGHT,
    wallThickness: DEFAULT_WALL_THICKNESS,
    orientationDeg: 0,
  }
}

// Selection can target different entity types.
export type SelectionType = 'wall' | 'room' | 'opening' | 'item' | null
export interface Selection {
  type: SelectionType
  id: string | null
}
