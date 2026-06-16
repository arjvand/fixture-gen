import { describe, expect, it } from 'vitest'
import { generateFromJsonSchema } from '../src/index'

describe('generateFromJsonSchema — primitives', () => {
  it('generates a string', () => {
    const result = generateFromJsonSchema({ type: 'string' }, { seed: 1 })
    expect(typeof result).toBe('string')
  })

  it('generates a number', () => {
    const result = generateFromJsonSchema({ type: 'number' }, { seed: 1 })
    expect(typeof result).toBe('number')
  })

  it('generates an integer', () => {
    const result = generateFromJsonSchema({ type: 'integer' }, { seed: 1 })
    expect(Number.isInteger(result)).toBe(true)
  })

  it('generates a boolean', () => {
    const result = generateFromJsonSchema({ type: 'boolean' }, { seed: 1 })
    expect(typeof result).toBe('boolean')
  })

  it('generates a null', () => {
    const result = generateFromJsonSchema({ type: 'null' }, { seed: 1 })
    expect(result).toBe(null)
  })
})

describe('generateFromJsonSchema — strings with constraints', () => {
  it('honors format: uuid', () => {
    const result = generateFromJsonSchema({ type: 'string', format: 'uuid' }, { seed: 1 })
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('honors format: email', () => {
    const result = generateFromJsonSchema({ type: 'string', format: 'email' }, { seed: 1 })
    expect(result).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  })

  it('honors minLength', () => {
    const result = generateFromJsonSchema({ type: 'string', minLength: 10 }, { seed: 1 })
    expect((result as string).length).toBeGreaterThanOrEqual(10)
  })

  it('honors maxLength', () => {
    const result = generateFromJsonSchema({ type: 'string', maxLength: 5 }, { seed: 1 })
    expect((result as string).length).toBeLessThanOrEqual(5)
  })

  it('honors pattern', () => {
    const result = generateFromJsonSchema({ type: 'string', pattern: '^[A-Z]{3}$' }, { seed: 1 })
    expect(result).toMatch(/^[A-Z]{3}$/)
  })
})

describe('generateFromJsonSchema — numbers with constraints', () => {
  it('honors minimum', () => {
    const result = generateFromJsonSchema({ type: 'number', minimum: 50 }, { seed: 1 })
    expect(result).toBeGreaterThanOrEqual(50)
  })

  it('honors maximum', () => {
    const result = generateFromJsonSchema({ type: 'integer', maximum: 10 }, { seed: 1 })
    expect(result).toBeLessThanOrEqual(10)
  })

  it('honors exclusiveMinimum', () => {
    const result = generateFromJsonSchema({ type: 'number', exclusiveMinimum: 5 }, { seed: 1 })
    expect(result).toBeGreaterThan(5)
  })

  it('honors exclusiveMaximum', () => {
    const result = generateFromJsonSchema({ type: 'integer', exclusiveMaximum: 100 }, { seed: 1 })
    expect(result).toBeLessThan(100)
  })
})

describe('generateFromJsonSchema — objects', () => {
  const UserSchema = {
    type: 'object' as const,
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      age: { type: 'integer', minimum: 0, maximum: 120 },
    },
    required: ['id', 'name'],
  }

  it('generates an object with all required keys', () => {
    const result = generateFromJsonSchema(UserSchema, { seed: 42 }) as Record<string, unknown>
    expect(typeof result.id).toBe('string')
    expect(typeof result.name).toBe('string')
    expect(typeof result.age).toBe('number')
  })

  it('includes optional fields (by default included)', () => {
    const result = generateFromJsonSchema(UserSchema, { seed: 42 }) as Record<string, unknown>
    expect(result).toHaveProperty('age')
  })

  it('honors nested objects', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        address: {
          type: 'object' as const,
          properties: {
            city: { type: 'string' },
            zip: { type: 'string' },
          },
          required: ['city'],
        },
      },
      required: ['address'],
    }
    const result = generateFromJsonSchema(schema, { seed: 1 }) as Record<string, unknown>
    expect(result.address).toBeTypeOf('object')
    expect((result.address as Record<string, unknown>).city).toBeTypeOf('string')
  })

  it('handles empty object schema', () => {
    const result = generateFromJsonSchema({ type: 'object', properties: {} }, { seed: 1 })
    expect(result).toEqual({})
  })
})

describe('generateFromJsonSchema — arrays', () => {
  it('generates an array of strings', () => {
    const result = generateFromJsonSchema({ type: 'array', items: { type: 'string' } }, { seed: 1 })
    expect(Array.isArray(result)).toBe(true)
    expect((result as string[]).length).toBeGreaterThan(0)
    for (const item of result as string[]) {
      expect(typeof item).toBe('string')
    }
  })

  it('honors minItems / maxItems', () => {
    const result = generateFromJsonSchema(
      { type: 'array', items: { type: 'number' }, minItems: 5, maxItems: 5 },
      { seed: 1 },
    )
    expect((result as unknown[]).length).toBe(5)
  })

  it('handles tuple via prefixItems', () => {
    const result = generateFromJsonSchema(
      {
        type: 'array',
        prefixItems: [{ type: 'string' }, { type: 'integer' }],
      },
      { seed: 1 },
    )
    expect(Array.isArray(result)).toBe(true)
    const arr = result as unknown[]
    expect(arr).toHaveLength(2)
    expect(typeof arr[0]).toBe('string')
    expect(typeof arr[1]).toBe('number')
  })

  it('handles tuple with items (array form)', () => {
    const result = generateFromJsonSchema(
      {
        type: 'array',
        items: [{ type: 'string' }, { type: 'boolean' }],
      },
      { seed: 1 },
    )
    const arr = result as unknown[]
    expect(arr).toHaveLength(2)
    expect(typeof arr[0]).toBe('string')
    expect(typeof arr[1]).toBe('boolean')
  })
})

describe('generateFromJsonSchema — enum / const', () => {
  it('generates an enum value', () => {
    const values = ['admin', 'user', 'guest']
    const result = generateFromJsonSchema({ type: 'string', enum: values.slice() }, { seed: 1 })
    expect(values).toContain(result)
  })

  it('generates a const value', () => {
    const result = generateFromJsonSchema({ const: 'hello' }, { seed: 1 })
    expect(result).toBe('hello')
  })

  it('generates a numeric const', () => {
    const result = generateFromJsonSchema({ const: 42 }, { seed: 1 })
    expect(result).toBe(42)
  })
})

describe('generateFromJsonSchema — anyOf / oneOf', () => {
  it('generates a value matching anyOf', () => {
    const result = generateFromJsonSchema(
      {
        anyOf: [{ type: 'string' }, { type: 'integer' }],
      },
      { seed: 1 },
    )
    expect(typeof result === 'string' || typeof result === 'number').toBe(true)
  })

  it('generates a value matching oneOf', () => {
    const result = generateFromJsonSchema(
      {
        oneOf: [{ type: 'boolean' }, { type: 'null' }],
      },
      { seed: 1 },
    )
    expect(typeof result === 'boolean' || result === null).toBe(true)
  })
})

describe('generateFromJsonSchema — allOf', () => {
  it('merges object properties from allOf', () => {
    const result = generateFromJsonSchema(
      {
        allOf: [
          {
            type: 'object' as const,
            properties: { a: { type: 'string' } },
            required: ['a'],
          },
          {
            type: 'object' as const,
            properties: { b: { type: 'integer' } },
          },
        ],
      },
      { seed: 1 },
    ) as Record<string, unknown>
    expect(typeof result.a).toBe('string')
    expect(typeof result.b).toBe('number')
  })
})

describe('generateFromJsonSchema — $ref resolution', () => {
  it('resolves $ref to $defs', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        user: { $ref: '#/$defs/User' },
      },
      required: ['user'],
      $defs: {
        User: {
          type: 'object' as const,
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
          },
          required: ['id', 'name'],
        },
      },
    }
    const result = generateFromJsonSchema(schema, { seed: 1 }) as Record<string, unknown>
    const user = result.user as Record<string, unknown>
    expect(typeof user.id).toBe('number')
    expect(typeof user.name).toBe('string')
  })
})

describe('generateFromJsonSchema — determinism', () => {
  it('identical seed yields deep-equal output', () => {
    const schema = { type: 'string', format: 'uuid' }
    expect(generateFromJsonSchema(schema, { seed: 7 })).toEqual(
      generateFromJsonSchema(schema, { seed: 7 }),
    )
  })

  it('different seeds diverge', () => {
    const schema = { type: 'string' }
    expect(generateFromJsonSchema(schema, { seed: 7 })).not.toEqual(
      generateFromJsonSchema(schema, { seed: 8 }),
    )
  })
})

describe('generateFromJsonSchema — overrides', () => {
  it('overrides pin specific fields', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
      required: ['id', 'name'],
    }
    const result = generateFromJsonSchema(schema, {
      seed: 1,
      overrides: { name: 'Ada' },
    }) as Record<string, unknown>
    expect(result.name).toBe('Ada')
    expect(typeof result.id).toBe('number')
  })
})

describe('generateFromJsonSchema — scenario', () => {
  it('boundary-min produces short strings', () => {
    const result = generateFromJsonSchema(
      { type: 'string', minLength: 0 },
      { seed: 1, scenario: 'boundary-min' },
    )
    expect((result as string).length).toBe(0)
  })

  it('empty-state produces empty array', () => {
    const result = generateFromJsonSchema(
      { type: 'array', items: { type: 'string' } },
      { seed: 1, scenario: 'empty-state' },
    )
    expect(result).toEqual([])
  })
})

describe('generateFromJsonSchema — unknown schema', () => {
  it('falls through for empty schema {}', () => {
    const result = generateFromJsonSchema({}, { seed: 1 })
    // Empty schema has no type → resolves to unknown → returns undefined
    expect(result).toBeUndefined()
  })
})
