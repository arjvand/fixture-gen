import { Type } from '@sinclair/typebox'
import { type } from 'arktype'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { toJsonSchema } from '../src/index'

describe('toJsonSchema — Zod (delegate to .toJSONSchema)', () => {
  it('converts a Zod string', () => {
    const result = toJsonSchema(z.string())
    expect(result).toHaveProperty('type')
  })

  it('converts a Zod object', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().int(),
    })
    const result = toJsonSchema(schema)
    expect(result.type).toBe('object')
    expect(result.properties).toBeDefined()
    expect(result.required).toContain('name')
    expect(result.required).toContain('age')
  })

  it('converts a Zod string with constraints', () => {
    const result = toJsonSchema(z.string().min(3).max(10))
    // Zod delegates to its own toJSONSchema, so we just check output exists
    expect(result).toHaveProperty('type', 'string')
  })
})

describe('toJsonSchema — TypeBox (already JSON Schema)', () => {
  it('converts a TypeBox string', () => {
    const schema = Type.String()
    const result = toJsonSchema(schema)
    expect(result).toHaveProperty('type', 'string')
  })

  it('converts a TypeBox object', () => {
    const schema = Type.Object({
      id: Type.Number(),
      name: Type.String(),
    })
    const result = toJsonSchema(schema)
    expect(result).toHaveProperty('type', 'object')
    expect(result.properties).toHaveProperty('id')
    expect(result.properties).toHaveProperty('name')
  })

  it('includes constraints from TypeBox', () => {
    const schema = Type.String({ minLength: 3, maxLength: 10 })
    const result = toJsonSchema(schema)
    expect(result).toHaveProperty('minLength', 3)
    expect(result).toHaveProperty('maxLength', 10)
  })
})

describe('toJsonSchema — ArkType (via fallback)', () => {
  it('converts an ArkType string', () => {
    const schema = type('string')
    const result = toJsonSchema(schema)
    expect(result).toHaveProperty('type', 'string')
  })

  it('converts an ArkType object', () => {
    const schema = type({ id: 'number', name: 'string' })
    const result = toJsonSchema(schema)
    expect(result).toHaveProperty('type', 'object')
    expect(result.properties).toHaveProperty('id')
    expect(result.properties).toHaveProperty('name')
  })
})

describe('toJsonSchema — fallback (IntrospectedNode converter)', () => {
  it('converts a manually constructed schema object via introspect', () => {
    // Pass something that looks like a StandardSchema with a known vendor
    // This exercises the fallback path
    const fakeSchema = {
      '~standard': {
        vendor: 'unknown-vendor',
        version: 1,
        validate: (value: unknown) => ({ value }),
      },
    }
    const result = toJsonSchema(fakeSchema)
    // unknown vendor → { kind: 'unknown' } → {} (default)
    expect(result).toEqual({})
  })

  it('returns an empty schema for unknown nodes', () => {
    const customSchema = {
      '~standard': {
        vendor: 'unknown-schema',
        version: 1,
        validate: (value: unknown) => ({ value }),
      },
    }
    const result = toJsonSchema(customSchema)
    // Falls through all vendor checks → introspect → unknown node → {}
    expect(result).toEqual({})
  })
})
