import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generate } from '../src/index'
import type { StandardSchemaV1 } from '../src/standard'

const validates = (schema: StandardSchemaV1, value: unknown): boolean => {
  const result = schema['~standard'].validate(value)
  if (result instanceof Promise) throw new Error('expected synchronous validation')
  return result.issues === undefined
}

describe('generate — array', () => {
  it('array of strings validates', () => {
    const schema = z.array(z.string())
    expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
  })

  it('result is an array', () => {
    expect(Array.isArray(generate(z.array(z.number()), { seed: 1 }))).toBe(true)
  })

  it('array has at least minLength items', () => {
    const schema = z.array(z.string()).min(3)
    const result = generate(schema, { seed: 1 })
    expect(Array.isArray(result) && result.length >= 3).toBe(true)
  })

  it('array has at most maxLength items', () => {
    const schema = z.array(z.string()).max(2)
    const result = generate(schema, { seed: 1 })
    expect(Array.isArray(result) && result.length <= 2).toBe(true)
  })

  it('array of objects validates', () => {
    const schema = z.array(z.object({ id: z.number(), name: z.string() }))
    expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
  })
})

describe('generate — tuple', () => {
  it('tuple validates', () => {
    const schema = z.tuple([z.string(), z.number(), z.boolean()])
    expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
  })

  it('tuple length matches items', () => {
    const schema = z.tuple([z.string(), z.number()])
    const result = generate(schema, { seed: 1 })
    expect(Array.isArray(result) && result.length >= 2).toBe(true)
  })
})

describe('generate — record', () => {
  it('record validates', () => {
    const schema = z.record(z.string(), z.number())
    expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
  })

  it('result is an object', () => {
    const schema = z.record(z.string(), z.boolean())
    const result = generate(schema, { seed: 1 })
    expect(typeof result).toBe('object')
    expect(result).not.toBeNull()
    expect(!Array.isArray(result)).toBe(true)
  })
})

describe('generate — nested objects', () => {
  it('nested object validates', () => {
    const Address = z.object({ city: z.string(), zip: z.string() })
    const Person = z.object({ name: z.string(), address: Address })
    expect(validates(Person, generate(Person, { seed: 1 }))).toBe(true)
  })

  it('deeply nested object has all keys', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({ bio: z.string() }),
      }),
    })
    const result = generate(schema, { seed: 1 }) as { user: { profile: { bio: string } } }
    expect(typeof result.user.profile.bio).toBe('string')
  })
})
