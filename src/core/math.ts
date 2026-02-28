import type { Color } from './types'

export const TWO_PI = 6.28318

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function wrap01(value: number): number {
  const wrapped = value % 1
  return wrapped < 0 ? wrapped + 1 : wrapped
}

export function lerpHue(fromHue: number, toHue: number, weight: number): number {
  let diff = wrap01(toHue - fromHue)
  if (diff > 0.5) {
    diff -= 1
  }
  return wrap01(fromHue + diff * clamp(weight, 0, 1))
}

export function clampColor(color: Color): Color {
  return {
    r: clamp(color.r, 0, 1),
    g: clamp(color.g, 0, 1),
    b: clamp(color.b, 0, 1),
    a: clamp(color.a, 0, 1),
  }
}

export function rgbToHsv(color: Color): { h: number; s: number; v: number } {
  const maxC = Math.max(color.r, color.g, color.b)
  const minC = Math.min(color.r, color.g, color.b)
  const delta = maxC - minC
  let hue = 0

  if (delta !== 0) {
    if (maxC === color.r) {
      hue = ((color.g - color.b) / delta) % 6
      if (hue < 0) hue += 6
    } else if (maxC === color.g) {
      hue = (color.b - color.r) / delta + 2
    } else {
      hue = (color.r - color.g) / delta + 4
    }
    hue /= 6
  }

  const saturation = maxC === 0 ? 0 : delta / maxC
  return { h: hue, s: saturation, v: maxC }
}

export function hsvToColor(h: number, s: number, v: number): Color {
  const hue = wrap01(h)
  const sat = clamp(s, 0, 1)
  const val = clamp(v, 0, 1)

  const i = Math.floor(hue * 6)
  const f = hue * 6 - i
  const p = val * (1 - sat)
  const q = val * (1 - f * sat)
  const t = val * (1 - (1 - f) * sat)

  switch (i % 6) {
    case 0:
      return { r: val, g: t, b: p, a: 1 }
    case 1:
      return { r: q, g: val, b: p, a: 1 }
    case 2:
      return { r: p, g: val, b: t, a: 1 }
    case 3:
      return { r: p, g: q, b: val, a: 1 }
    case 4:
      return { r: t, g: p, b: val, a: 1 }
    default:
      return { r: val, g: p, b: q, a: 1 }
  }
}

export function floorDivIndexWrap(index: number, length: number): number {
  if (length <= 0) return 0
  const wrapped = index % length
  return wrapped < 0 ? wrapped + length : wrapped
}
