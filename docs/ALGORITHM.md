# Algorithm Architecture

This document describes the sprite generation pipeline and its TypeScript module boundaries.

## Pipeline

1. `map` generation (symmetry + random walk)
2. cellular automata smoothing
3. palette generation (mode + HSV adjustments)
4. flood-fill grouping and color assignment
5. layer extraction for rendering

## Module boundaries

- `src/core/mapGenerator.ts`: seeded map initialization, symmetry behavior, random walk shaping.
- `src/core/cellularAutomata.ts`: iterative smoothing over boolean map cells.
- `src/core/colorSchemeGenerator.ts`: palette generation from mode + adjustment controls.
- `src/core/colorFiller.ts`: flood-fill grouping, negative-space groups, per-cell color selection.
- `src/core/spriteGenerator.ts`: end-to-end orchestration and render-layer extraction.

## Data contracts

- `BoolMap`: `boolean[][]` indexed as `[x][y]`
- `Color`: normalized RGBA (`0..1`)
- `Group`: `{ arr: Cell[], valid: boolean, start_time?: number }`
- `RenderLayer`: draw-ready layer with `cells`, `isEye`, `startTime`

## Determinism

- Map and fill stages are seeded from the sprite seed.
- Palette is deterministic only when a palette seed is provided.
- Flood-fill coloring uses deterministic fractal noise seeded from the main generator seed.

## Current implementation note

- The app uses deterministic fractal value-noise in `src/core/noise.ts`.
- If stricter visual consistency is required across environments, swap in a single standardized noise implementation and lock configuration/version in tests.
