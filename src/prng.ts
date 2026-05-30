/**
 * Deterministic seeded PRNG — the determinism foundation of fixture-gen.
 *
 * Same seed ⇒ same value stream, across runs and machines. All randomness in
 * the library MUST route through here; never call `Math.random()`.
 *
 * Algorithm: mulberry32 — a fast, well-distributed 32-bit generator.
 */

export interface Prng {
  /** Next float in [0, 1). */
  next(): number
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number
  /** Random boolean. */
  bool(): boolean
  /** Pick one element from a non-empty array. */
  pick<T>(items: readonly T[]): T
  /** Lowercase alpha string of the given length. */
  string(length: number): string
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'

/** Create a seeded PRNG. Identical `seed` always yields an identical stream. */
export function createPrng(seed = 0): Prng {
  // mulberry32 state — coerce to a 32-bit unsigned integer.
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1))

  const pick = <T>(items: readonly T[]): T => {
    // Caller guarantees a non-empty array; guard for noUncheckedIndexedAccess.
    const value = items[int(0, items.length - 1)]
    if (value === undefined) throw new Error('createPrng().pick: empty array')
    return value
  }

  const string = (length: number): string => {
    let out = ''
    for (let i = 0; i < length; i++) out += ALPHABET[int(0, ALPHABET.length - 1)]
    return out
  }

  return {
    next,
    int,
    bool: () => next() < 0.5,
    pick,
    string,
  }
}
