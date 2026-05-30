import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generate } from '../src/index'
import type { StandardSchemaV1 } from '../src/standard'

const validates = (schema: StandardSchemaV1, value: unknown): boolean => {
  const result = schema['~standard'].validate(value)
  if (result instanceof Promise) throw new Error('expected synchronous validation')
  return result.issues === undefined
}

describe('generate — optional', () => {
  it('generates a defined string for optional string', () => {
    const value = generate(z.string().optional(), { seed: 1 })
    expect(value).toBeDefined()
    expect(typeof value).toBe('string')
  })

  it('optional field in object has a value', () => {
    const schema = z.object({ name: z.string().optional(), age: z.number() })
    const result = generate(schema, { seed: 1 })
    expect(validates(schema, result)).toBe(true)
    expect(typeof result.name).toBe('string')
  })
})

describe('generate — nullable', () => {
  it('generates a non-null string for nullable string', () => {
    const value = generate(z.string().nullable(), { seed: 1 })
    expect(value).not.toBeNull()
    expect(typeof value).toBe('string')
  })

  it('nullable output validates', () => {
    const schema = z.string().nullable()
    expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
  })
})

describe('generate — default', () => {
  it('generates inner type for default schema', () => {
    const schema = z.string().default('fallback')
    const value = generate(schema, { seed: 1 })
    expect(typeof value).toBe('string')
  })

  it('default output validates', () => {
    const schema = z.number().default(0)
    expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
  })
})

describe('generate — catch', () => {
  it('generates inner type for catch schema', () => {
    const schema = z.string().catch('fallback')
    const value = generate(schema, { seed: 1 })
    expect(typeof value).toBe('string')
  })
})
