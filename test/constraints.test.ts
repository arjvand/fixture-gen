import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generate } from '../src/index'
import type { StandardSchemaV1 } from '../src/standard'

const validates = (schema: StandardSchemaV1, value: unknown): boolean => {
  const result = schema['~standard'].validate(value)
  if (result instanceof Promise) throw new Error('expected synchronous validation')
  return result.issues === undefined
}

describe('generate — string formats', () => {
  it('uuid format validates', () => {
    const schema = z.string().uuid()
    expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
  })

  it('uuid matches uuid v4 pattern', () => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(UUID_RE.test(generate(z.string().uuid(), { seed: 1 }) as string)).toBe(true)
  })

  it('email format validates', () => {
    const schema = z.string().email()
    expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
  })

  it('email contains @', () => {
    const value = generate(z.string().email(), { seed: 1 }) as string
    expect(value).toContain('@')
  })

  it('url format validates', () => {
    const schema = z.string().url()
    expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
  })

  it('datetime format validates', () => {
    const schema = z.string().datetime()
    expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
  })

  it('ipv4 format validates', () => {
    const schema = z.string().ipv4()
    expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
  })
})

describe('generate — string length constraints', () => {
  it('string min length is respected', () => {
    const schema = z.string().min(8)
    const value = generate(schema, { seed: 1 }) as string
    expect(value.length >= 8).toBe(true)
    expect(validates(schema, value)).toBe(true)
  })

  it('string max length is respected', () => {
    const schema = z.string().max(5)
    const value = generate(schema, { seed: 1 }) as string
    expect(value.length <= 5).toBe(true)
    expect(validates(schema, value)).toBe(true)
  })

  it('string min+max range is respected', () => {
    const schema = z.string().min(3).max(6)
    const value = generate(schema, { seed: 1 }) as string
    expect(value.length >= 3 && value.length <= 6).toBe(true)
    expect(validates(schema, value)).toBe(true)
  })
})

describe('generate — number constraints', () => {
  it('number min is respected', () => {
    const schema = z.number().min(100)
    const value = generate(schema, { seed: 1 }) as number
    expect(value >= 100).toBe(true)
    expect(validates(schema, value)).toBe(true)
  })

  it('number max is respected', () => {
    const schema = z.number().max(10)
    const value = generate(schema, { seed: 1 }) as number
    expect(value <= 10).toBe(true)
    expect(validates(schema, value)).toBe(true)
  })

  it('integer with min/max validates', () => {
    const schema = z.number().int().min(50).max(100)
    const value = generate(schema, { seed: 1 }) as number
    expect(Number.isInteger(value)).toBe(true)
    expect(value >= 50 && value <= 100).toBe(true)
    expect(validates(schema, value)).toBe(true)
  })

  it('positive integer validates', () => {
    const schema = z.number().int().positive()
    const value = generate(schema, { seed: 1 }) as number
    expect(value > 0).toBe(true)
    expect(Number.isInteger(value)).toBe(true)
    expect(validates(schema, value)).toBe(true)
  })
})

describe('generate — regex pattern constraints', () => {
  it('phone number pattern validates', () => {
    const schema = z.object({ phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/) })
    const result = generate(schema, { seed: 1 }) as { phone: string }
    expect(/^\d{3}-\d{3}-\d{4}$/.test(result.phone)).toBe(true)
    expect(validates(schema, result)).toBe(true)
  })

  it('US zip code pattern validates', () => {
    const schema = z.string().regex(/^\d{5}(-\d{4})?$/)
    const value = generate(schema, { seed: 1 }) as string
    expect(/^\d{5}(-\d{4})?$/.test(value)).toBe(true)
    expect(validates(schema, value)).toBe(true)
  })

  it('hex color pattern validates', () => {
    const schema = z.string().regex(/^#[0-9a-fA-F]{6}$/)
    const value = generate(schema, { seed: 1 }) as string
    expect(/^#[0-9a-fA-F]{6}$/.test(value)).toBe(true)
    expect(validates(schema, value)).toBe(true)
  })

  it('word-only pattern validates', () => {
    const schema = z.string().regex(/^\w+$/)
    const value = generate(schema, { seed: 1 }) as string
    expect(/^\w+$/.test(value)).toBe(true)
    expect(validates(schema, value)).toBe(true)
  })

  it('alternation pattern validates', () => {
    const schema = z.string().regex(/^(foo|bar|baz)$/)
    const value = generate(schema, { seed: 1 }) as string
    expect(/^(foo|bar|baz)$/.test(value)).toBe(true)
    expect(validates(schema, value)).toBe(true)
  })

  it('generation is deterministic across same seed', () => {
    const schema = z.string().regex(/^\d{3}-\d{3}-\d{4}$/)
    const a = generate(schema, { seed: 42 })
    const b = generate(schema, { seed: 42 })
    expect(a).toBe(b)
  })

  it('different seeds produce different outputs', () => {
    const schema = z.string().regex(/^\d{10}$/)
    const a = generate(schema, { seed: 1 })
    const b = generate(schema, { seed: 2 })
    expect(a).not.toBe(b)
  })
})

