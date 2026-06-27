import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generate, generateMany } from '../src/generate'
import {
  clearScenarios as clearFromIndex,
  defineScenario as defineScenarioFromIndex,
} from '../src/index'
import { generateRelational } from '../src/relational'
import { clearScenarios, defineScenario } from '../src/scenario'

describe('scenario option — type acceptance', () => {
  it('accepts a built-in scenario name without error', () => {
    const schema = z.object({ name: z.string() })
    expect(() => generate(schema, { scenario: 'happy-path' })).not.toThrow()
  })

  it('accepts a registered custom scenario name without error', () => {
    const schema = z.object({ name: z.string() })
    defineScenario('my-custom', { name: 'test' })
    expect(() => generate(schema, { scenario: 'my-custom' })).not.toThrow()
    clearScenarios()
  })
})

describe("scenario: 'empty-state'", () => {
  it('arrays are empty', () => {
    const schema = z.object({ tags: z.array(z.string()) })
    const result = generate(schema, { scenario: 'empty-state' }) as { tags: string[] }
    expect(result.tags).toEqual([])
  })

  it('optional fields are absent (truly missing, not undefined)', () => {
    const schema = z.object({ name: z.string(), bio: z.string().optional() })
    const result = generate(schema, { scenario: 'empty-state' }) as {
      name: string
      bio?: string
    }
    expect(result.bio).toBeUndefined()
    expect('bio' in result).toBe(false)
    expect(Object.keys(result)).not.toContain('bio')
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

  it('overrides option with undefined values does not add them as own properties', () => {
    const schema = z.object({ name: z.string(), bio: z.string().optional() })
    const result = generate(schema, {
      scenario: 'empty-state',
      overrides: { bio: undefined },
    }) as { name: string; bio?: string }
    expect('bio' in result).toBe(false)
    expect(Object.keys(result)).not.toContain('bio')
  })

  it('overrides with undefined values do not clobber generated values (no scenario)', () => {
    const schema = z.object({ name: z.string(), bio: z.string().optional() })
    const result = generate(schema, { overrides: { bio: undefined } }) as {
      name: string
      bio?: string
    }
    expect(typeof result.bio).toBe('string')
    expect(result.bio).not.toBeUndefined()
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

describe("scenario: 'boundary-max'", () => {
  it('integer is at its maximum constraint', () => {
    const schema = z.object({ age: z.number().int().min(18).max(100) })
    const result = generate(schema, { scenario: 'boundary-max' }) as { age: number }
    expect(result.age).toBe(100)
  })

  it('integer with no max defaults to min+1000', () => {
    const schema = z.object({ count: z.number().int() })
    const result = generate(schema, { scenario: 'boundary-max' }) as { count: number }
    expect(result.count).toBe(1000) // default: 0 + 1000
  })

  it('number is at its maximum constraint', () => {
    const schema = z.object({ score: z.number().min(1.5).max(10) })
    const result = generate(schema, { scenario: 'boundary-max' }) as { score: number }
    expect(result.score).toBe(10)
  })

  it('string is at its maximum length', () => {
    const schema = z.object({ code: z.string().min(3).max(8) })
    const result = generate(schema, { scenario: 'boundary-max' }) as { code: string }
    expect(result.code.length).toBe(8)
  })

  it('string with no max uses default max (12)', () => {
    const schema = z.object({ note: z.string() })
    const result = generate(schema, { scenario: 'boundary-max' }) as { note: string }
    expect(result.note.length).toBe(12)
  })

  it('array is at its maximum length', () => {
    const schema = z.object({ items: z.array(z.string()).min(2).max(5) })
    const result = generate(schema, { scenario: 'boundary-max' }) as { items: string[] }
    expect(result.items.length).toBe(5)
  })

  it('array with no max uses default max (3)', () => {
    const schema = z.object({ tags: z.array(z.string()) })
    const result = generate(schema, { scenario: 'boundary-max' }) as { tags: string[] }
    expect(result.tags.length).toBe(3)
  })
})

describe("scenario: 'invalid'", () => {
  it('object schema produces a value that fails validation', () => {
    const schema = z.object({ name: z.string() })
    const result = generate(schema, { scenario: 'invalid' })
    const validation = schema['~standard'].validate(result)
    if (validation instanceof Promise) throw new Error('expected sync')
    expect(validation.issues).toBeDefined()
  })

  it('string schema produces a value that fails validation', () => {
    const schema = z.string()
    const result = generate(schema, { scenario: 'invalid' })
    const validation = schema['~standard'].validate(result)
    if (validation instanceof Promise) throw new Error('expected sync')
    expect(validation.issues).toBeDefined()
  })

  it('number schema produces a value that fails validation', () => {
    const schema = z.number()
    const result = generate(schema, { scenario: 'invalid' })
    const validation = schema['~standard'].validate(result)
    if (validation instanceof Promise) throw new Error('expected sync')
    expect(validation.issues).toBeDefined()
  })
})

describe("scenario: 'missing-subtree'", () => {
  it('nested required object is null', () => {
    const schema = z.object({
      profile: z.object({ name: z.string(), age: z.number() }),
    })
    const result = generate(schema, { scenario: 'missing-subtree' }) as {
      profile: { name: string; age: number } | null
    }
    expect(result.profile).toBeNull()
  })

  it('root object is generated normally (not null)', () => {
    const schema = z.object({ name: z.string() })
    const result = generate(schema, { scenario: 'missing-subtree' }) as { name: string }
    expect(result).not.toBeNull()
    expect(typeof result.name).toBe('string')
  })
})

describe('defineScenario — overrides object', () => {
  afterEach(() => clearScenarios())

  it('generates the base value then merges overrides', () => {
    const schema = z.object({ name: z.string(), role: z.string() })
    defineScenario('admin-user', { role: 'admin' })
    const result = generate(schema, { scenario: 'admin-user' }) as {
      name: string
      role: string
    }
    expect(result.role).toBe('admin')
    expect(typeof result.name).toBe('string')
  })

  it('throws on unknown scenario', () => {
    const schema = z.object({ name: z.string() })
    expect(() => generate(schema, { scenario: 'does-not-exist' })).toThrow(
      'unknown scenario "does-not-exist"',
    )
  })

  it('throws when trying to redefine a built-in scenario', () => {
    expect(() => defineScenario('happy-path', { name: 'test' })).toThrow(
      'cannot redefine built-in scenario "happy-path"',
    )
  })
})

describe('defineScenario — factory function', () => {
  afterEach(() => clearScenarios())

  it('factory receives the generated value and returns a replacement', () => {
    const schema = z.object({ name: z.string(), active: z.boolean() })
    defineScenario<{ name: string; active: boolean }>('always-active', (value) => ({
      ...value,
      active: true,
    }))
    const result = generate(schema, { scenario: 'always-active' }) as {
      name: string
      active: boolean
    }
    expect(result.active).toBe(true)
    expect(typeof result.name).toBe('string')
  })

  it('factory can return a completely new value', () => {
    const schema = z.object({ code: z.number().int() })
    defineScenario('zero-code', () => ({ code: 0 }))
    const result = generate(schema, { scenario: 'zero-code' }) as { code: number }
    expect(result.code).toBe(0)
  })
})

describe('scenario propagation', () => {
  it('generateMany propagates scenario to every element', () => {
    const schema = z.object({ tags: z.array(z.string()) })
    const results = generateMany(schema, 3, { scenario: 'empty-state' }) as Array<{
      tags: string[]
    }>
    for (const result of results) {
      expect(result.tags).toEqual([])
    }
  })

  it('generateRelational propagates scenario to all tables', () => {
    const schemas = {
      users: z.object({ id: z.string(), tags: z.array(z.string()) }),
      posts: z.object({ id: z.string(), authorId: z.string(), items: z.array(z.number()) }),
    }
    const result = generateRelational(schemas, {
      counts: { users: 2, posts: 3 },
      relations: { 'posts.authorId': 'users.id' },
      scenario: 'empty-state',
    }) as { users: Array<{ id: string; tags: string[] }>; posts: Array<{ items: number[] }> }

    for (const user of result.users) {
      expect(user.tags).toEqual([])
    }
    for (const post of result.posts) {
      expect(post.items).toEqual([])
    }
  })
})

describe('public exports', () => {
  it('defineScenario is exported from the package index', () => {
    expect(typeof defineScenarioFromIndex).toBe('function')
  })

  it('clearScenarios is exported from the package index', () => {
    expect(typeof clearFromIndex).toBe('function')
  })
})

describe("scenario: 'happy-path'", () => {
  it('generates a value that passes schema validation', () => {
    const schema = z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      age: z.number().int().min(0).max(120),
    })
    const result = generate(schema, { scenario: 'happy-path' })
    const validation = schema['~standard'].validate(result)
    if (validation instanceof Promise) throw new Error('expected sync')
    expect(validation.issues).toBeUndefined()
  })
})

describe('defineScenario — inheritance (extends)', () => {
  afterEach(() => clearScenarios())

  it('throws on circular extends chain', () => {
    defineScenario('cyclic', { extends: 'cyclic' })
    expect(() => generate(z.object({ name: z.string() }), { scenario: 'cyclic' })).toThrow(
      'circular extends chain',
    )
  })

  it('inherits base scenario behavior and applies overrides on top', () => {
    const schema = z.object({
      tags: z.array(z.string()),
      role: z.string(),
    })
    defineScenario('admin-empty', { extends: 'empty-state', role: 'admin' })
    const result = generate(schema, { scenario: 'admin-empty' }) as {
      tags: string[]
      role: string
    }
    expect(result.tags).toEqual([]) // from empty-state
    expect(result.role).toBe('admin') // from override
  })

  it('inherits from another user-defined scenario', () => {
    const schema = z.object({ active: z.boolean(), role: z.string() })
    defineScenario('base-case', { role: 'user' })
    defineScenario('admin-case', { extends: 'base-case', role: 'admin' })
    const result = generate(schema, { scenario: 'admin-case' }) as {
      active: boolean
      role: string
    }
    expect(result.role).toBe('admin')
    expect(typeof result.active).toBe('boolean')
  })

  it('no extends behaves as happy-path base when omitted', () => {
    const schema = z.object({ count: z.number().int().min(0).max(10) })
    defineScenario('zero-count', { count: 0 })
    const result = generate(schema, { scenario: 'zero-count' }) as { count: number }
    expect(result.count).toBe(0)
  })

  it('inheriting empty-state keeps optional fields absent', () => {
    const schema = z.object({ name: z.string(), bio: z.string().optional() })
    defineScenario('empty-extended', { extends: 'empty-state' })
    const result = generate(schema, { scenario: 'empty-extended' }) as {
      name: string
      bio?: string
    }
    expect(result.bio).toBeUndefined()
    expect('bio' in result).toBe(false)
    expect(Object.keys(result)).not.toContain('bio')
  })

  it('inheriting empty-state with non-optional overrides keeps optional fields absent', () => {
    const schema = z.object({
      name: z.string(),
      bio: z.string().optional(),
      tags: z.array(z.string()),
    })
    defineScenario('patch-empty', { extends: 'empty-state', tags: ['important'] })
    const result = generate(schema, { scenario: 'patch-empty' }) as {
      name: string
      bio?: string
      tags: string[]
    }
    expect(result.bio).toBeUndefined()
    expect('bio' in result).toBe(false)
    expect(result.tags).toEqual(['important'])
  })

  it('overrides with explicit undefined values do not become own properties', () => {
    const schema = z.object({ name: z.string(), bio: z.string().optional() })
    defineScenario('with-undef', { extends: 'empty-state', bio: undefined, name: 'fixed' })
    const result = generate(schema, { scenario: 'with-undef' }) as {
      name: string
      bio?: string
    }
    expect(result.name).toBe('fixed')
    expect('bio' in result).toBe(false)
    expect(Object.keys(result)).not.toContain('bio')
  })
})

describe('defineScenario + refine execution order', () => {
  afterEach(() => clearScenarios())

  it('refine sees scenario overrides applied', () => {
    const schema = z.object({ role: z.string(), permissions: z.array(z.string()) })
    defineScenario('admin', { role: 'admin' })
    const result = generate(schema, {
      scenario: 'admin',
      refine: (obj) => ({
        permissions: obj.role === 'admin' ? ['read', 'write', 'delete'] : ['read'],
      }),
    }) as { role: string; permissions: string[] }
    expect(result.role).toBe('admin')
    expect(result.permissions).toEqual(['read', 'write', 'delete'])
  })

  it('refine sees scenario factory output', () => {
    const schema = z.object({ plan: z.string(), maxUsers: z.number().int() })
    defineScenario('premium', () => ({ plan: 'premium', maxUsers: 0 }))
    const result = generate(schema, {
      scenario: 'premium',
      refine: (obj) => ({
        maxUsers: obj.plan === 'premium' ? 100 : 10,
      }),
    }) as { plan: string; maxUsers: number }
    expect(result.plan).toBe('premium')
    expect(result.maxUsers).toBe(100)
  })

  it('refine works with extends chain — sees accumulated patches', () => {
    const schema = z.object({ role: z.string(), level: z.number().int(), label: z.string() })
    defineScenario('base-user', { role: 'user', level: 1 })
    defineScenario('vip-user', { extends: 'base-user', level: 2 })
    const result = generate(schema, {
      scenario: 'vip-user',
      refine: (obj) => ({
        label: `${obj.role}-${obj.level}`,
      }),
    }) as { role: string; level: number; label: string }
    expect(result.label).toBe('user-2')
  })

  it('refine sees both options.overrides and scenario overrides', () => {
    const schema = z.object({ role: z.string(), region: z.string(), label: z.string() })
    defineScenario('admin', { role: 'admin' })
    const result = generate(schema, {
      scenario: 'admin',
      overrides: { region: 'us-east' },
      refine: (obj) => ({
        label: `${obj.role}-${obj.region}`,
      }),
    }) as { role: string; region: string; label: string }
    expect(result.label).toBe('admin-us-east')
  })

  it('scenario + refine — refine runs exactly once', () => {
    const schema = z.object({ name: z.string() })
    let callCount = 0
    defineScenario('simple', { name: 'fixed' })
    generate(schema, {
      scenario: 'simple',
      refine: () => {
        callCount++
        return {}
      },
    })
    expect(callCount).toBe(1)
  })

  it('scenario without refine still works (no regression)', () => {
    const schema = z.object({ role: z.string() })
    defineScenario('reader', { role: 'reader' })
    const result = generate(schema, { scenario: 'reader' }) as { role: string }
    expect(result.role).toBe('reader')
  })

  it('inheriting scenario without refine still works (no regression)', () => {
    const schema = z.object({ role: z.string(), active: z.boolean() })
    defineScenario('base', { role: 'user' })
    defineScenario('extended', { extends: 'base', active: true })
    const result = generate(schema, { scenario: 'extended' }) as {
      role: string
      active: boolean
    }
    expect(result.role).toBe('user')
    expect(result.active).toBe(true)
  })
})
