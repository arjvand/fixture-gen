import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import * as v from 'valibot'
import { type } from 'arktype'
import { FormatRegistry, Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { generate, generateMany } from '../src/index'

declare const process: {
  env: {
    CROSS_VALIDATOR_VENDOR?: string
  }
}

FormatRegistry.Set('uuid', (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
)

interface StandardSchemaLike {
  '~standard': {
    validate: (value: unknown) => unknown
  }
}

type VendorSuite = {
  name: string
  schemas: {
    object: any
    array: any
    tuple: any
    record: any
    union: any
    literal: any
    modifiers: any
    discriminated: any
  }
  validate: (schema: any, value: unknown) => boolean
}

const standardValidate = (schema: StandardSchemaLike, value: unknown): boolean => {
  const result = schema['~standard'].validate(value) as { issues?: unknown } | Promise<{ issues?: unknown }>
  if (result instanceof Promise) throw new Error('expected synchronous validation')
  return result.issues === undefined
}

const vendors: VendorSuite[] = [
  {
    name: 'Zod',
    schemas: {
      object: z.object({
        id: z.string().uuid(),
        name: z.string(),
        age: z.number().int().min(18).max(99),
      }),
      array: z.array(z.string()).min(1).max(3),
      tuple: z.tuple([z.string(), z.number()]),
      record: z.record(z.string(), z.number()),
      union: z.union([z.string(), z.number()]),
      literal: z.literal('hello'),
      modifiers: z.object({
        optional: z.string().optional(),
        nullable: z.string().nullable(),
        defaulted: z.string().default('x'),
        caught: z.string().catch('y'),
      }),
      discriminated: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('a'), meows: z.boolean() }),
        z.object({ kind: z.literal('b'), barks: z.boolean() }),
      ]),
    },
    validate: standardValidate,
  },
  {
    name: 'Valibot',
    schemas: {
      object: v.object({
        id: v.pipe(v.string(), v.uuid()),
        name: v.string(),
        age: v.pipe(v.number(), v.integer(), v.minValue(18), v.maxValue(99)),
      }),
      array: v.pipe(v.array(v.string()), v.minLength(1), v.maxLength(3)),
      tuple: v.tuple([v.string(), v.number()]),
      record: v.record(v.string(), v.number()),
      union: v.union([v.string(), v.number()]),
      literal: v.literal('hello'),
      modifiers: v.object({
        optional: v.optional(v.string()),
        nullable: v.nullable(v.string()),
        defaulted: v.fallback(v.string(), 'x'),
        caught: v.fallback(v.string(), 'y'),
      }),
      discriminated: v.variant('kind', [
        v.object({ kind: v.literal('a'), meows: v.boolean() }),
        v.object({ kind: v.literal('b'), barks: v.boolean() }),
      ]),
    },
    validate: standardValidate,
  },
  {
    name: 'ArkType',
    schemas: {
      object: type({ id: 'string.uuid', name: 'string', age: 'number >= 18 <= 99' as any }),
      array: type('string[]'),
      tuple: type(['string', 'number']),
      record: type('Record<string, number>'),
      union: type('string | number'),
      literal: type(['===', 'hello']),
      modifiers: type({
        optional: ['string', '?'],
        nullable: 'string | null',
        defaulted: ['string', '=', 'x'],
        caught: 'string | number',
      }),
      discriminated: type([{ kind: '"a"', meows: 'boolean' }, '|', { kind: '"b"', barks: 'boolean' }]),
    },
    validate: standardValidate,
  },
  {
    name: 'TypeBox',
    schemas: {
      object: Type.Object({
        id: Type.String({ format: 'uuid' }),
        name: Type.String(),
        age: Type.Integer({ minimum: 18, maximum: 99 }),
      }),
      array: Type.Array(Type.String(), { minItems: 1, maxItems: 3 }),
      tuple: Type.Tuple([Type.String(), Type.Number()]),
      record: Type.Record(Type.String(), Type.Number()),
      union: Type.Union([Type.String(), Type.Number()]),
      literal: Type.Literal('hello'),
      modifiers: Type.Object({
        optional: Type.Optional(Type.String()),
        nullable: Type.Union([Type.String(), Type.Null()]),
        defaulted: Type.String({ default: 'x' }),
        caught: Type.String({ default: 'y' }),
      }),
      discriminated: Type.Union([
        Type.Object({ kind: Type.Literal('a'), meows: Type.Boolean() }),
        Type.Object({ kind: Type.Literal('b'), barks: Type.Boolean() }),
      ]),
    },
    validate: (schema, value) => Value.Check(schema as never, value),
  },
]

const selectedVendor = process.env.CROSS_VALIDATOR_VENDOR?.toLowerCase()
const activeVendors = selectedVendor
  ? vendors.filter((vendor) => vendor.name.toLowerCase() === selectedVendor)
  : vendors

if (selectedVendor && activeVendors.length === 0) {
  throw new Error(`Unknown CROSS_VALIDATOR_VENDOR: ${selectedVendor}`)
}

for (const vendor of activeVendors) {
  describe(`${vendor.name} compatibility`, () => {
    it('generates validating object fixtures', () => {
      const value = generate(vendor.schemas.object, { seed: 42 })
      expect(vendor.validate(vendor.schemas.object, value)).toBe(true)
    })

    it('generates validating array fixtures', () => {
      const value = generate(vendor.schemas.array, { seed: 42 })
      expect(vendor.validate(vendor.schemas.array, value)).toBe(true)
    })

    it('generates validating tuple fixtures', () => {
      const value = generate(vendor.schemas.tuple, { seed: 42 })
      expect(vendor.validate(vendor.schemas.tuple, value)).toBe(true)
    })

    it('generates validating record fixtures', () => {
      const value = generate(vendor.schemas.record, { seed: 42 })
      expect(vendor.validate(vendor.schemas.record, value)).toBe(true)
    })

    it('generates validating union fixtures', () => {
      const value = generate(vendor.schemas.union, { seed: 42 })
      expect(vendor.validate(vendor.schemas.union, value)).toBe(true)
    })

    it('generates validating literal fixtures', () => {
      const value = generate(vendor.schemas.literal, { seed: 42 })
      expect(vendor.validate(vendor.schemas.literal, value)).toBe(true)
    })

    it('generates validating modifier fixtures', () => {
      const value = generate(vendor.schemas.modifiers, { seed: 42 })
      expect(vendor.validate(vendor.schemas.modifiers, value)).toBe(true)
    })

    it('generates validating discriminated union fixtures', () => {
      const value = generate(vendor.schemas.discriminated, { seed: 42 })
      expect(vendor.validate(vendor.schemas.discriminated, value)).toBe(true)
    })

    it('is deterministic for a fixed seed', () => {
      const a = generate(vendor.schemas.object, { seed: 7 })
      const b = generate(vendor.schemas.object, { seed: 7 })
      expect(a).toEqual(b)
    })

    it('generateMany returns validating batches', () => {
      const values = generateMany(vendor.schemas.object, 3, { seed: 42 })
      expect(values).toHaveLength(3)
      for (const value of values) {
        expect(vendor.validate(vendor.schemas.object, value)).toBe(true)
      }
    })
  })
}
