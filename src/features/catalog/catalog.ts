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
    kind: 'lamp',
    name: 'Potted Plant',
    category: 'Decor',
    size: { w: 0.5, d: 0.5, h: 1.1 },
    material: makeMaterial({ color: '#3f7d4f', roughness: 0.9 }),
    params: { plant: true },
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
    id: 'fridge',
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
  if (entry.id === 'wall-cabinet') y = 1.4
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
