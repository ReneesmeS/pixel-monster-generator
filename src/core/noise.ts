import { clamp } from './math'

function hash2D(x: number, y: number, seed: number): number {
  let h = seed ^ (x * 374761393) ^ (y * 668265263)
  h = (h ^ (h >>> 13)) * 1274126177
  h ^= h >>> 16
  return (h >>> 0) / 0xffffffff
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function valueNoise2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = x0 + 1
  const y1 = y0 + 1

  const tx = smoothstep(x - x0)
  const ty = smoothstep(y - y0)

  const v00 = hash2D(x0, y0, seed) * 2 - 1
  const v10 = hash2D(x1, y0, seed) * 2 - 1
  const v01 = hash2D(x0, y1, seed) * 2 - 1
  const v11 = hash2D(x1, y1, seed) * 2 - 1

  const nx0 = lerp(v00, v10, tx)
  const nx1 = lerp(v01, v11, tx)
  return lerp(nx0, nx1, ty)
}

export class FractalNoise {
  seed = 1
  fractalOctaves = 5
  frequency = 1 / 30
  fractalGain = 0.4
  fractalLacunarity = 3

  getNoise2D(x: number, y: number): number {
    let frequency = this.frequency
    let amplitude = 1
    let total = 0
    let maxAmp = 0

    for (let octave = 0; octave < this.fractalOctaves; octave++) {
      const octaveSeed = (this.seed + octave * 1013904223) >>> 0
      total += valueNoise2D(x * frequency, y * frequency, octaveSeed) * amplitude
      maxAmp += amplitude
      amplitude *= this.fractalGain
      frequency *= this.fractalLacunarity
    }

    if (maxAmp === 0) {
      return 0
    }
    return clamp(total / maxAmp, -1, 1)
  }
}
