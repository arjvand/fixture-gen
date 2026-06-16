import { describe, expect, it } from 'vitest'
import { generateFromOpenApi } from '../src/index'

const PetSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    tag: { type: 'string' },
  },
  required: ['id', 'name'],
}

const UserSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    pets: {
      type: 'array' as const,
      items: { $ref: '#/components/schemas/Pet' },
    },
  },
  required: ['id', 'name'],
}

const spec = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  components: {
    schemas: {
      Pet: PetSchema,
      User: UserSchema,
    },
  },
}

describe('generateFromOpenApi', () => {
  it('generates a fixture from a named component schema', () => {
    const result = generateFromOpenApi(spec, 'Pet', { seed: 1 }) as Record<string, unknown>
    expect(typeof result.id).toBe('number')
    expect(typeof result.name).toBe('string')
    expect(result).toHaveProperty('tag')
  })

  it('resolves $ref across components', () => {
    const result = generateFromOpenApi(spec, 'User', { seed: 1 }) as Record<string, unknown>
    expect(typeof result.id).toBe('number')
    expect(typeof result.name).toBe('string')
    expect(Array.isArray(result.pets)).toBe(true)
    if (Array.isArray(result.pets) && result.pets.length > 0) {
      const pet = result.pets[0] as Record<string, unknown>
      expect(typeof pet.id).toBe('number')
      expect(typeof pet.name).toBe('string')
    }
  })

  it('is deterministic', () => {
    const a = generateFromOpenApi(spec, 'Pet', { seed: 42 })
    const b = generateFromOpenApi(spec, 'Pet', { seed: 42 })
    expect(a).toEqual(b)
  })

  it('throws for unknown schema name', () => {
    expect(() => generateFromOpenApi(spec, 'Unknown', { seed: 1 })).toThrow(/not found/)
  })

  it('supports overrides', () => {
    const result = generateFromOpenApi(spec, 'Pet', {
      seed: 1,
      overrides: { name: 'Rex' },
    }) as Record<string, unknown>
    expect(result.name).toBe('Rex')
  })
})

describe('generateFromOpenApi — circular refs', () => {
  it('handles circular $ref without infinite recursion', () => {
    const circularSpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      components: {
        schemas: {
          Node: {
            type: 'object' as const,
            properties: {
              id: { type: 'integer' },
              child: { $ref: '#/components/schemas/Node' },
            },
            required: ['id'],
          },
        },
      },
    }
    const result = generateFromOpenApi(circularSpec, 'Node', {
      seed: 1,
    }) as Record<string, unknown>
    expect(typeof result.id).toBe('number')
    // Child should be an object (the circular ref gets a placeholder)
    expect(result.child).toBeTypeOf('object')
  })
})
