export class SeededRng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
    if (this.state === 0) {
      this.state = 0x6d2b79f5
    }
  }

  nextUInt32(): number {
    let x = this.state
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    this.state = x >>> 0
    return this.state
  }

  nextFloat(): number {
    return this.nextUInt32() / 0xffffffff
  }

  randfRange(min: number, max: number): number {
    return min + (max - min) * this.nextFloat()
  }

  randi(maxExclusive?: number): number {
    const value = this.nextUInt32() >>> 0
    if (maxExclusive == null) {
      return value
    }
    if (maxExclusive <= 0) {
      return 0
    }
    return value % maxExclusive
  }

  randBool(chance: number): boolean {
    return this.randfRange(0, 1) > chance
  }
}
