// Pure texture id list/type with NO three.js dependency, so UI (MaterialEditor,
// presets) can import it without pulling three into the initial bundle.

export type TextureId =
  | 'none'
  | 'wood'
  | 'wood-dark'
  | 'tile'
  | 'marble'
  | 'carpet'
  | 'concrete'
  | 'fabric'

export const TEXTURE_IDS: TextureId[] = [
  'none',
  'wood',
  'wood-dark',
  'tile',
  'marble',
  'carpet',
  'concrete',
  'fabric',
]
