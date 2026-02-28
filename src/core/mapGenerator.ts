import type { BoolMap } from './types'
import { SeededRng } from './rng'

function setAtPos(map: BoolMap, x: number, y: number, value: boolean): boolean {
  if (x < 0 || x >= map.length || y < 0 || y >= map[x].length) {
    return false
  }
  map[x][y] = value
  return true
}

function randomWalk(size: { x: number; y: number }, map: BoolMap, rng: SeededRng): void {
  let posX = rng.randi(size.x)
  let posY = rng.randi(size.y)

  for (let i = 0; i < 100; i++) {
    setAtPos(map, posX, posY, true)
    setAtPos(map, size.x - posX - 1, posY, true)

    posX += rng.randi(3) - 1
    posY += rng.randi(3) - 1
  }
}

function getRandomMap(size: { x: number; y: number }, rng: SeededRng): BoolMap {
  const map: BoolMap = []
  for (let x = 0; x < size.x; x++) {
    map.push([])
  }

  const half = Math.ceil(size.x * 0.5)
  for (let x = 0; x < half; x++) {
    const arr: boolean[] = []
    for (let y = 0; y < size.y; y++) {
      arr.push(rng.randBool(0.48))

      const toCenter = (Math.abs(y - size.y * 0.5) * 2.0) / size.y
      if (x === Math.floor(size.x * 0.5) - 1 || x === Math.floor(size.x * 0.5) - 2) {
        if (rng.randfRange(0.0, 0.4) > toCenter) {
          arr[y] = true
        }
      }
    }

    map[x] = [...arr]
    map[size.x - x - 1] = [...arr]
  }

  return map
}

export function generateMap(size: { x: number; y: number }, symmetry: number, rng: SeededRng): BoolMap {
  const map = getRandomMap(size, rng)

  for (let i = 0; i < 2; i++) {
    randomWalk(size, map, rng)
  }

  const half = Math.ceil(size.x * 0.5)
  for (let x = half; x < size.x; x++) {
    for (let y = 0; y < size.y; y++) {
      if (rng.randfRange(0, 100) > symmetry) {
        map[x][y] = rng.randBool(0.48)

        const toCenter = (Math.abs(y - size.y * 0.5) * 2.0) / size.y
        if (x === Math.floor(size.x * 0.5) - 1 || x === Math.floor(size.x * 0.5) - 2) {
          if (rng.randfRange(0.0, 0.4) > toCenter) {
            map[x][y] = true
          }
        }
      }
    }
  }

  return map
}
