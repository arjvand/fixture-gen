import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generate } from '../src/index'
import type { StandardSchemaV1 } from '../src/standard'

const validates = (schema: StandardSchemaV1, value: unknown): boolean => {
  const result = schema['~standard'].validate(value)
  if (result instanceof Promise) throw new Error('expected synchronous validation')
  return result.issues === undefined
}

describe('generate — custom generators', () => {
  const User = z.object({
    profile: z.object({
      name: z.string(),
      slug: z.string(),
    }),
    tag: z.string(),
  })

  it('applies field generators before schema-wide generators', () => {
    const result = generate(User, {
      seed: 1,
      overrides: {
        tag: 'override-tag',
      },
      generators: {
        'profile.name': () => 'field-name',
        'profile.slug': ({ pathKey }) => `field:${pathKey}`,
      },
      generator: ({ node, pathKey }) => {
        if (node.kind === 'string' && pathKey === 'tag') return 'schema-tag'
        if (node.kind === 'string' && pathKey === 'profile.name') return 'schema-name'
        return undefined
      },
    })

    expect(result.profile.name).toBe('field-name')
    expect(result.profile.slug).toBe('field:profile.slug')
    expect(result.tag).toBe('override-tag')
  })

  it('supports wildcard field paths', () => {
    const List = z.object({
      items: z.array(z.object({ name: z.string() })),
    })

    const result = generate(List, {
      seed: 1,
      generators: {
        'items.*.name': () => 'wildcard',
      },
    })

    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.every((item) => item.name === 'wildcard')).toBe(true)
  })

  it('falls back to built-in generation when a custom value does not validate', () => {
    const UserWithUuid = z.object({ id: z.string().uuid() })

    const result = generate(UserWithUuid, {
      seed: 1,
      generators: {
        id: () => 'not-a-uuid',
      },
    })

    expect(result.id).not.toBe('not-a-uuid')
    expect(validates(UserWithUuid, result)).toBe(true)
  })
})
