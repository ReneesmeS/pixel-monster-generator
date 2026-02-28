import './style.css'
import { generateSprite } from './core/spriteGenerator'
import type { PaletteMode } from './core/types'
import { downloadPng, drawSpriteFixedGrid } from './render'

type FormState = {
  seed: number
  width: number
  height: number
  colors: number
  symmetry: number
  outline: boolean
  animate: boolean
  mode: PaletteMode
  hueShift: number
  saturation: number
  brightness: number
  contrast: number
  jitter: number
  frameCount: number
  movementAmount: number
  playbackFps: number
  playbackDirection: 'forward' | 'reverse'
  startFrame: number
  paletteSeed: number | null
  customPalette: string[]
}

type PaletteLockState = {
  mode: boolean
  paletteSeed: boolean
  hueShift: boolean
  saturation: boolean
  brightness: boolean
  contrast: boolean
  jitter: boolean
}

type SavedPalette = {
  name: string
  colors: string[]
}

const SAVED_PALETTES_STORAGE_KEY = 'pixel-monster-maker.saved-palettes.v1'
const THEME_STORAGE_KEY = 'pixel-monster-maker.theme.v1'
const MODES: PaletteMode[] = ['random', 'warm', 'cool', 'pastel', 'monochrome']
const BUILTIN_PALETTES: SavedPalette[] = [
  {
    name: 'Berry Nebula',
    colors: ['#6ceded', '#6cb9c9', '#6d85a5', '#6e5181', '#6f1d5c', '#4f1446', '#2e0a30', '#0d001a'],
  },
  {
    name: 'Apollo blue',
    colors: ['#172038', '#253a5e', '#3c5e8b', '#4f8fba', '#73bed3', '#a4dddb'],
  },
  {
    name: 'Apollo green',
    colors: ['#19332d', '#25562e', '#468232', '#75a743', '#a8ca58', '#d0da91'],
  },
  {
    name: 'Apollo violet',
    colors: ['#1e1d39', '#402751', '#7a367b', '#a23e8c', '#c65197', '#df84a5'],
  },
  {
    name: 'Clouds',
    colors: ['#fcb08c', '#ef9d7f', '#d6938a', '#b48d92', '#a597a1', '#8fa0bf', '#9aabc9', '#a5b7d4'],
  },
  {
    name: 'SLSO',
    colors: ['#0d2b45', '#203c56', '#544e68', '#8d697a', '#d08159', '#ffaa5e', '#ffd4a3', '#ffecd6'],
  },
]
const BUILTIN_PALETTE_NAMES = new Set(BUILTIN_PALETTES.map((palette) => palette.name.toLowerCase()))

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Missing #app container')
}

app.innerHTML = `
  <main class="layout">
    <aside class="stage">
      <div class="stage-canvas-wrap">
        <canvas id="spriteCanvas"></canvas>
      </div>
      <div class="stage-name">
        <label>Monster Name
          <input id="monsterName" type="text" placeholder="nameofmonster" />
        </label>
      </div>
      <div class="stage-actions">
        <button id="prev" type="button">Previous</button>
        <button id="next" type="button">Next</button>
        <button id="randomColor" type="button">Random Color</button>
        <button id="randomShape" type="button">Random Shape</button>
        <button id="randomAll" type="button">Random All</button>
        <button id="export" type="button">Export PNG</button>
        <button id="exportSheet" type="button">Export Sprite Sheet</button>
      </div>
    </aside>

    <section class="panel" aria-label="Controls panel">
      <div class="panel-head">
        <h1>Pixel Monster Maker</h1>
        <button id="themeToggle" type="button" class="theme-toggle">Dark mode</button>
      </div>

      <h2 class="subhead">Basic</h2>
      <div class="grid two">
        <label>Seed <input id="seed" type="number" /></label>
        <label>Width <input id="width" type="number" min="8" max="64" /></label>
        <label>Height <input id="height" type="number" min="8" max="64" /></label>
        <label><span class="label-head">Symmetry <output id="symmetryValue">100</output></span><input id="symmetry" type="range" min="0" max="100" step="1" /></label>
      </div>

      <h2 class="subhead">Color</h2>
      <div class="grid two">
        <label>Colors <input id="colors" type="number" min="2" max="12" /></label>
        <label><span class="label-head">Mode <span class="lock-inline"><input id="lockMode" type="checkbox" checked /> Lock</span></span>
          <select id="mode">
            <option value="random">Random</option>
            <option value="warm">Warm</option>
            <option value="cool">Cool</option>
            <option value="pastel">Pastel</option>
            <option value="monochrome">Monochrome</option>
          </select>
        </label>
        <label><span class="label-head">Palette Seed <span class="lock-inline"><input id="lockPaletteSeed" type="checkbox" checked /> Lock</span></span><input id="paletteSeed" type="number" placeholder="auto" /></label>
        <label><span class="label-head">Jitter <span class="lock-inline"><input id="lockJitter" type="checkbox" checked /> Lock</span></span><input id="jitter" type="number" min="0" max="1" step="0.05" /></label>
      </div>

      <div class="grid two">
        <label><span class="label-head">Hue Shift <span class="lock-inline"><input id="lockHueShift" type="checkbox" checked /> Lock</span></span><input id="hueShift" type="number" step="0.01" /></label>
        <label><span class="label-head">Saturation <span class="lock-inline"><input id="lockSaturation" type="checkbox" checked /> Lock</span></span><input id="saturation" type="number" step="0.05" /></label>
        <label><span class="label-head">Brightness <span class="lock-inline"><input id="lockBrightness" type="checkbox" checked /> Lock</span></span><input id="brightness" type="number" step="0.05" /></label>
        <label><span class="label-head">Contrast <span class="lock-inline"><input id="lockContrast" type="checkbox" checked /> Lock</span></span><input id="contrast" type="number" min="-0.5" max="0.5" step="0.05" /></label>
      </div>
      <p class="hint">Neutral palette settings: Hue Shift 0, Saturation 1, Brightness 0, Contrast 0, Jitter 0.</p>
      <div class="tiny-actions">
        <button id="resetPaletteControls" type="button">Reset All</button>
        <button id="lockAllPaletteControls" type="button">Lock All</button>
        <button id="unlockAllPaletteControls" type="button">Unlock All</button>
      </div>

      <h2 class="subhead">Palette</h2>
      <label>Custom Palette (hex, comma or newline)
        <textarea id="customPalette" rows="3" placeholder="#f9a825,#ef6c00,#4dd0e1"></textarea>
      </label>

      <div class="grid two">
        <label>Saved Palettes
          <select id="savedPaletteSelect">
            <option value="">Select palette</option>
          </select>
        </label>
        <label>Palette Name
          <input id="savedPaletteName" type="text" placeholder="e.g. Neon Set A" />
        </label>
      </div>
      <div class="actions palette-actions">
        <button id="savePalette" type="button">Save Palette</button>
        <button id="applyPalette" type="button">Apply Palette</button>
        <button id="deletePalette" type="button">Delete Palette</button>
        <button id="clearPalette" type="button">Clear Palette Input</button>
      </div>
      <p id="paletteStatus" class="status" aria-live="polite"></p>

      <h2 class="subhead">Animation</h2>
      <div class="grid two">
        <label>Frames <input id="frameCount" type="number" min="2" max="64" value="16" /></label>
        <label>Move Amount <input id="movementAmount" type="number" min="0" max="2" step="0.05" value="0.2" /></label>
        <label>Playback FPS <input id="playbackFps" type="number" min="1" max="60" step="1" value="16" /></label>
        <label>Direction
          <select id="playbackDirection">
            <option value="forward">Forward</option>
            <option value="reverse">Reverse</option>
          </select>
        </label>
        <label>Start Frame <input id="startFrame" type="number" min="0" max="63" step="1" value="0" /></label>
      </div>

      <div class="checks">
        <label><input id="outline" type="checkbox" checked /> Outline</label>
        <label><input id="animate" type="checkbox" checked /> Animate</label>
      </div>
    </section>
  </main>
`

const seedInput = document.querySelector<HTMLInputElement>('#seed')!
const widthInput = document.querySelector<HTMLInputElement>('#width')!
const heightInput = document.querySelector<HTMLInputElement>('#height')!
const colorsInput = document.querySelector<HTMLInputElement>('#colors')!
const symmetryInput = document.querySelector<HTMLInputElement>('#symmetry')!
const symmetryValue = document.querySelector<HTMLOutputElement>('#symmetryValue')!
const themeToggleButton = document.querySelector<HTMLButtonElement>('#themeToggle')!
const modeInput = document.querySelector<HTMLSelectElement>('#mode')!
const hueShiftInput = document.querySelector<HTMLInputElement>('#hueShift')!
const saturationInput = document.querySelector<HTMLInputElement>('#saturation')!
const brightnessInput = document.querySelector<HTMLInputElement>('#brightness')!
const contrastInput = document.querySelector<HTMLInputElement>('#contrast')!
const jitterInput = document.querySelector<HTMLInputElement>('#jitter')!
const paletteSeedInput = document.querySelector<HTMLInputElement>('#paletteSeed')!
const customPaletteInput = document.querySelector<HTMLTextAreaElement>('#customPalette')!
const outlineInput = document.querySelector<HTMLInputElement>('#outline')!
const animateInput = document.querySelector<HTMLInputElement>('#animate')!
const prevButton = document.querySelector<HTMLButtonElement>('#prev')!
const nextButton = document.querySelector<HTMLButtonElement>('#next')!
const randomColorButton = document.querySelector<HTMLButtonElement>('#randomColor')!
const randomShapeButton = document.querySelector<HTMLButtonElement>('#randomShape')!
const randomAllButton = document.querySelector<HTMLButtonElement>('#randomAll')!
const exportButton = document.querySelector<HTMLButtonElement>('#export')!
const exportSheetButton = document.querySelector<HTMLButtonElement>('#exportSheet')!
const frameCountInput = document.querySelector<HTMLInputElement>('#frameCount')!
const movementAmountInput = document.querySelector<HTMLInputElement>('#movementAmount')!
const playbackFpsInput = document.querySelector<HTMLInputElement>('#playbackFps')!
const playbackDirectionInput = document.querySelector<HTMLSelectElement>('#playbackDirection')!
const startFrameInput = document.querySelector<HTMLInputElement>('#startFrame')!
const savedPaletteSelect = document.querySelector<HTMLSelectElement>('#savedPaletteSelect')!
const savedPaletteNameInput = document.querySelector<HTMLInputElement>('#savedPaletteName')!
const savePaletteButton = document.querySelector<HTMLButtonElement>('#savePalette')!
const applyPaletteButton = document.querySelector<HTMLButtonElement>('#applyPalette')!
const deletePaletteButton = document.querySelector<HTMLButtonElement>('#deletePalette')!
const clearPaletteButton = document.querySelector<HTMLButtonElement>('#clearPalette')!
const paletteStatus = document.querySelector<HTMLParagraphElement>('#paletteStatus')!
const lockModeInput = document.querySelector<HTMLInputElement>('#lockMode')!
const lockPaletteSeedInput = document.querySelector<HTMLInputElement>('#lockPaletteSeed')!
const lockHueShiftInput = document.querySelector<HTMLInputElement>('#lockHueShift')!
const lockSaturationInput = document.querySelector<HTMLInputElement>('#lockSaturation')!
const lockBrightnessInput = document.querySelector<HTMLInputElement>('#lockBrightness')!
const lockContrastInput = document.querySelector<HTMLInputElement>('#lockContrast')!
const lockJitterInput = document.querySelector<HTMLInputElement>('#lockJitter')!
const resetPaletteControlsButton = document.querySelector<HTMLButtonElement>('#resetPaletteControls')!
const lockAllPaletteControlsButton = document.querySelector<HTMLButtonElement>('#lockAllPaletteControls')!
const unlockAllPaletteControlsButton = document.querySelector<HTMLButtonElement>('#unlockAllPaletteControls')!
const monsterNameInput = document.querySelector<HTMLInputElement>('#monsterName')!
const canvas = document.querySelector<HTMLCanvasElement>('#spriteCanvas')!

const seedHistory: number[] = []
let seedIndex = -1
let savedPalettes: SavedPalette[] = []
let autoPaletteSeed = randomInt(0xffffffff)
let cachedAnimationFrames: HTMLCanvasElement[] = []
let previewFrameIndex = 0
let lastTickMs = 0
let frameElapsedMs = 0
let currentLayers = generateSprite({
  seed: 1,
  size: { x: 24, y: 24 },
  nColors: 4,
  outline: true,
  symmetry: 100,
  palette: { mode: 'random' },
}).layers

const defaults: FormState = {
  seed: Math.floor(Math.random() * 999999999),
  width: 32,
  height: 32,
  colors: 8,
  symmetry: 100,
  outline: true,
  animate: true,
  mode: 'random',
  hueShift: 0,
  saturation: 1,
  brightness: 0,
  contrast: 0,
  jitter: 0,
  frameCount: 16,
  movementAmount: 0.2,
  playbackFps: 16,
  playbackDirection: 'forward',
  startFrame: 0,
  paletteSeed: null,
  customPalette: [...BUILTIN_PALETTES[0].colors],
}

function clampToRange(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }
  return Math.max(min, Math.min(max, value))
}

function readPaletteLocks(): PaletteLockState {
  return {
    mode: lockModeInput.checked,
    paletteSeed: lockPaletteSeedInput.checked,
    hueShift: lockHueShiftInput.checked,
    saturation: lockSaturationInput.checked,
    brightness: lockBrightnessInput.checked,
    contrast: lockContrastInput.checked,
    jitter: lockJitterInput.checked,
  }
}

function setAllPaletteLocks(locked: boolean): void {
  lockModeInput.checked = locked
  lockPaletteSeedInput.checked = locked
  lockHueShiftInput.checked = locked
  lockSaturationInput.checked = locked
  lockBrightnessInput.checked = locked
  lockContrastInput.checked = locked
  lockJitterInput.checked = locked
}

function setStatus(message: string): void {
  paletteStatus.textContent = message
}

function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', theme)
  themeToggleButton.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode'
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

function getInitialTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getExportBaseName(seed: number): string {
  const rawName = monsterNameInput.value.trim().toLowerCase()
  const sanitized = rawName
    .replace(/[^a-z0-9\-_\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  const trimmed = sanitized.replace(/^-|-$/g, '')
  return trimmed.length > 0 ? trimmed : `monster-${seed}`
}

function isBuiltinPalette(name: string): boolean {
  return BUILTIN_PALETTE_NAMES.has(name.trim().toLowerCase())
}

function loadSavedPalettes(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(SAVED_PALETTES_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as SavedPalette[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((item) => item && typeof item.name === 'string' && Array.isArray(item.colors))
      .map((item) => ({
        name: item.name.trim(),
        colors: item.colors.filter((value) => typeof value === 'string').map((value) => value.trim()).filter(Boolean),
      }))
      .filter((item) => item.name.length > 0 && item.colors.length > 0)
  } catch {
    return []
  }
}

function initializePalettes(): SavedPalette[] {
  const userSaved = loadSavedPalettes().filter((palette) => !isBuiltinPalette(palette.name))
  const sortedUser = [...userSaved].sort((a, b) => a.name.localeCompare(b.name))
  return [...BUILTIN_PALETTES, ...sortedUser]
}

function persistSavedPalettes(): void {
  const userPalettes = savedPalettes.filter((palette) => !isBuiltinPalette(palette.name))
  localStorage.setItem(SAVED_PALETTES_STORAGE_KEY, JSON.stringify(userPalettes))
}

function renderSavedPaletteOptions(selectedName?: string): void {
  const current = selectedName ?? savedPaletteSelect.value
  savedPaletteSelect.innerHTML = '<option value="">Select palette</option>'

  const builtins = savedPalettes.filter((palette) => isBuiltinPalette(palette.name))
  const userDefined = savedPalettes.filter((palette) => !isBuiltinPalette(palette.name))

  if (builtins.length > 0) {
    const builtinsGroup = document.createElement('optgroup')
    builtinsGroup.label = 'Default'
    for (const palette of builtins) {
      const option = document.createElement('option')
      option.value = palette.name
      option.textContent = `${palette.name} (${palette.colors.length})`
      builtinsGroup.append(option)
    }
    savedPaletteSelect.append(builtinsGroup)
  }

  if (userDefined.length > 0) {
    const savedGroup = document.createElement('optgroup')
    savedGroup.label = 'Saved'
    for (const palette of userDefined) {
      const option = document.createElement('option')
      option.value = palette.name
      option.textContent = `${palette.name} (${palette.colors.length})`
      savedGroup.append(option)
    }
    savedPaletteSelect.append(savedGroup)
  }

  if (current && savedPalettes.some((palette) => palette.name === current)) {
    savedPaletteSelect.value = current
  }
}

function findSavedPaletteByName(name: string): SavedPalette | undefined {
  return savedPalettes.find((palette) => palette.name === name)
}

function applySavedPaletteByName(name: string): void {
  const palette = findSavedPaletteByName(name)
  if (!palette) {
    setStatus('Saved palette not found.')
    return
  }

  customPaletteInput.value = palette.colors.join(', ')
  savedPaletteNameInput.value = palette.name
  setStatus(`Applied palette: ${palette.name}.`)
  regenerate({ pushHistory: false })
}

function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive)
}

function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

function randomizePaletteFields(state: FormState, locks: PaletteLockState): void {
  if (!locks.mode) {
    state.mode = MODES[randomInt(MODES.length)]
  }
  if (!locks.paletteSeed) {
    state.paletteSeed = randomInt(0xffffffff)
  }
  if (!locks.hueShift) {
    state.hueShift = roundToStep(randomFloat(-0.5, 0.5), 0.01)
  }
  if (!locks.saturation) {
    state.saturation = roundToStep(randomFloat(0.5, 1.6), 0.05)
  }
  if (!locks.brightness) {
    state.brightness = roundToStep(randomFloat(-0.25, 0.25), 0.05)
  }
  if (!locks.contrast) {
    state.contrast = roundToStep(randomFloat(-0.5, 0.5), 0.05)
  }
  if (!locks.jitter) {
    state.jitter = roundToStep(randomFloat(0.0, 0.9), 0.05)
  }
}

function setInputs(state: FormState): void {
  seedInput.value = String(state.seed)
  widthInput.value = String(state.width)
  heightInput.value = String(state.height)
  colorsInput.value = String(state.colors)
  symmetryInput.value = String(state.symmetry)
  symmetryValue.textContent = String(state.symmetry)
  modeInput.value = state.mode
  hueShiftInput.value = String(state.hueShift)
  saturationInput.value = String(state.saturation)
  brightnessInput.value = String(state.brightness)
  contrastInput.value = String(state.contrast)
  jitterInput.value = String(state.jitter)
  frameCountInput.value = String(state.frameCount)
  startFrameInput.max = String(Math.max(0, state.frameCount - 1))
  startFrameInput.value = String(Math.max(0, Math.min(state.startFrame, state.frameCount - 1)))
  movementAmountInput.value = String(state.movementAmount)
  playbackFpsInput.value = String(state.playbackFps)
  playbackDirectionInput.value = state.playbackDirection
  paletteSeedInput.value = state.paletteSeed == null ? '' : String(state.paletteSeed)
  customPaletteInput.value = state.customPalette.join(', ')
  outlineInput.checked = state.outline
  animateInput.checked = state.animate
}

function parseCustomPalette(raw: string): string[] {
  return raw
    .split(/[\n,\s]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function readState(): FormState {
  const paletteSeed = paletteSeedInput.value.trim() === '' ? null : Number(paletteSeedInput.value)
  const frameCount = clampToRange(Number(frameCountInput.value), 2, 64, 8)
  const movementAmount = clampToRange(Number(movementAmountInput.value), 0, 2, 0.5)
  const playbackFps = clampToRange(Number(playbackFpsInput.value), 1, 60, 16)
  const playbackDirection = playbackDirectionInput.value === 'reverse' ? 'reverse' : 'forward'
  const startFrame = Math.max(0, Math.min(frameCount - 1, Math.floor(clampToRange(Number(startFrameInput.value), 0, 63, 0))))

  frameCountInput.value = String(frameCount)
  startFrameInput.max = String(Math.max(0, frameCount - 1))
  startFrameInput.value = String(startFrame)
  movementAmountInput.value = String(movementAmount)
  playbackFpsInput.value = String(playbackFps)

  return {
    seed: Number(seedInput.value),
    width: Number(widthInput.value),
    height: Number(heightInput.value),
    colors: Number(colorsInput.value),
    symmetry: Number(symmetryInput.value),
    outline: outlineInput.checked,
    animate: animateInput.checked,
    mode: modeInput.value as PaletteMode,
    hueShift: Number(hueShiftInput.value),
    saturation: Number(saturationInput.value),
    brightness: Number(brightnessInput.value),
    contrast: Number(contrastInput.value),
    jitter: Number(jitterInput.value),
    frameCount,
    movementAmount,
    playbackFps,
    playbackDirection,
    startFrame,
    paletteSeed,
    customPalette: parseCustomPalette(customPaletteInput.value),
  }
}

function pushSeed(seed: number): void {
  const previous = seedHistory[seedHistory.length - 1]
  if (previous !== seed) {
    seedHistory.splice(seedIndex + 1)
    seedHistory.push(seed)
    seedIndex = seedHistory.length - 1
  }
}

function renderCurrent(state: FormState): void {
  const resolvedPaletteSeed = state.paletteSeed ?? autoPaletteSeed
  const paletteSettings = {
    mode: state.mode,
    hue_shift: state.hueShift,
    saturation: state.saturation,
    brightness: state.brightness,
    contrast: state.contrast,
    jitter: state.jitter,
    seed: resolvedPaletteSeed,
    custom_palette: state.customPalette.length > 0 ? state.customPalette : undefined,
  }

  const sprite = generateSprite({
    seed: state.seed,
    size: { x: state.width, y: state.height },
    nColors: state.colors,
    outline: state.outline,
    symmetry: state.symmetry,
    palette: paletteSettings,
  })

  currentLayers = sprite.layers
  rebuildAnimationCache(state)
  drawPreviewFrame(state)
}

function buildAnimationFrames(state: FormState): HTMLCanvasElement[] {
  const frames: HTMLCanvasElement[] = []
  const frameCount = Math.max(2, Math.floor(state.frameCount))
  const frameWidth = Math.max(1, Math.floor(state.width))
  const frameHeight = Math.max(1, Math.floor(state.height))

  for (let frame = 0; frame < frameCount; frame++) {
    const frameCanvas = document.createElement('canvas')
    const framePhase = (frame / frameCount) * Math.PI * 2
    drawSpriteFixedGrid(frameCanvas, currentLayers, {
      widthCells: frameWidth,
      heightCells: frameHeight,
      pixelSize: 1,
      animate: true,
      phase: framePhase,
      amplitudeMultiplier: state.movementAmount,
    })
    frames.push(frameCanvas)
  }

  return frames
}

function rebuildAnimationCache(state: FormState): void {
  cachedAnimationFrames = buildAnimationFrames(state)
  previewFrameIndex = Math.max(0, Math.min(cachedAnimationFrames.length - 1, state.startFrame))
  frameElapsedMs = 0
}

function drawPreviewFrame(state: { width: number; height: number; animate: boolean }): void {
  if (cachedAnimationFrames.length === 0) {
    return
  }

  const previewScale = 12
  const frame = state.animate
    ? cachedAnimationFrames[previewFrameIndex % cachedAnimationFrames.length]
    : cachedAnimationFrames[0]

  canvas.width = Math.max(1, Math.floor(state.width)) * previewScale
  canvas.height = Math.max(1, Math.floor(state.height)) * previewScale

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
}

function readPlaybackState(): { width: number; height: number; animate: boolean; playbackFps: number } {
  const width = clampToRange(Number(widthInput.value), 8, 64, 24)
  const height = clampToRange(Number(heightInput.value), 8, 64, 24)
  const playbackFps = clampToRange(Number(playbackFpsInput.value), 1, 60, 16)
  return {
    width,
    height,
    animate: animateInput.checked,
    playbackFps,
  }
}

function readAnimationRuntimeSettings(): {
  playbackDirection: 'forward' | 'reverse'
  startFrame: number
} {
  const frameCount = clampToRange(Number(frameCountInput.value), 2, 64, 8)
  const playbackDirection = playbackDirectionInput.value === 'reverse' ? 'reverse' : 'forward'
  const startFrame = Math.max(0, Math.min(frameCount - 1, Math.floor(clampToRange(Number(startFrameInput.value), 0, 63, 0))))
  startFrameInput.max = String(Math.max(0, frameCount - 1))
  startFrameInput.value = String(startFrame)
  return {
    playbackDirection,
    startFrame,
  }
}

function advancePreviewFrame(direction: 'forward' | 'reverse'): void {
  if (cachedAnimationFrames.length <= 1) {
    previewFrameIndex = 0
    return
  }

  const step = direction === 'reverse' ? -1 : 1
  const next = previewFrameIndex + step
  const maxIndex = cachedAnimationFrames.length - 1
  if (next > maxIndex) {
    previewFrameIndex = 0
  } else if (next < 0) {
    previewFrameIndex = maxIndex
  } else {
    previewFrameIndex = next
  }
}

function regenerate(options?: { seedOverride?: number; pushHistory?: boolean }): void {
  const state = readState()
  if (typeof options?.seedOverride === 'number') {
    state.seed = options.seedOverride
    seedInput.value = String(options.seedOverride)
  }

  if (options?.pushHistory ?? true) {
    pushSeed(state.seed)
  }

  renderCurrent(state)
}

savedPalettes = initializePalettes()
setInputs(defaults)
savedPaletteNameInput.value = BUILTIN_PALETTES[0].name
renderSavedPaletteOptions(BUILTIN_PALETTES[0].name)
pushSeed(defaults.seed)
renderCurrent(defaults)
applyTheme(getInitialTheme())

themeToggleButton.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  applyTheme(current === 'dark' ? 'light' : 'dark')
})

symmetryInput.addEventListener('input', () => {
  symmetryValue.textContent = symmetryInput.value
  regenerate()
})

for (const element of [
  seedInput,
  widthInput,
  heightInput,
  colorsInput,
  modeInput,
  hueShiftInput,
  saturationInput,
  brightnessInput,
  contrastInput,
  jitterInput,
  frameCountInput,
  movementAmountInput,
  playbackFpsInput,
  playbackDirectionInput,
  startFrameInput,
  paletteSeedInput,
  customPaletteInput,
  outlineInput,
  animateInput,
]) {
  element.addEventListener('change', () => regenerate({ pushHistory: false }))
}

nextButton.addEventListener('click', () => {
  const nextSeed = Math.floor(Math.random() * 0xffffffff)
  regenerate({ seedOverride: nextSeed })
})

prevButton.addEventListener('click', () => {
  if (seedIndex > 0) {
    seedIndex -= 1
    const seed = seedHistory[seedIndex]
    regenerate({ seedOverride: seed, pushHistory: false })
  }
})

function randomizeShapeOnly(): void {
  const nextSeed = Math.floor(Math.random() * 0xffffffff)
  regenerate({ seedOverride: nextSeed })
}

function randomizeColorOnly(): void {
  const state = readState()
  if (state.paletteSeed == null) {
    autoPaletteSeed = randomInt(0xffffffff)
  }
  randomizePaletteFields(state, readPaletteLocks())
  setInputs(state)
  regenerate({ pushHistory: false })
}

function randomizeAll(): void {
  const state = readState()
  if (state.paletteSeed == null) {
    autoPaletteSeed = randomInt(0xffffffff)
  }
  state.seed = Math.floor(Math.random() * 0xffffffff)
  randomizePaletteFields(state, readPaletteLocks())
  setInputs(state)
  regenerate({ seedOverride: state.seed })
}

randomShapeButton.addEventListener('click', randomizeShapeOnly)
randomColorButton.addEventListener('click', randomizeColorOnly)
randomAllButton.addEventListener('click', randomizeAll)

savePaletteButton.addEventListener('click', () => {
  const name = savedPaletteNameInput.value.trim()
  const colors = parseCustomPalette(customPaletteInput.value)

  if (!name) {
    setStatus('Enter a palette name before saving.')
    return
  }

  if (colors.length === 0) {
    setStatus('Enter at least one color before saving.')
    return
  }

  if (isBuiltinPalette(name)) {
    setStatus('Default palettes cannot be overwritten. Use a different name.')
    return
  }

  const existingIndex = savedPalettes.findIndex((palette) => palette.name === name)
  const nextPalette: SavedPalette = { name, colors }

  if (existingIndex >= 0) {
    savedPalettes[existingIndex] = nextPalette
    setStatus(`Updated palette: ${name}.`)
  } else {
    savedPalettes.push(nextPalette)
    savedPalettes.sort((a, b) => a.name.localeCompare(b.name))
    setStatus(`Saved palette: ${name}.`)
  }

  persistSavedPalettes()
  renderSavedPaletteOptions(name)
})

applyPaletteButton.addEventListener('click', () => {
  const selected = savedPaletteSelect.value
  if (!selected) {
    setStatus('Select a saved palette to apply.')
    return
  }
  applySavedPaletteByName(selected)
})

savedPaletteSelect.addEventListener('change', () => {
  const selected = savedPaletteSelect.value
  if (!selected) {
    return
  }
  applySavedPaletteByName(selected)
})

deletePaletteButton.addEventListener('click', () => {
  const selected = savedPaletteSelect.value
  if (!selected) {
    setStatus('Select a saved palette to delete.')
    return
  }

  if (isBuiltinPalette(selected)) {
    setStatus('Default palettes cannot be deleted.')
    return
  }

  savedPalettes = savedPalettes.filter((palette) => palette.name !== selected)
  persistSavedPalettes()
  renderSavedPaletteOptions()
  setStatus(`Deleted palette: ${selected}.`)
})

clearPaletteButton.addEventListener('click', () => {
  customPaletteInput.value = ''
  setStatus('Cleared custom palette input.')
  regenerate({ pushHistory: false })
})

resetPaletteControlsButton.addEventListener('click', () => {
  modeInput.value = 'random'
  paletteSeedInput.value = ''
  hueShiftInput.value = '0'
  saturationInput.value = '1'
  brightnessInput.value = '0'
  contrastInput.value = '0'
  jitterInput.value = '0'
  autoPaletteSeed = randomInt(0xffffffff)
  setStatus('Reset palette controls to neutral defaults.')
  regenerate({ pushHistory: false })
})

lockAllPaletteControlsButton.addEventListener('click', () => {
  setAllPaletteLocks(true)
  setStatus('Locked all palette controls.')
})

unlockAllPaletteControlsButton.addEventListener('click', () => {
  setAllPaletteLocks(false)
  setStatus('Unlocked all palette controls.')
})

exportButton.addEventListener('click', () => {
  const state = readState()
  renderCurrent(state)

  const exportCanvas = document.createElement('canvas')
  const source = cachedAnimationFrames[0]
  if (!source) {
    return
  }
  exportCanvas.width = source.width
  exportCanvas.height = source.height
  const exportCtx = exportCanvas.getContext('2d')
  if (!exportCtx) {
    return
  }
  exportCtx.imageSmoothingEnabled = false
  exportCtx.drawImage(source, 0, 0)

  const seed = Number(seedInput.value)
  const baseName = getExportBaseName(seed)
  downloadPng(exportCanvas, `${baseName}.png`)
})

exportSheetButton.addEventListener('click', () => {
  const state = readState()
  renderCurrent(state)

  const frameCount = cachedAnimationFrames.length
  if (frameCount === 0) {
    return
  }
  const frameWidth = cachedAnimationFrames[0].width
  const frameHeight = cachedAnimationFrames[0].height
  const sheetCanvas = document.createElement('canvas')
  sheetCanvas.width = frameWidth * frameCount
  sheetCanvas.height = frameHeight
  const sheetCtx = sheetCanvas.getContext('2d')
  if (!sheetCtx) {
    return
  }
  sheetCtx.imageSmoothingEnabled = false

  for (let frame = 0; frame < frameCount; frame++) {
    const targetX = (frameCount - 1 - frame) * frameWidth
    const step = state.playbackDirection === 'reverse' ? -1 : 1
    let index = state.startFrame + step * frame
    while (index < 0) {
      index += frameCount
    }
    index = index % frameCount
    sheetCtx.drawImage(cachedAnimationFrames[index], targetX, 0)
  }

  const seed = Number(seedInput.value)
  const baseName = getExportBaseName(seed)
  downloadPng(sheetCanvas, `${baseName}-${frameCount}f-sheet.png`)
})

function tick(now: number): void {
  if (lastTickMs === 0) {
    lastTickMs = now
  }

  const delta = now - lastTickMs
  lastTickMs = now

  const playback = readPlaybackState()
  const runtime = readAnimationRuntimeSettings()
  if (playback.animate && cachedAnimationFrames.length > 1) {
    const frameDuration = 1000 / playback.playbackFps
    frameElapsedMs += delta
    while (frameElapsedMs >= frameDuration) {
      frameElapsedMs -= frameDuration
      advancePreviewFrame(runtime.playbackDirection)
    }
  } else {
    previewFrameIndex = Math.max(0, Math.min(cachedAnimationFrames.length - 1, runtime.startFrame))
    frameElapsedMs = 0
  }

  drawPreviewFrame(playback)
  requestAnimationFrame(tick)
}

requestAnimationFrame(tick)
