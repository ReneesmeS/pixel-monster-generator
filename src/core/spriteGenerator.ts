import { doAutomataSteps } from './cellularAutomata'
import { generateColorScheme } from './colorSchemeGenerator'
import { fillColors } from './colorFiller'
import { generateMap } from './mapGenerator'
import { SeededRng } from './rng'
import type { Cell, Group, RenderLayer, SpriteResult, SpriteSettings } from './types'

function groupIsTouchingGroup(g1: Cell[], g2: Cell[]): boolean {
  for (const c of g1) {
    for (const c2 of g2) {
      if (c.position.x === c2.position.x) {
        if (c.position.y === c2.position.y + 1 || c.position.y === c2.position.y - 1) {
          return true
        }
      } else if (c.position.y === c2.position.y) {
        if (c.position.x === c2.position.x + 1 || c.position.x === c2.position.x - 1) {
          return true
        }
      }
    }
  }
  return false
}

function buildLayers(groups: Group[], negativeGroups: Group[]): RenderLayer[] {
  let largest = 0
  for (const g of groups) {
    largest = Math.max(largest, g.arr.length)
  }

  const keptGroups: Group[] = []
  const layers: RenderLayer[] = []

  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i]
    group.start_time = group.arr.length + groups.length
    if (group.arr.length >= largest * 0.25) {
      keptGroups.push(group)
      layers.push({
        cells: group.arr,
        isEye: false,
        startTime: group.start_time,
      })
    }
  }

  for (const g of negativeGroups) {
    if (!g.valid) {
      continue
    }

    let touching = false
    for (const g2 of keptGroups) {
      if (groupIsTouchingGroup(g.arr, g2.arr)) {
        touching = true
        if (typeof g.start_time === 'number') {
          g2.start_time = g.start_time
        } else {
          g.start_time = g2.start_time
        }
      }
    }

    if (touching) {
      layers.push({
        cells: g.arr,
        isEye: (g.arr.length + negativeGroups.length) % 5 >= 3,
        startTime: g.start_time ?? 0,
      })
    }
  }

  return layers
}

export function generateSprite(settings: SpriteSettings): SpriteResult {
  const clampedSize = {
    x: Math.max(8, Math.floor(settings.size.x)),
    y: Math.max(8, Math.floor(settings.size.y)),
  }
  const nColors = Math.max(2, Math.floor(settings.nColors))

  const mapRng = new SeededRng(settings.seed)
  const map = generateMap(clampedSize, settings.symmetry, mapRng)

  const smoothMap = doAutomataSteps(map)

  const palette = generateColorScheme(nColors, settings.palette)
  const eyePalette = generateColorScheme(nColors, {
    ...settings.palette,
    mode: settings.palette.mode ?? 'monochrome',
  })

  const fillRng = new SeededRng(settings.seed)
  const allGroups = fillColors(smoothMap, palette, eyePalette, nColors, settings.outline, fillRng)
  const layers = buildLayers(allGroups.groups, allGroups.negativeGroups)

  return {
    map: smoothMap,
    groups: allGroups.groups,
    negativeGroups: allGroups.negativeGroups,
    layers,
    palette,
    eyePalette,
  }
}
