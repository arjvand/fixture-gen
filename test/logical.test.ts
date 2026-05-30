import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generate } from '../src/index'
import type { StandardSchemaV1 } from '../src/standard'

const validates = (schema: StandardSchemaV1, value: unknown): boolean => {
  const result = schema['~standard'].validate(value)
  if (result instanceof Promise) throw new Error('expected synchronous validation')
  return result.issues === undefined
}

describe('generate — enum', () => {
  const Status = z.enum(['active', 'inactive', 'pending'])

  it('enum output validates', () => {
    expect(validates(Status, generate(Status, { seed: 1 }))).toBe(true)
  })

  it('enum value is one of the declared values', () => {
    const value = generate(Status, { seed: 1 })
    expect(['active', 'inactive', 'pending']).toContain(value)
  })

  it('four-value enum output validates', () => {
    const Dir = z.enum(['north', 'south', 'east', 'west'])
    expect(validates(Dir, generate(Dir, { seed: 1 }))).toBe(true)
  })
})

describe('generate — literal', () => {
  it('string literal output validates', () => {
    const schema = z.literal('hello')
    expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
  })

  it('string literal returns exact value', () => {
    expect(generate(z.literal('hello'), { seed: 1 })).toBe('hello')
  })

  it('number literal returns exact value', () => {
    expect(generate(z.literal(42), { seed: 1 })).toBe(42)
  })

  it('boolean literal returns exact value', () => {
    expect(generate(z.literal(true), { seed: 1 })).toBe(true)
  })
})

describe('generate — union', () => {
  const schema = z.union([z.string(), z.number()])

  it('union output validates', () => {
    expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
  })

  it('union value is string or number', () => {
    const value = generate(schema, { seed: 1 })
    expect(typeof value === 'string' || typeof value === 'number').toBe(true)
  })

  it('discriminated union output validates', () => {
    const Cat = z.object({ kind: z.literal('cat'), meows: z.boolean() })
    const Dog = z.object({ kind: z.literal('dog'), barks: z.boolean() })
    const Pet = z.discriminatedUnion('kind', [Cat, Dog])
    expect(validates(Pet, generate(Pet, { seed: 1 }))).toBe(true)
  })
})
