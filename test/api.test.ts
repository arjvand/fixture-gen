import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generate, generateMany } from '../src/index'
import type { StandardSchemaV1 } from '../src/standard'

const validates = (schema: StandardSchemaV1, value: unknown): boolean => {
  const result = schema['~standard'].validate(value)
  if (result instanceof Promise) throw new Error('expected synchronous validation')
  return result.issues === undefined
}

const User = z.object({
  id: z.string().uuid(),
  name: z.string(),
  age: z.number().int().min(0).max(120),
})

describe('generate — overrides', () => {
  it('overrides pin specific fields', () => {
    const result = generate(User, { seed: 1, overrides: { name: 'Ada Lovelace' } })
    expect(result.name).toBe('Ada Lovelace')
  })

  it('non-overridden fields are still generated', () => {
    const result = generate(User, { seed: 1, overrides: { name: 'Ada Lovelace' } })
    expect(typeof result.id).toBe('string')
    expect(typeof result.age).toBe('number')
  })

  it('full object with overrides validates', () => {
    const result = generate(User, { seed: 1, overrides: { name: 'Ada Lovelace', age: 36 } })
    expect(validates(User, result)).toBe(true)
    expect(result.name).toBe('Ada Lovelace')
    expect(result.age).toBe(36)
  })

  it('overrides without seed still works', () => {
    const result = generate(User, { overrides: { name: 'Test' } })
    expect(result.name).toBe('Test')
  })
})

describe('generateMany', () => {
  it('returns the requested count', () => {
    const results = generateMany(User, 5, { seed: 1 })
    expect(results).toHaveLength(5)
  })

  it('all items validate', () => {
    const results = generateMany(User, 3, { seed: 1 })
    for (const item of results) {
      expect(validates(User, item)).toBe(true)
    }
  })

  it('items are not all identical', () => {
    const results = generateMany(User, 3, { seed: 1 })
    const ids = results.map((r) => r.id)
    expect(new Set(ids).size).toBeGreaterThan(1)
  })

  it('is deterministic: same seed same output', () => {
    const a = generateMany(User, 5, { seed: 42 })
    const b = generateMany(User, 5, { seed: 42 })
    expect(a).toEqual(b)
  })

  it('overrides apply to every item', () => {
    const results = generateMany(User, 3, { seed: 1, overrides: { name: 'Fixed' } })
    for (const item of results) {
      expect(item.name).toBe('Fixed')
    }
  })

  it('count zero returns empty array', () => {
    expect(generateMany(User, 0, { seed: 1 })).toEqual([])
  })
})
