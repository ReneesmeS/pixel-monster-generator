import { clamp, clampColor, hsvToColor, lerpHue, rgbToHsv, TWO_PI, wrap01 } from './math'
import { SeededRng } from './rng'
import type { Color, PaletteMode, PaletteSettings } from './types'

const MODES: PaletteMode[] = ['random', 'warm', 'cool', 'pastel', 'monochrome']

type Vec3 = { x: number; y: number; z: number }

type Params = {
  a: Vec3
  b: Vec3
  c: Vec3
  d: Vec3
}

function resolveMode(mode: PaletteSettings['mode']): PaletteMode {
  if (typeof mode === 'string') {
    const normalized = mode.toLowerCase()
    if (MODES.includes(normalized as PaletteMode)) {
      return normalized as PaletteMode
    }
  }
  return 'random'
}

function randomizeVec3(rng: SeededRng, base: Vec3, magnitude: number): Vec3 {
  return {
    x: clamp(base.x + rng.randfRange(-magnitude, magnitude), 0, 1),
    y: clamp(base.y + rng.randfRange(-magnitude, magnitude), 0, 1),
    z: clamp(base.z + rng.randfRange(-magnitude, magnitude), 0, 1),
  }
}

function buildParams(rng: SeededRng, a: Vec3, b: Vec3, c: Vec3, d: Vec3): Params {
  return {
    a: randomizeVec3(rng, a, 0.08),
    b: randomizeVec3(rng, b, 0.05),
    c: randomizeVec3(rng, c, 0.1),
    d: randomizeVec3(rng, d, 0.1),
  }
}

function getPaletteParams(mode: PaletteMode, rng: SeededRng): Params {
  const strength = 0.3
  if (mode === 'warm') {
    return buildParams(
      rng,
      { x: 0.25, y: 0.18, z: 0.15 },
      { x: strength + 0.15, y: strength, z: strength * 0.85 },
      { x: 0.3, y: 0.3, z: 0.25 },
      { x: 0.1, y: 0.3, z: 0.35 },
    )
  }

  if (mode === 'cool') {
    return buildParams(
      rng,
      { x: 0.1, y: 0.2, z: 0.35 },
      { x: strength * 0.9, y: strength + 0.1, z: strength + 0.15 },
      { x: 0.6, y: 0.5, z: 0.4 },
      { x: 0.45, y: 0.25, z: 0.15 },
    )
  }

  if (mode === 'pastel') {
    return buildParams(
      rng,
      { x: 0.55, y: 0.55, z: 0.55 },
      { x: 0.25, y: 0.25, z: 0.25 },
      { x: 0.25, y: 0.3, z: 0.35 },
      { x: 0.2, y: 0.35, z: 0.45 },
    )
  }

  if (mode === 'monochrome') {
    const base = rng.randfRange(0.25, 0.75)
    return buildParams(
      rng,
      { x: base, y: base, z: base },
      { x: 0.05, y: 0.05, z: 0.05 },
      { x: 0.1, y: 0.1, z: 0.1 },
      { x: 0.05, y: 0.05, z: 0.05 },
    )
  }

  return buildParams(
    rng,
    { x: rng.randfRange(0.0, 0.5), y: rng.randfRange(0.0, 0.5), z: rng.randfRange(0.0, 0.5) },
    { x: rng.randfRange(0.1, 0.6), y: rng.randfRange(0.1, 0.6), z: rng.randfRange(0.1, 0.6) },
    { x: rng.randfRange(0.15, 0.8), y: rng.randfRange(0.15, 0.8), z: rng.randfRange(0.15, 0.8) },
    { x: rng.randfRange(0.4, 0.6), y: rng.randfRange(0.4, 0.6), z: rng.randfRange(0.4, 0.6) },
  )
}

function parseHexColor(input: string): Color | null {
  const normalized = input.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(normalized)) {
    return null
  }

  const r = parseInt(normalized.slice(0, 2), 16) / 255
  const g = parseInt(normalized.slice(2, 4), 16) / 255
  const b = parseInt(normalized.slice(4, 6), 16) / 255
  const a = normalized.length === 8 ? parseInt(normalized.slice(6, 8), 16) / 255 : 1

  return { r, g, b, a }
}

function buildCustomPalette(source: PaletteSettings['custom_palette'], count: number, rng: SeededRng): Color[] {
  const base: Color[] = []
  if (Array.isArray(source)) {
    for (const item of source) {
      if (typeof item === 'string') {
        const parsed = parseHexColor(item)
        if (parsed) {
          base.push(parsed)
        }
      } else if (item && typeof item === 'object') {
        const color = item as Color
        if (typeof color.r === 'number' && typeof color.g === 'number' && typeof color.b === 'number') {
          base.push(clampColor({ r: color.r, g: color.g, b: color.b, a: color.a ?? 1 }))
        }
      }
    }
  }

  if (base.length === 0) {
    return []
  }

  if (count <= 0) {
    return []
  }

  if (base.length > count) {
    const indices = Array.from({ length: base.length }, (_, index) => index)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rng.nextFloat() * (i + 1))
      const tmp = indices[i]
      indices[i] = indices[j]
      indices[j] = tmp
    }
    return indices.slice(0, count).map((index) => base[index])
  }

  const result: Color[] = []
  for (let i = 0; i < count; i++) {
    result.push(base[i % base.length])
  }
  return result
}

function generateProceduralPalette(nColors: number, mode: PaletteMode, rng: SeededRng): Color[] {
  const params = getPaletteParams(mode, rng)
  const denom = Math.max(1, nColors - 1)
  const colors: Color[] = []

  for (let i = 0; i < nColors; i++) {
    const t = i / denom
    const x = params.a.x + params.b.x * Math.cos(TWO_PI * (params.c.x * t + params.d.x))
    const y = params.a.y + params.b.y * Math.cos(TWO_PI * (params.c.y * t + params.d.y))
    const z = params.a.z + params.b.z * Math.cos(TWO_PI * (params.c.z * t + params.d.z))
    colors.push(clampColor({ r: x, g: y, b: z, a: 1 }))
  }

  return colors
}

function applyModeAdjustments(
  hsv: { h: number; s: number; v: number },
  mode: PaletteMode,
  rng: SeededRng,
  jitter: number,
): { h: number; s: number; v: number } {
  const out = { ...hsv }
  const weight = 0.55

  if (mode === 'warm') {
    out.h = lerpHue(out.h, rng.randfRange(0.02, 0.12), weight)
    out.s = clamp(out.s * 1.2, 0, 1)
    out.v = clamp(out.v * 1.05, 0, 1)
  } else if (mode === 'cool') {
    out.h = lerpHue(out.h, rng.randfRange(0.55, 0.7), weight)
    out.s = clamp(out.s * 1.1, 0, 1)
  } else if (mode === 'pastel') {
    out.s = clamp(out.s * 0.6, 0, 1)
    out.v = clamp(out.v * 1.1, 0, 1)
    out.h = lerpHue(out.h, rng.nextFloat(), 0.3)
  } else if (mode === 'monochrome') {
    out.s = clamp(0.08 + rng.nextFloat() * jitter, 0, 0.25)
    return out
  }

  const hueNoise = rng.randfRange(-jitter, jitter)
  out.h = wrap01(out.h + hueNoise)
  return out
}

function applyPaletteAdjustments(
  basePalette: Color[],
  mode: PaletteMode,
  settings: Required<Pick<PaletteSettings, 'hue_shift' | 'saturation' | 'brightness' | 'contrast' | 'jitter'>>,
  rng: SeededRng,
  applyMode: boolean,
): Color[] {
  if (basePalette.length === 0) {
    return []
  }

  const result: Color[] = []
  const denom = Math.max(1, basePalette.length - 1)

  for (let i = 0; i < basePalette.length; i++) {
    let hsv = rgbToHsv(basePalette[i])

    if (applyMode) {
      hsv = applyModeAdjustments(hsv, mode, rng, settings.jitter)
    }

    hsv.h = wrap01(hsv.h + settings.hue_shift)
    hsv.s = clamp(hsv.s * settings.saturation, 0, 1)

    if (settings.contrast !== 0 && basePalette.length > 1) {
      const ratio = i / denom
      hsv.v = clamp(hsv.v + settings.contrast * ratio, 0, 1)
    } else {
      hsv.v = clamp(hsv.v, 0, 1)
    }

    hsv.v = clamp(hsv.v + settings.brightness, 0, 1)
    result.push(hsvToColor(hsv.h, hsv.s, hsv.v))
  }

  return result
}

export function generateColorScheme(nColors: number, settings: PaletteSettings = {}): Color[] {
  const safeNColors = Math.max(nColors, 2)
  const mode = resolveMode(settings.mode)

  const rngSeed = typeof settings.seed === 'number' ? settings.seed : (Math.random() * 0xffffffff) >>> 0
  const rng = new SeededRng(rngSeed)

  const hueShift = settings.hue_shift ?? 0
  const saturationScale = settings.saturation ?? 1
  const valueShift = settings.brightness ?? 0
  const contrast = clamp(settings.contrast ?? 0.25, -0.5, 0.5)
  const jitter = settings.jitter ?? 0.35

  const customPalette = buildCustomPalette(settings.custom_palette, safeNColors, rng)
  const applyModeAdjustments = customPalette.length === 0
  const basePalette = applyModeAdjustments
    ? generateProceduralPalette(safeNColors, mode, rng)
    : customPalette

  return applyPaletteAdjustments(
    basePalette,
    mode,
    {
      hue_shift: hueShift,
      saturation: saturationScale,
      brightness: valueShift,
      contrast,
      jitter,
    },
    rng,
    applyModeAdjustments,
  )
}
