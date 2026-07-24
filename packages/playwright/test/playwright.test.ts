import { Type } from '@sinclair/typebox'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createFactory, factoryFixture, fixtureFactory } from '../src/index'
import type { FixtureFactory, PlaywrightFixtureFn } from '../src/index'

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  age: z.number().int().min(18).max(99),
})

type User = z.infer<typeof UserSchema>

/** Invoke a Playwright-style fixture and return the value passed to `use`. */
async function runFixture<T>(
  fixture: PlaywrightFixtureFn<T>,
  testInfo?: { workerIndex?: number; parallelIndex?: number },
): Promise<T> {
  let value: T | undefined
  await fixture(
    {},
    async (v) => {
      value = v
    },
    testInfo,
  )
  if (value === undefined) throw new Error('fixture did not call use()')
  return value
}

describe('fixtureFactory', () => {
  it('returns an async fixture function', () => {
    const fixture = fixtureFactory(UserSchema)
    expect(typeof fixture).toBe('function')
  })

  it('generates a valid fixture via use()', async () => {
    const user = await runFixture(fixtureFactory(UserSchema, { seed: 1 }))
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('name')
    expect(user).toHaveProperty('age')
    expect(typeof user.id).toBe('string')
    expect(typeof user.name).toBe('string')
    expect(typeof user.age).toBe('number')
  })

  it('same seed yields identical output', async () => {
    const a = await runFixture(fixtureFactory(UserSchema, { seed: 42 }))
    const b = await runFixture(fixtureFactory(UserSchema, { seed: 42 }))
    expect(a).toEqual(b)
  })

  it('different seeds yield different output', async () => {
    const a = await runFixture(fixtureFactory(UserSchema, { seed: 1 }))
    const b = await runFixture(fixtureFactory(UserSchema, { seed: 2 }))
    expect(a).not.toEqual(b)
  })

  it('passes base overrides through to generate', async () => {
    const user = await runFixture(
      fixtureFactory(UserSchema, { seed: 1, overrides: { name: 'Alice' } }),
    )
    expect(user.name).toBe('Alice')
  })

  it('passes generators through to generate', async () => {
    const user = await runFixture(
      fixtureFactory(UserSchema, {
        seed: 7,
        generators: { name: () => 'fixed-name' },
      }),
    )
    expect(user.name).toBe('fixed-name')
  })

  it('returns a fixture compatible with the schema', async () => {
    const user = await runFixture(fixtureFactory(UserSchema, { seed: 42 }))
    const parsed = UserSchema.safeParse(user)
    expect(parsed.success).toBe(true)
  })

  it('isolateWorkers offsets seed by workerIndex * 1_000_003', async () => {
    const base = await runFixture(fixtureFactory(UserSchema, { seed: 0, isolateWorkers: true }), {
      workerIndex: 0,
    })
    const worker1 = await runFixture(
      fixtureFactory(UserSchema, { seed: 0, isolateWorkers: true }),
      { workerIndex: 1 },
    )
    const expectedWorker1 = await runFixture(fixtureFactory(UserSchema, { seed: 1_000_003 }))
    expect(base).not.toEqual(worker1)
    expect(worker1).toEqual(expectedWorker1)
  })

  it('isolateWorkers defaults workerIndex to 0 when testInfo is missing', async () => {
    const withInfo = await runFixture(
      fixtureFactory(UserSchema, { seed: 5, isolateWorkers: true }),
      { workerIndex: 0 },
    )
    const withoutInfo = await runFixture(
      fixtureFactory(UserSchema, { seed: 5, isolateWorkers: true }),
    )
    expect(withoutInfo).toEqual(withInfo)
  })

  it('ignores workerIndex when isolateWorkers is false', async () => {
    const a = await runFixture(fixtureFactory(UserSchema, { seed: 9 }), {
      workerIndex: 3,
    })
    const b = await runFixture(fixtureFactory(UserSchema, { seed: 9 }), {
      workerIndex: 0,
    })
    expect(a).toEqual(b)
  })
})

describe('factoryFixture', () => {
  it('injects a callable factory with generate and reset', async () => {
    const factory = await runFixture(factoryFixture(UserSchema, { seed: 1 }))
    expect(typeof factory).toBe('function')
    expect(typeof factory.generate).toBe('function')
    expect(typeof factory.reset).toBe('function')
  })

  it('consecutive calls produce different fixtures', async () => {
    const factory = await runFixture(factoryFixture(UserSchema, { seed: 1 }))
    const a = factory()
    const b = factory()
    expect(a).not.toEqual(b)
  })

  it('reset() restores the initial seed sequence', async () => {
    const factory = await runFixture(factoryFixture(UserSchema, { seed: 42 }))
    const first = factory()
    factory.reset()
    const second = factory()
    expect(second).toEqual(first)
  })

  it('accepts per-invocation overrides', async () => {
    const factory = await runFixture(factoryFixture(UserSchema, { seed: 1 }))
    const user = factory({ name: 'Alice' })
    expect(user.name).toBe('Alice')
  })

  it('per-call overrides take precedence over base overrides', async () => {
    const factory = await runFixture(
      factoryFixture(UserSchema, {
        seed: 1,
        overrides: { name: 'Bob' },
      }),
    )
    const user = factory({ name: 'Alice' })
    expect(user.name).toBe('Alice')
  })

  it('.generate() behaves identically to calling the factory', async () => {
    const factory = await runFixture(factoryFixture(UserSchema, { seed: 3 }))
    const viaCall = factory()
    factory.reset()
    const viaMethod = factory.generate()
    expect(viaMethod).toEqual(viaCall)
  })

  it('provides a fresh factory (counter at 0) on each fixture invocation', async () => {
    const fixture = factoryFixture(UserSchema, { seed: 10 })
    const first = await runFixture(fixture)
    first()
    first()
    const second = await runFixture(fixture)
    // Each fixture invocation gets its own counter starting at 0
    first.reset()
    expect(second()).toEqual(first())
  })

  it('isolateWorkers applies to the factory base seed', async () => {
    const factory = await runFixture(
      factoryFixture(UserSchema, { seed: 0, isolateWorkers: true }),
      { workerIndex: 1 },
    )
    const expected = createFactory(UserSchema, { seed: 1_000_003 })
    expect(factory()).toEqual(expected())
  })
})

describe('createFactory', () => {
  it('returns a callable function with generate and reset methods', () => {
    const factory = createFactory(UserSchema)
    expect(typeof factory).toBe('function')
    expect(typeof factory.generate).toBe('function')
    expect(typeof factory.reset).toBe('function')
  })

  it('generates a valid fixture', () => {
    const factory = createFactory(UserSchema)
    const user = factory()
    expect(typeof user.id).toBe('string')
    expect(typeof user.name).toBe('string')
    expect(typeof user.age).toBe('number')
  })

  it('produces different output on consecutive calls', () => {
    const factory = createFactory(UserSchema)
    expect(factory()).not.toEqual(factory())
  })

  it('reset() restores the initial seed — next call matches first', () => {
    const factory = createFactory(UserSchema, { seed: 42 })
    const first = factory()
    factory.reset()
    expect(factory()).toEqual(first)
  })

  it('same base seed yields identical first-call output across factories', () => {
    const a = createFactory(UserSchema, { seed: 42 })
    const b = createFactory(UserSchema, { seed: 42 })
    expect(a()).toEqual(b())
  })

  it('accepts per-invocation overrides', () => {
    const factory = createFactory(UserSchema, { seed: 1 })
    expect(factory({ name: 'Alice' }).name).toBe('Alice')
  })

  it('per-call overrides take precedence over base overrides', () => {
    const factory = createFactory(UserSchema, {
      seed: 1,
      overrides: { name: 'Bob' },
    })
    expect(factory({ name: 'Alice' }).name).toBe('Alice')
  })

  it('.generate() behaves identically to calling the factory', () => {
    const factory = createFactory(UserSchema)
    const viaCall = factory()
    factory.reset()
    expect(factory.generate()).toEqual(viaCall)
  })

  it('works with Valibot schemas', () => {
    const ValibotUser = v.object({
      id: v.pipe(v.string(), v.uuid()),
      name: v.pipe(v.string()),
      age: v.pipe(v.number(), v.integer(), v.minValue(18), v.maxValue(99)),
    })
    const factory = createFactory(ValibotUser)
    const user = factory()
    expect(typeof user.name).toBe('string')
  })

  it('works with TypeBox schemas', () => {
    const TypeBoxUser = Type.Object({
      id: Type.String({ format: 'uuid' }),
      name: Type.String(),
      age: Type.Integer({ minimum: 18, maximum: 99 }),
    })
    const factory = createFactory(TypeBoxUser)
    const user = factory() as Record<string, unknown>
    expect(typeof user.name).toBe('string')
  })

  it('is typed as FixtureFactory when assigned', () => {
    const factory: FixtureFactory<User> = createFactory(UserSchema, { seed: 1 })
    const user: User = factory()
    expect(user.age).toBeGreaterThanOrEqual(18)
  })
})
