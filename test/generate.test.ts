import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generate } from '../src/index'
import type { StandardSchemaV1 } from '../src/standard'

/** Round-trip generated output through the schema's own Standard Schema validator. */
const validates = (schema: StandardSchemaV1, value: unknown): boolean => {
  const result = schema['~standard'].validate(value)
  if (result instanceof Promise) throw new Error('expected synchronous validation')
  return result.issues === undefined
}

const primitives = {
  string: z.string(),
  number: z.number(),
  integer: z.number().int(),
  boolean: z.boolean(),
  date: z.date(),
}

describe('generate — primitives', () => {
  for (const [name, schema] of Object.entries(primitives)) {
    it(`${name} output validates against its schema`, () => {
      expect(validates(schema, generate(schema, { seed: 1 }))).toBe(true)
    })
  }

  it('integer schema receives an integer value', () => {
    expect(Number.isInteger(generate(z.number().int(), { seed: 1 }))).toBe(true)
  })

  it('date schema receives a Date instance', () => {
    expect(generate(z.date(), { seed: 1 })).toBeInstanceOf(Date)
  })
})

describe('generate — flat object', () => {
  const User = z.object({
    id: z.string(),
    name: z.string(),
    age: z.number().int(),
    active: z.boolean(),
    createdAt: z.date(),
  })

  it('output validates against the schema', () => {
    expect(validates(User, generate(User, { seed: 42 }))).toBe(true)
  })

  it('produces every declared key', () => {
    const user = generate(User, { seed: 42 })
    expect(Object.keys(user).sort()).toEqual(['active', 'age', 'createdAt', 'id', 'name'])
  })
})

describe('generate — determinism', () => {
  const User = z.object({ id: z.string(), age: z.number().int() })

  it('identical seed yields deep-equal output', () => {
    expect(generate(User, { seed: 7 })).toEqual(generate(User, { seed: 7 }))
  })

  it('different seeds diverge', () => {
    expect(generate(User, { seed: 7 })).not.toEqual(generate(User, { seed: 8 }))
  })
})
