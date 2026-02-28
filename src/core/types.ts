export type BoolMap = boolean[][]

export type PaletteMode = 'random' | 'warm' | 'cool' | 'pastel' | 'monochrome'

export interface Vec2 {
  x: number
  y: number
}

export interface Color {
  r: number
  g: number
  b: number
  a: number
}

export interface PaletteSettings {
  mode?: PaletteMode | string
  hue_shift?: number
  saturation?: number
  brightness?: number
  contrast?: number
  jitter?: number
  seed?: number
  custom_palette?: Array<Color | string>
}

export interface Cell {
  position: Vec2
  color: Color
}

export interface Group {
  arr: Cell[]
  valid: boolean
  start_time?: number
}

export interface RenderLayer {
  cells: Cell[]
  isEye: boolean
  startTime: number
}

export interface SpriteResult {
  map: BoolMap
  groups: Group[]
  negativeGroups: Group[]
  layers: RenderLayer[]
  palette: Color[]
  eyePalette: Color[]
}

export interface SpriteSettings {
  seed: number
  size: { x: number; y: number }
  nColors: number
  outline: boolean
  symmetry: number
  palette: PaletteSettings
}
