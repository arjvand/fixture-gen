import { beforeEach, describe, expect, it } from '@jest/globals'
import { z } from 'zod'
import { autoReset, fixtureFactory } from '../src/index'

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  age: z.number().int().min(18).max(99),
})

type User = z.infer<typeof UserSchema>

describe('fixtureFactory', () => {
  it('returns a callable function with generate and reset methods', () => {
    const factory = fixtureFactory(UserSchema)
    expect(typeof factory).toBe('function')
    expect(typeof factory.generate).toBe('function')
    expect(typeof factory.reset).toBe('function')
  })

  it('generates a valid fixture', () => {
    const factory = fixtureFactory(UserSchema)
    const user = factory()
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('name')
    expect(user).toHaveProperty('age')
    expect(typeof user.id).toBe('string')
    expect(typeof user.name).toBe('string')
    expect(typeof user.age).toBe('number')
  })

  it('produces different output on consecutive calls', () => {
    const factory = fixtureFactory(UserSchema)
    const a = factory()
    const b = factory()
    expect(a).not.toEqual(b)
  })

  it('reset() restores the initial seed — next call matches first', () => {
    const factory = fixtureFactory(UserSchema, { seed: 42 })
    const first = factory()
    factory.reset()
    const second = factory()
    expect(second).toEqual(first)
  })

  it('same base seed yields identical first-call output across factories', () => {
    const factoryA = fixtureFactory(UserSchema, { seed: 42 })
    const factoryB = fixtureFactory(UserSchema, { seed: 42 })
    expect(factoryA()).toEqual(factoryB())
  })

  it('accepts per-invocation overrides', () => {
    const factory = fixtureFactory(UserSchema, { seed: 1 })
    const user = factory({ name: 'Alice' })
    expect(user.name).toBe('Alice')
  })

  it('.generate() behaves identically to calling the factory', () => {
    const factory = fixtureFactory(UserSchema)
    const viaCall = factory()
    factory.reset()
    const viaMethod = factory.generate()
    expect(viaMethod).toEqual(viaCall)
  })

  it('per-call overrides take precedence over base overrides', () => {
    const factory = fixtureFactory(UserSchema, {
      seed: 1,
      overrides: { name: 'Bob' },
    })
    const user = factory({ name: 'Alice' })
    expect(user.name).toBe('Alice')
  })
})

describe('autoReset', () => {
  it('is a function that accepts a fixture factory', () => {
    expect(typeof autoReset).toBe('function')
  })
})

describe('autoReset behavior', () => {
  const factory = fixtureFactory(UserSchema, { seed: 42 })
  autoReset(factory)
  let firstResult: User

  it('resets the factory seed before the test', () => {
    firstResult = factory()
    expect(firstResult).toBeDefined()
  })

  it('produces identical output after autoReset resets the seed', () => {
    const result = factory()
    expect(result).toEqual(firstResult)
  })
})
