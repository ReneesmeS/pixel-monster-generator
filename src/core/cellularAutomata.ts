import type { BoolMap } from './types'

function getAtPos(map: BoolMap, x: number, y: number): boolean | null {
  if (x < 0 || x >= map.length || y < 0 || y >= map[x].length) {
    return null
  }
  return map[x][y]
}

function getNeighbours(map: BoolMap, x: number, y: number): number {
  let count = 0
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) {
        continue
      }
      if (getAtPos(map, x + i, y + j)) {
        count += 1
      }
    }
  }
  return count
}

function step(map: BoolMap, birthLimit: number, deathLimit: number): BoolMap {
  const dup = map.map((column) => [...column])
  for (let x = 0; x < map.length; x++) {
    for (let y = 0; y < map[x].length; y++) {
      const cell = dup[x][y]
      const neighbors = getNeighbours(map, x, y)

      if (cell && neighbors < deathLimit) {
        dup[x][y] = false
      } else if (!cell && neighbors > birthLimit) {
        dup[x][y] = true
      }
    }
  }
  return dup
}

export function doAutomataSteps(
  map: BoolMap,
  options?: { birthLimit?: number; deathLimit?: number; nSteps?: number },
): BoolMap {
  const birthLimit = options?.birthLimit ?? 5
  const deathLimit = options?.deathLimit ?? 4
  const nSteps = options?.nSteps ?? 4

  let current = map
  for (let i = 0; i < nSteps; i++) {
    current = step(current, birthLimit, deathLimit)
  }
  return current
}
