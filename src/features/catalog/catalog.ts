import {
  type Item,
  type ItemKind,
  type Material,
  type Vec2,
  makeMaterial,
} from '../../types/project'

export type Category =
  | 'Living'
  | 'Bedroom'
  | 'Kitchen'
  | 'Dining'
  | 'Bathroom'
  | 'Office'
  | 'Decor'

export interface CatalogEntry {
  id: string
  kind: ItemKind
  name: string
  category: Category
  size: { w: number; d: number; h: number } // metres, bounding footprint
  material: Material
  params?: Record<string, number | string | boolean>
  baseY?: number // default vertical lift (wall art, range hoods, counter items)
  price?: number // rough S$; falls back to PRICE_BY_KIND
}

// Rough S$ prices by kind, used when an entry has no explicit price. These are
// ballpark figures for a budget estimate, not real quotes.
const PRICE_BY_KIND: Record<ItemKind, number> = {
  sofa: 900,
  bed: 800,
  table: 350,
  chair: 80,
  wardrobe: 650,
  rug: 180,
  lamp: 90,
  cabinet: 300,
  shelf: 250,
  stool: 70,
  tv: 900,
  toilet: 250,
  sink: 350,
  bathtub: 900,
  pendant: 120,
  piano: 4000,
  vase: 60,
  plant: 80,
  picture: 120,
  appliance: 600,
  hood: 450,
  shower: 800,
  toiletries: 40,
  curtain: 150,
  glb: 0,
}

export function catalogPrice(entry: CatalogEntry): number {
  return entry.price ?? PRICE_BY_KIND[entry.kind] ?? 100
}

export const CATALOG: CatalogEntry[] = [
  {
    id: 'sofa-3',
    kind: 'sofa',
    name: '3-seat Sofa',
    category: 'Living',
    size: { w: 2.0, d: 0.9, h: 0.8 },
    material: makeMaterial({ color: '#6b7280', roughness: 0.9, texture: 'fabric' }),
  },
  {
    id: 'armchair',
    kind: 'sofa',
    name: 'Armchair',
    category: 'Living',
    size: { w: 0.9, d: 0.9, h: 0.8 },
    material: makeMaterial({ color: '#8a6f5a', roughness: 0.9, texture: 'fabric' }),
    params: { seats: 1 },
  },
  {
    id: 'coffee-table',
    kind: 'table',
    name: 'Coffee Table',
    category: 'Living',
    size: { w: 1.1, d: 0.6, h: 0.4 },
    material: makeMaterial({ color: '#8a5a33', roughness: 0.4, texture: 'wood' }),
  },
  {
    id: 'tv-console',
    kind: 'wardrobe',
    name: 'TV Console',
    category: 'Living',
    size: { w: 1.8, d: 0.4, h: 0.5 },
    material: makeMaterial({ color: '#2b2b2f', roughness: 0.5 }),
    params: { doors: 3 },
  },
  {
    id: 'rug',
    kind: 'rug',
    name: 'Area Rug',
    category: 'Decor',
    size: { w: 2.4, d: 1.6, h: 0.02 },
    material: makeMaterial({ color: '#9c6b52', roughness: 1, texture: 'carpet' }),
  },
  {
    id: 'floor-lamp',
    kind: 'lamp',
    name: 'Floor Lamp',
    category: 'Decor',
    size: { w: 0.4, d: 0.4, h: 1.6 },
    material: makeMaterial({ color: '#d8d2c4', roughness: 0.6, metalness: 0.3 }),
  },
  {
    id: 'plant',
    kind: 'plant',
    name: 'Potted Plant',
    category: 'Decor',
    size: { w: 0.5, d: 0.5, h: 1.1 },
    material: makeMaterial({ color: '#3f7d4f', roughness: 0.9 }),
  },
  {
    id: 'bed-queen',
    kind: 'bed',
    name: 'Queen Bed',
    category: 'Bedroom',
    size: { w: 1.6, d: 2.1, h: 1.0 },
    material: makeMaterial({ color: '#c9c2b6', roughness: 0.95, texture: 'fabric' }),
  },
  {
    id: 'bed-single',
    kind: 'bed',
    name: 'Single Bed',
    category: 'Bedroom',
    size: { w: 0.95, d: 1.95, h: 1.0 },
    material: makeMaterial({ color: '#c9c2b6', roughness: 0.95, texture: 'fabric' }),
  },
  {
    id: 'wardrobe',
    kind: 'wardrobe',
    name: 'Wardrobe',
    category: 'Bedroom',
    size: { w: 1.2, d: 0.6, h: 2.1 },
    material: makeMaterial({ color: '#a9784f', roughness: 0.5, texture: 'wood' }),
    params: { doors: 2 },
  },
  {
    id: 'nightstand',
    kind: 'wardrobe',
    name: 'Nightstand',
    category: 'Bedroom',
    size: { w: 0.45, d: 0.4, h: 0.5 },
    material: makeMaterial({ color: '#a9784f', roughness: 0.5, texture: 'wood' }),
    params: { doors: 1 },
  },
  {
    id: 'dining-table',
    price: 600,
    kind: 'table',
    name: 'Dining Table',
    category: 'Dining',
    size: { w: 1.6, d: 0.9, h: 0.75 },
    material: makeMaterial({ color: '#7a4f2e', roughness: 0.35, texture: 'wood' }),
  },
  {
    id: 'chair',
    kind: 'chair',
    name: 'Dining Chair',
    category: 'Dining',
    size: { w: 0.45, d: 0.5, h: 0.9 },
    material: makeMaterial({ color: '#4b3b2b', roughness: 0.5, texture: 'wood' }),
  },
  {
    id: 'base-cabinet',
    kind: 'cabinet',
    name: 'Base Cabinet',
    category: 'Kitchen',
    size: { w: 0.6, d: 0.6, h: 0.9 },
    material: makeMaterial({ color: '#e8e4dc', roughness: 0.4 }),
    params: { width: 0.6, depth: 0.6, height: 0.9, doors: 2, counter: true },
  },
  {
    id: 'wall-cabinet',
    kind: 'cabinet',
    name: 'Wall Cabinet',
    category: 'Kitchen',
    size: { w: 0.6, d: 0.35, h: 0.7 },
    material: makeMaterial({ color: '#e8e4dc', roughness: 0.4 }),
    params: { width: 0.6, depth: 0.35, height: 0.7, doors: 2, counter: false },
  },
  {
    id: 'corner-cabinet',
    kind: 'cabinet',
    name: 'Corner Cabinet (L)',
    category: 'Kitchen',
    size: { w: 1.0, d: 0.6, h: 0.9 },
    material: makeMaterial({ color: '#e8e4dc', roughness: 0.4 }),
    params: {
      width: 1.0,
      depth: 0.6,
      height: 0.9,
      doors: 1,
      counter: true,
      corner: true,
      legLen: 1.0,
    },
  },
  {
    id: 'fridge',
    price: 1200,
    kind: 'wardrobe',
    name: 'Fridge',
    category: 'Kitchen',
    size: { w: 0.7, d: 0.7, h: 1.8 },
    material: makeMaterial({ color: '#d5d7da', roughness: 0.3, metalness: 0.5 }),
    params: { doors: 2 },
  },

  // --- Living (extra) ---
  {
    id: 'bookshelf',
    kind: 'shelf',
    name: 'Bookshelf',
    category: 'Living',
    size: { w: 0.9, d: 0.3, h: 1.9 },
    material: makeMaterial({ color: '#a9784f', roughness: 0.5, texture: 'wood' }),
    params: { shelves: 4 },
  },
  {
    id: 'tv-55',
    kind: 'tv',
    name: '55" TV',
    category: 'Living',
    size: { w: 1.25, d: 0.3, h: 0.9 },
    material: makeMaterial({ color: '#111214', roughness: 0.4 }),
  },
  {
    id: 'side-table',
    kind: 'table',
    name: 'Side Table',
    category: 'Living',
    size: { w: 0.5, d: 0.5, h: 0.55 },
    material: makeMaterial({ color: '#8a5a33', roughness: 0.4, texture: 'wood' }),
  },

  // --- Bedroom (extra) ---
  {
    id: 'dresser',
    kind: 'wardrobe',
    name: 'Dresser',
    category: 'Bedroom',
    size: { w: 1.1, d: 0.5, h: 0.8 },
    material: makeMaterial({ color: '#a9784f', roughness: 0.5, texture: 'wood' }),
    params: { doors: 3 },
  },
  {
    id: 'vanity-stool',
    kind: 'stool',
    name: 'Stool',
    category: 'Bedroom',
    size: { w: 0.4, d: 0.4, h: 0.45 },
    material: makeMaterial({ color: '#c9c2b6', roughness: 0.9, texture: 'fabric' }),
  },

  // --- Dining (extra) ---
  {
    id: 'bar-stool',
    kind: 'stool',
    name: 'Bar Stool',
    category: 'Dining',
    size: { w: 0.4, d: 0.4, h: 0.75 },
    material: makeMaterial({ color: '#2b2b2f', roughness: 0.5, metalness: 0.3 }),
  },
  {
    id: 'sideboard',
    kind: 'cabinet',
    name: 'Sideboard',
    category: 'Dining',
    size: { w: 1.4, d: 0.45, h: 0.8 },
    material: makeMaterial({ color: '#7a4f2e', roughness: 0.4, texture: 'wood' }),
    params: { width: 1.4, depth: 0.45, height: 0.8, doors: 3, counter: false },
  },

  // --- Kitchen (extra) ---
  {
    id: 'kitchen-sink',
    kind: 'sink',
    name: 'Sink Unit',
    category: 'Kitchen',
    size: { w: 0.8, d: 0.6, h: 0.9 },
    material: makeMaterial({ color: '#e8e4dc', roughness: 0.4 }),
    params: { counter: true },
  },
  {
    id: 'stove',
    kind: 'wardrobe',
    name: 'Oven / Stove',
    category: 'Kitchen',
    size: { w: 0.6, d: 0.6, h: 0.9 },
    material: makeMaterial({ color: '#3a3d42', roughness: 0.4, metalness: 0.4 }),
    params: { doors: 1 },
  },
  {
    id: 'pantry',
    kind: 'wardrobe',
    name: 'Tall Pantry',
    category: 'Kitchen',
    size: { w: 0.6, d: 0.6, h: 2.1 },
    material: makeMaterial({ color: '#e8e4dc', roughness: 0.4 }),
    params: { doors: 2 },
  },

  // --- Bathroom ---
  {
    id: 'toilet',
    kind: 'toilet',
    name: 'Toilet',
    category: 'Bathroom',
    size: { w: 0.4, d: 0.7, h: 0.8 },
    material: makeMaterial({ color: '#f6f6f4', roughness: 0.2 }),
  },
  {
    id: 'bathroom-sink',
    kind: 'sink',
    name: 'Basin Vanity',
    category: 'Bathroom',
    size: { w: 0.6, d: 0.45, h: 0.85 },
    material: makeMaterial({ color: '#e6e2da', roughness: 0.4 }),
    params: { counter: true },
  },
  {
    id: 'bathtub',
    kind: 'bathtub',
    name: 'Bathtub',
    category: 'Bathroom',
    size: { w: 1.7, d: 0.75, h: 0.55 },
    material: makeMaterial({ color: '#f6f6f4', roughness: 0.15 }),
  },

  // --- Office ---
  {
    id: 'desk',
    kind: 'table',
    name: 'Desk',
    category: 'Office',
    size: { w: 1.4, d: 0.7, h: 0.75 },
    material: makeMaterial({ color: '#5a4632', roughness: 0.4, texture: 'wood' }),
  },
  {
    id: 'office-chair',
    kind: 'chair',
    name: 'Office Chair',
    category: 'Office',
    size: { w: 0.6, d: 0.6, h: 1.0 },
    material: makeMaterial({ color: '#2b2b2f', roughness: 0.6 }),
  },
  {
    id: 'bookshelf-tall',
    kind: 'shelf',
    name: 'Tall Shelf',
    category: 'Office',
    size: { w: 0.8, d: 0.3, h: 2.0 },
    material: makeMaterial({ color: '#8a5a33', roughness: 0.5, texture: 'wood' }),
    params: { shelves: 5 },
  },

  // --- Decor (extra) ---
  {
    id: 'pendant-light',
    kind: 'pendant',
    name: 'Pendant Light',
    category: 'Decor',
    size: { w: 0.35, d: 0.35, h: 0.4 },
    material: makeMaterial({ color: '#2b2b2f', roughness: 0.5, metalness: 0.3 }),
  },
  {
    id: 'curtains',
    kind: 'curtain',
    name: 'Curtains',
    category: 'Decor',
    size: { w: 1.6, d: 0.1, h: 2.4 },
    material: makeMaterial({ color: '#cfc6b8', roughness: 0.95, texture: 'fabric' }),
  },
  {
    id: 'blinds',
    kind: 'curtain',
    name: 'Blinds',
    category: 'Decor',
    size: { w: 1.2, d: 0.06, h: 1.3 },
    material: makeMaterial({ color: '#d8d2c4', roughness: 0.7 }),
    params: { blinds: true },
    baseY: 0.9,
  },

  // --- Built-in carpentry ---
  {
    id: 'built-in-wardrobe',
    kind: 'wardrobe',
    name: 'Built-in Wardrobe',
    category: 'Bedroom',
    size: { w: 2.4, d: 0.6, h: 2.4 },
    material: makeMaterial({ color: '#c9b79a', roughness: 0.5, texture: 'wood' }),
    params: { doors: 4 },
    price: 2500,
  },
  {
    id: 'kitchen-island',
    kind: 'cabinet',
    name: 'Kitchen Island',
    category: 'Kitchen',
    size: { w: 1.6, d: 0.9, h: 0.9 },
    material: makeMaterial({ color: '#e8e4dc', roughness: 0.4 }),
    params: { width: 1.6, depth: 0.9, height: 0.9, doors: 3, counter: true },
    price: 2000,
  },

  // ===== Living (more) =====
  {
    id: 'loveseat',
    kind: 'sofa',
    name: 'Loveseat',
    category: 'Living',
    size: { w: 1.5, d: 0.9, h: 0.8 },
    material: makeMaterial({ color: '#7a8a7c', roughness: 0.9, texture: 'fabric' }),
    params: { seats: 2 },
  },
  {
    id: 'sectional-sofa',
    price: 1600,
    kind: 'sofa',
    name: 'L-Sectional Sofa',
    category: 'Living',
    size: { w: 2.5, d: 1.6, h: 0.8 },
    material: makeMaterial({ color: '#59606b', roughness: 0.9, texture: 'fabric' }),
    params: { chaise: true },
  },
  {
    id: 'piano',
    price: 4500,
    kind: 'piano',
    name: 'Upright Piano',
    category: 'Living',
    size: { w: 1.5, d: 0.62, h: 1.2 },
    material: makeMaterial({ color: '#17181b', roughness: 0.25, metalness: 0.1 }),
  },
  {
    id: 'floor-vase',
    kind: 'vase',
    name: 'Floor Vase',
    category: 'Living',
    size: { w: 0.32, d: 0.32, h: 0.7 },
    material: makeMaterial({ color: '#b7724a', roughness: 0.4 }),
  },
  {
    id: 'wall-art-l',
    kind: 'picture',
    name: 'Wall Art (large)',
    category: 'Living',
    size: { w: 1.2, d: 0.05, h: 0.8 },
    material: makeMaterial({ color: '#6d84a8', roughness: 0.7 }),
    baseY: 1.15,
  },
  {
    id: 'wall-art-set',
    kind: 'picture',
    name: 'Framed Print',
    category: 'Living',
    size: { w: 0.55, d: 0.05, h: 0.75 },
    material: makeMaterial({ color: '#c58a5a', roughness: 0.7 }),
    baseY: 1.3,
  },
  {
    id: 'table-lamp',
    kind: 'lamp',
    name: 'Table Lamp',
    category: 'Living',
    size: { w: 0.3, d: 0.3, h: 0.5 },
    material: makeMaterial({ color: '#e6ddc9', roughness: 0.6 }),
    baseY: 0.4,
  },

  // ===== Bedroom (more) =====
  {
    id: 'bed-king',
    price: 1200,
    kind: 'bed',
    name: 'King Bed',
    category: 'Bedroom',
    size: { w: 1.9, d: 2.1, h: 1.0 },
    material: makeMaterial({ color: '#b9c3cb', roughness: 0.95, texture: 'fabric' }),
  },
  {
    id: 'bed-double',
    kind: 'bed',
    name: 'Double Bed',
    category: 'Bedroom',
    size: { w: 1.4, d: 2.0, h: 1.0 },
    material: makeMaterial({ color: '#cbb8a6', roughness: 0.95, texture: 'fabric' }),
  },
  {
    id: 'bed-kids',
    kind: 'bed',
    name: 'Kids Bed',
    category: 'Bedroom',
    size: { w: 0.95, d: 1.7, h: 0.85 },
    material: makeMaterial({ color: '#8fb7d6', roughness: 0.95, texture: 'fabric' }),
  },
  {
    id: 'bedroom-plant',
    kind: 'plant',
    name: 'Tall Plant',
    category: 'Bedroom',
    size: { w: 0.6, d: 0.6, h: 1.6 },
    material: makeMaterial({ color: '#3f7d4f', roughness: 0.9 }),
    params: { tall: true },
  },

  // ===== Kitchen appliances =====
  {
    id: 'microwave',
    kind: 'appliance',
    name: 'Microwave',
    category: 'Kitchen',
    size: { w: 0.5, d: 0.36, h: 0.3 },
    material: makeMaterial({ color: '#2c2f34', roughness: 0.4, metalness: 0.3 }),
    baseY: 0.9,
  },
  {
    id: 'dishwasher',
    kind: 'appliance',
    name: 'Dishwasher',
    category: 'Kitchen',
    size: { w: 0.6, d: 0.6, h: 0.85 },
    material: makeMaterial({ color: '#c9ccd0', roughness: 0.3, metalness: 0.5 }),
  },
  {
    id: 'washer',
    kind: 'appliance',
    name: 'Washing Machine',
    category: 'Kitchen',
    size: { w: 0.6, d: 0.6, h: 0.85 },
    material: makeMaterial({ color: '#e7e9ec', roughness: 0.35, metalness: 0.3 }),
    params: { roundDoor: true },
  },
  {
    id: 'range-hood',
    kind: 'hood',
    name: 'Range Hood',
    category: 'Kitchen',
    size: { w: 0.9, d: 0.5, h: 0.6 },
    material: makeMaterial({ color: '#c8ccd0', roughness: 0.3, metalness: 0.6 }),
    baseY: 1.5,
  },
  {
    id: 'coffee-machine',
    kind: 'appliance',
    name: 'Coffee Machine',
    category: 'Kitchen',
    size: { w: 0.3, d: 0.4, h: 0.4 },
    material: makeMaterial({ color: '#3a3d42', roughness: 0.4, metalness: 0.3 }),
    baseY: 0.9,
  },
  {
    id: 'kettle',
    kind: 'appliance',
    name: 'Kettle',
    category: 'Kitchen',
    size: { w: 0.22, d: 0.22, h: 0.26 },
    material: makeMaterial({ color: '#d5d7da', roughness: 0.3, metalness: 0.5 }),
    baseY: 0.9,
  },

  // ===== Bathroom (more) =====
  {
    id: 'shower',
    kind: 'shower',
    name: 'Shower Stall',
    category: 'Bathroom',
    size: { w: 0.9, d: 0.9, h: 2.0 },
    material: makeMaterial({ color: '#dfe6ea', roughness: 0.1, metalness: 0.1 }),
  },
  {
    id: 'mirror',
    kind: 'picture',
    name: 'Mirror',
    category: 'Bathroom',
    size: { w: 0.7, d: 0.04, h: 1.0 },
    material: makeMaterial({ color: '#dfe7ee', roughness: 0.05, metalness: 0.9 }),
    baseY: 1.0,
    params: { mirror: true },
  },
  {
    id: 'toiletries',
    kind: 'toiletries',
    name: 'Toiletries',
    category: 'Bathroom',
    size: { w: 0.3, d: 0.16, h: 0.22 },
    material: makeMaterial({ color: '#8fbfc8', roughness: 0.5 }),
    baseY: 0.9,
  },
  {
    id: 'towel-plant',
    kind: 'plant',
    name: 'Small Plant',
    category: 'Bathroom',
    size: { w: 0.3, d: 0.3, h: 0.5 },
    material: makeMaterial({ color: '#4f9d5f', roughness: 0.9 }),
    baseY: 0.9,
  },

  // ===== Office (more) =====
  {
    id: 'filing-cabinet',
    kind: 'cabinet',
    name: 'Filing Cabinet',
    category: 'Office',
    size: { w: 0.5, d: 0.6, h: 0.7 },
    material: makeMaterial({ color: '#4a4d52', roughness: 0.4, metalness: 0.3 }),
    params: { width: 0.5, depth: 0.6, height: 0.7, doors: 1, counter: false },
  },

  // ===== Decor (more) =====
  {
    id: 'table-vase',
    kind: 'vase',
    name: 'Vase with Flowers',
    category: 'Decor',
    size: { w: 0.2, d: 0.2, h: 0.3 },
    material: makeMaterial({ color: '#d8d2c4', roughness: 0.3 }),
    params: { flowers: true },
    baseY: 0.75,
  },
  {
    id: 'wall-mirror',
    kind: 'picture',
    name: 'Round Mirror',
    category: 'Decor',
    size: { w: 0.7, d: 0.05, h: 0.7 },
    material: makeMaterial({ color: '#dfe7ee', roughness: 0.05, metalness: 0.9 }),
    baseY: 1.2,
    params: { mirror: true, round: true },
  },
]

export const CATEGORIES: Category[] = [
  'Living',
  'Bedroom',
  'Kitchen',
  'Dining',
  'Bathroom',
  'Office',
  'Decor',
]

export function catalogById(id: string): CatalogEntry | undefined {
  return CATALOG.find((c) => c.id === id)
}

/** Build a placeable Item (minus id) from a catalog entry at a floor position. */
export function newItemFromCatalog(entry: CatalogEntry, pos: Vec2): Omit<Item, 'id'> {
  // wall cabinets float above the counter; pendants hang near the ceiling
  let y = 0
  if (typeof entry.baseY === 'number') y = entry.baseY
  else if (entry.id === 'wall-cabinet') y = 1.4
  else if (entry.kind === 'pendant') y = 2.3
  return {
    catalogId: entry.id,
    kind: entry.kind,
    name: entry.name,
    position: { ...pos },
    y,
    rotationY: 0,
    scale: 1,
    material: { ...entry.material },
    params: entry.params ? { ...entry.params } : undefined,
  }
}
