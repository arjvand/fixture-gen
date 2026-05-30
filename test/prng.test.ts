import { describe, expect, it } from 'vitest'
import { createPrng } from '../src/prng'

const stream = (seed: number, n = 8) => {
  const prng = createPrng(seed)
  return Array.from({ length: n }, () => prng.next())
}

describe('createPrng', () => {
  it('is deterministic: same seed yields the same stream', () => {
    expect(stream(42)).toEqual(stream(42))
  })

  it('diverges for different seeds', () => {
    expect(stream(42)).not.toEqual(stream(43))
  })

  it('produces floats in [0, 1)', () => {
    const prng = createPrng(1)
    for (let i = 0; i < 100; i++) {
      const v = prng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('int() respects inclusive bounds', () => {
    const prng = createPrng(7)
    for (let i = 0; i < 100; i++) {
      const v = prng.int(1, 6)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
    }
  })
})
