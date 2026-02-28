import { clamp, floorDivIndexWrap } from './math'
import { FractalNoise } from './noise'
import { SeededRng } from './rng'
import type { BoolMap, Color, Group, Vec2 } from './types'

function getAtPos(map: BoolMap, x: number, y: number): boolean | null {
  if (x < 0 || x >= map.length || y < 0 || y >= map[x].length) {
    return null
  }
  return map[x][y]
}

function colorAt(colors: Color[], index: number): Color {
  return colors[floorDivIndexWrap(index, colors.length)]
}

function floodFillNegative(
  map: BoolMap,
  groups: Group[],
  colorscheme: Color[],
  eyeColorscheme: Color[],
  nColors: number,
  outline: boolean,
  noiseA: FractalNoise,
  noiseB: FractalNoise,
): Group[] {
  const negativeMap: BoolMap = []
  for (let x = 0; x < map.length; x++) {
    const arr: boolean[] = []
    for (let y = 0; y < map[x].length; y++) {
      arr.push(!Boolean(getAtPos(map, x, y)))
    }
    negativeMap.push(arr)
  }

  return floodFill(negativeMap, groups, colorscheme, eyeColorscheme, nColors, true, outline, noiseA, noiseB)
}

function getColor(
  map: BoolMap,
  pos: Vec2,
  isNegative: boolean,
  right: boolean | null,
  left: boolean | null,
  down: boolean | null,
  up: boolean | null,
  colorscheme: Color[],
  eyeColorscheme: Color[],
  nColors: number,
  outline: boolean,
  group: Group,
  noiseA: FractalNoise,
  noiseB: FractalNoise,
): Color {
  const colX = Math.ceil(Math.abs(pos.x - (map.length - 1) * 0.5))
  let n = Math.pow(Math.abs(noiseA.getNoise2D(colX, pos.y)), 1.5) * 3.0
  let n2 = Math.pow(Math.abs(noiseB.getNoise2D(colX, pos.y)), 1.5) * 3.0

  if (!down) {
    if (isNegative) n2 -= 0.1
    else n -= 0.45
    n *= 0.8
    if (outline) {
      group.arr.push({ position: { x: pos.x, y: pos.y + 1 }, color: { r: 0, g: 0, b: 0, a: 1 } })
    }
  }

  if (!right) {
    if (isNegative) n2 += 0.1
    else n += 0.2
    n *= 1.1
    if (outline) {
      group.arr.push({ position: { x: pos.x + 1, y: pos.y }, color: { r: 0, g: 0, b: 0, a: 1 } })
    }
  }

  if (!up) {
    if (isNegative) n2 += 0.15
    else n += 0.45
    n *= 1.2
    if (outline) {
      group.arr.push({ position: { x: pos.x, y: pos.y - 1 }, color: { r: 0, g: 0, b: 0, a: 1 } })
    }
  }

  if (!left) {
    if (isNegative) n2 += 0.1
    else n += 0.2
    n *= 1.1
    if (outline) {
      group.arr.push({ position: { x: pos.x - 1, y: pos.y }, color: { r: 0, g: 0, b: 0, a: 1 } })
    }
  }

  const idx0 = Math.floor(noiseA.getNoise2D(colX, pos.y) * (nColors - 1))
  const idx1 = Math.floor(noiseA.getNoise2D(colX, pos.y - 1) * (nColors - 1))
  const idx2 = Math.floor(noiseA.getNoise2D(colX, pos.y + 1) * (nColors - 1))
  const idx3 = Math.floor(noiseA.getNoise2D(colX - 1, pos.y) * (nColors - 1))
  const idx4 = Math.floor(noiseA.getNoise2D(colX + 1, pos.y) * (nColors - 1))

  const c0 = colorAt(colorscheme, idx0)
  const c1 = colorAt(colorscheme, idx1)
  const c2 = colorAt(colorscheme, idx2)
  const c3 = colorAt(colorscheme, idx3)
  const c4 = colorAt(colorscheme, idx4)

  const diff =
    Math.abs(c0.r - c1.r) + Math.abs(c0.g - c1.g) + Math.abs(c0.b - c1.b) +
    Math.abs(c0.r - c2.r) + Math.abs(c0.g - c2.g) + Math.abs(c0.b - c2.b) +
    Math.abs(c0.r - c3.r) + Math.abs(c0.g - c3.g) + Math.abs(c0.b - c3.b) +
    Math.abs(c0.r - c4.r) + Math.abs(c0.g - c4.g) + Math.abs(c0.b - c4.b)

  if (diff > 2.0) {
    n += 0.3
    n *= 1.5
    n2 += 0.3
    n2 *= 1.5
  }

  n = Math.floor(clamp(n, 0, 1) * (nColors - 1))
  n2 = Math.floor(clamp(n2, 0, 1) * (nColors - 1))

  if (isNegative) {
    return colorAt(eyeColorscheme, n2)
  }
  return colorAt(colorscheme, n)
}

function floodFill(
  map: BoolMap,
  groups: Group[],
  colorscheme: Color[],
  eyeColorscheme: Color[],
  nColors: number,
  isNegative: boolean,
  outline: boolean,
  noiseA: FractalNoise,
  noiseB: FractalNoise,
): Group[] {
  const checkedMap: boolean[][] = []
  for (let x = 0; x < map.length; x++) {
    const arr: boolean[] = []
    for (let y = 0; y < map[x].length; y++) {
      arr.push(false)
    }
    checkedMap.push(arr)
  }

  const bucket: Vec2[] = []

  for (let x = 0; x < map.length; x++) {
    for (let y = 0; y < map[x].length; y++) {
      if (checkedMap[x][y]) {
        continue
      }

      checkedMap[x][y] = true
      if (!map[x][y]) {
        continue
      }

      bucket.push({ x, y })
      const group: Group = { arr: [], valid: true }

      while (bucket.length > 0) {
        const pos = bucket.pop()!
        const right = getAtPos(map, pos.x + 1, pos.y)
        const left = getAtPos(map, pos.x - 1, pos.y)
        const down = getAtPos(map, pos.x, pos.y + 1)
        const up = getAtPos(map, pos.x, pos.y - 1)

        if (isNegative && (left === null || up === null || down === null || right === null)) {
          group.valid = false
        }

        const col = getColor(
          map,
          pos,
          isNegative,
          right,
          left,
          down,
          up,
          colorscheme,
          eyeColorscheme,
          nColors,
          outline,
          group,
          noiseA,
          noiseB,
        )

        group.arr.push({ position: pos, color: col })

        if (right && !checkedMap[pos.x + 1][pos.y]) {
          bucket.push({ x: pos.x + 1, y: pos.y })
          checkedMap[pos.x + 1][pos.y] = true
        }
        if (left && !checkedMap[pos.x - 1][pos.y]) {
          bucket.push({ x: pos.x - 1, y: pos.y })
          checkedMap[pos.x - 1][pos.y] = true
        }
        if (down && !checkedMap[pos.x][pos.y + 1]) {
          bucket.push({ x: pos.x, y: pos.y + 1 })
          checkedMap[pos.x][pos.y + 1] = true
        }
        if (up && !checkedMap[pos.x][pos.y - 1]) {
          bucket.push({ x: pos.x, y: pos.y - 1 })
          checkedMap[pos.x][pos.y - 1] = true
        }
      }

      groups.push(group)
    }
  }

  return groups
}

export function fillColors(
  map: BoolMap,
  colorscheme: Color[],
  eyeColorscheme: Color[],
  nColors: number,
  outline: boolean,
  rng: SeededRng,
): { groups: Group[]; negativeGroups: Group[] } {
  const noiseA = new FractalNoise()
  noiseA.fractalOctaves = 5
  noiseA.frequency = 1.0 / 30.0
  noiseA.fractalGain = 0.4
  noiseA.fractalLacunarity = 3.0

  const noiseB = new FractalNoise()
  noiseB.fractalOctaves = 3
  noiseB.frequency = 1.0 / 40.0
  noiseB.fractalGain = 0.4
  noiseB.fractalLacunarity = 3.0

  noiseA.seed = rng.randi()
  noiseB.seed = rng.randi()

  const groups: Group[] = []
  const negativeGroups: Group[] = []

  const filledGroups = floodFill(
    map,
    groups,
    colorscheme,
    eyeColorscheme,
    nColors,
    false,
    outline,
    noiseA,
    noiseB,
  )

  const filledNegative = floodFillNegative(
    map,
    negativeGroups,
    colorscheme,
    eyeColorscheme,
    nColors,
    outline,
    noiseA,
    noiseB,
  )

  return { groups: filledGroups, negativeGroups: filledNegative }
}
