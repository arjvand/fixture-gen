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
