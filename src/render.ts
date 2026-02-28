import type { RenderLayer } from './core/types'

function colorToCss(r: number, g: number, b: number, a: number): string {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a.toFixed(3)})`
}

function getBounds(layers: RenderLayer[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const layer of layers) {
    for (const cell of layer.cells) {
      minX = Math.min(minX, cell.position.x)
      maxX = Math.max(maxX, cell.position.x)
      minY = Math.min(minY, cell.position.y)
      maxY = Math.max(maxY, cell.position.y)
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 }
  }

  return { minX, maxX, minY, maxY }
}

export function drawSprite(
  canvas: HTMLCanvasElement,
  layers: RenderLayer[],
  options?: { pixelSize?: number; padding?: number; phase?: number; animate?: boolean; amplitudeMultiplier?: number },
): void {
  const pixelSize = options?.pixelSize ?? 14
  const padding = options?.padding ?? 2
  const phase = options?.phase ?? 0
  const animate = options?.animate ?? true
  const amplitudeMultiplier = options?.amplitudeMultiplier ?? 0.5

  const bounds = getBounds(layers)
  const widthCells = bounds.maxX - bounds.minX + 1
  const heightCells = bounds.maxY - bounds.minY + 1

  canvas.width = (widthCells + padding * 2) * pixelSize
  canvas.height = (heightCells + padding * 2 + 8) * pixelSize

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (const layer of layers) {
    const amplitude = ((layer.startTime % 5) + 2) * 5
    const yOffset = animate ? Math.sin(phase + layer.startTime) * amplitude * amplitudeMultiplier : 0

    for (const cell of layer.cells) {
      const px = (cell.position.x - bounds.minX + padding) * pixelSize
      const py = (cell.position.y - bounds.minY + padding) * pixelSize + yOffset
      ctx.fillStyle = colorToCss(cell.color.r, cell.color.g, cell.color.b, cell.color.a)
      ctx.fillRect(px, py, pixelSize, pixelSize)

      if (layer.isEye) {
        const eyeShade = Math.max(0, 1 - 0.85)
        ctx.fillStyle = `rgba(${Math.round(cell.color.r * 255 * eyeShade)}, ${Math.round(cell.color.g * 255 * eyeShade)}, ${Math.round(cell.color.b * 255 * eyeShade)}, 1)`
        ctx.fillRect(px, py, pixelSize, pixelSize)
      }
    }
  }
}

export function drawSpriteFixedGrid(
  canvas: HTMLCanvasElement,
  layers: RenderLayer[],
  options: {
    widthCells: number
    heightCells: number
    pixelSize?: number
    phase?: number
    animate?: boolean
    amplitudeMultiplier?: number
  },
): void {
  const widthCells = Math.max(1, Math.floor(options.widthCells))
  const heightCells = Math.max(1, Math.floor(options.heightCells))
  const pixelSize = options.pixelSize ?? 1
  const phase = options.phase ?? 0
  const animate = options.animate ?? true
  const amplitudeMultiplier = options.amplitudeMultiplier ?? 0.5

  canvas.width = widthCells * pixelSize
  canvas.height = heightCells * pixelSize

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (const layer of layers) {
    const amplitude = ((layer.startTime % 5) + 2) * 5
    let yOffset = animate ? Math.sin(phase + layer.startTime) * amplitude * amplitudeMultiplier : 0

    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (const cell of layer.cells) {
      minY = Math.min(minY, cell.position.y)
      maxY = Math.max(maxY, cell.position.y)
    }

    if (Number.isFinite(minY) && Number.isFinite(maxY)) {
      const minOffset = -minY * pixelSize
      const maxOffset = (heightCells - 1 - maxY) * pixelSize
      if (yOffset < minOffset) {
        yOffset = minOffset
      } else if (yOffset > maxOffset) {
        yOffset = maxOffset
      }
    }

    const yOffsetPx = Math.round(yOffset)

    for (const cell of layer.cells) {
      const px = Math.round(cell.position.x * pixelSize)
      const py = Math.round(cell.position.y * pixelSize + yOffsetPx)
      ctx.fillStyle = colorToCss(cell.color.r, cell.color.g, cell.color.b, cell.color.a)
      ctx.fillRect(px, py, pixelSize, pixelSize)

      if (layer.isEye) {
        const eyeShade = Math.max(0, 1 - 0.85)
        ctx.fillStyle = `rgba(${Math.round(cell.color.r * 255 * eyeShade)}, ${Math.round(cell.color.g * 255 * eyeShade)}, ${Math.round(cell.color.b * 255 * eyeShade)}, 1)`
        ctx.fillRect(px, py, pixelSize, pixelSize)
      }
    }
  }
}

export function downloadPng(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}
