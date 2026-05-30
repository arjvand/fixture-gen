import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generate } from '../src/generate'

describe('scenario option — type acceptance', () => {
  it('accepts a built-in scenario name without error', () => {
    const schema = z.object({ name: z.string() })
    expect(() => generate(schema, { scenario: 'happy-path' })).not.toThrow()
  })

  it('accepts any string as scenario name without error', () => {
    const schema = z.object({ name: z.string() })
    expect(() => generate(schema, { scenario: 'my-custom' })).not.toThrow()
  })
})

describe("scenario: 'empty-state'", () => {
  it('arrays are empty', () => {
    const schema = z.object({ tags: z.array(z.string()) })
    const result = generate(schema, { scenario: 'empty-state' }) as { tags: string[] }
    expect(result.tags).toEqual([])
  })

  it('optional fields are absent (undefined)', () => {
    const schema = z.object({ name: z.string(), bio: z.string().optional() })
    const result = generate(schema, { scenario: 'empty-state' }) as {
      name: string
      bio?: string
    }
    expect(result.bio).toBeUndefined()
  })

  it('nullable fields are null', () => {
    const schema = z.object({ name: z.string().nullable() })
    const result = generate(schema, { scenario: 'empty-state' }) as { name: string | null }
    expect(result.name).toBeNull()
  })

  it('records are empty objects', () => {
    const schema = z.record(z.string(), z.number())
    const result = generate(schema, { scenario: 'empty-state' }) as Record<string, number>
    expect(result).toEqual({})
  })

  it('required string fields still generate a value', () => {
    const schema = z.object({ name: z.string() })
    const result = generate(schema, { scenario: 'empty-state' }) as { name: string }
    expect(typeof result.name).toBe('string')
  })
})

describe("scenario: 'boundary-min'", () => {
  it('integer is at its minimum constraint', () => {
    const schema = z.object({ age: z.number().int().min(18).max(100) })
    const result = generate(schema, { scenario: 'boundary-min' }) as { age: number }
    expect(result.age).toBe(18)
  })

  it('integer with no min defaults to 0', () => {
    const schema = z.object({ count: z.number().int() })
    const result = generate(schema, { scenario: 'boundary-min' }) as { count: number }
    expect(result.count).toBe(0)
  })

  it('number is at its minimum constraint', () => {
    const schema = z.object({ score: z.number().min(1.5).max(10) })
    const result = generate(schema, { scenario: 'boundary-min' }) as { score: number }
    expect(result.score).toBe(1.5)
  })

  it('string is at its minimum length', () => {
    const schema = z.object({ code: z.string().min(3).max(8) })
    const result = generate(schema, { scenario: 'boundary-min' }) as { code: string }
    expect(result.code.length).toBe(3)
  })

  it('string with no min has length 0', () => {
    const schema = z.object({ note: z.string().max(100) })
    const result = generate(schema, { scenario: 'boundary-min' }) as { note: string }
    expect(result.note.length).toBe(0)
  })

  it('array is at its minimum length', () => {
    const schema = z.object({ items: z.array(z.string()).min(2).max(5) })
    const result = generate(schema, { scenario: 'boundary-min' }) as { items: string[] }
    expect(result.items.length).toBe(2)
  })

  it('array with no min has length 0', () => {
    const schema = z.object({ tags: z.array(z.string()) })
    const result = generate(schema, { scenario: 'boundary-min' }) as { tags: string[] }
    expect(result.tags.length).toBe(0)
  })

  it('optional fields are included (boundary still validates)', () => {
    const schema = z.object({ name: z.string(), bio: z.string().optional() })
    const result = generate(schema, { scenario: 'boundary-min' }) as {
      name: string
      bio?: string
    }
    expect(result.bio).not.toBeUndefined()
  })
})
