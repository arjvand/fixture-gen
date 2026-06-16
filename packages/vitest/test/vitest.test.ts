import { Type } from '@sinclair/typebox'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
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

  it('reset() between consecutive resets works', () => {
    const factory = fixtureFactory(UserSchema, { seed: 0 })
    const first = factory()
    factory.reset()
    factory.reset()
    const second = factory()
    expect(second).toEqual(first)
  })

  it('generate() method delegates to the callable', () => {
    const factory = fixtureFactory(UserSchema)
    const viaCall = factory()
    factory.reset()
    const viaMethod = factory.generate()
    expect(viaMethod).toEqual(viaCall)
  })

  it('accepts overrides that merge with base overrides', () => {
    const factory = fixtureFactory(UserSchema, { seed: 1 })
    const user = factory({ name: 'Alice' })
    expect(user.name).toBe('Alice')
  })

  it('per-call overrides take precedence over base overrides', () => {
    const factory = fixtureFactory(UserSchema, { seed: 1, overrides: { name: 'Bob' } })
    const user = factory({ name: 'Alice' })
    expect(user.name).toBe('Alice')
  })

  it('works with a custom seed', () => {
    const factory = fixtureFactory(UserSchema, { seed: 99 })
    const a = factory()
    factory.reset()
    const b = factory()
    expect(a).toEqual(b)
  })

  it('works with Valibot schemas', () => {
    const ValibotUser = v.object({
      id: v.pipe(v.string(), v.uuid()),
      name: v.pipe(v.string()),
      age: v.pipe(v.number(), v.integer(), v.minValue(18), v.maxValue(99)),
    })
    const factory = fixtureFactory(ValibotUser)
    const user = factory()
    expect(typeof user.name).toBe('string')
  })

  it('works with TypeBox schemas', () => {
    const TypeBoxUser = Type.Object({
      id: Type.String({ format: 'uuid' }),
      name: Type.String(),
      age: Type.Integer({ minimum: 18, maximum: 99 }),
    })
    const factory = fixtureFactory(TypeBoxUser)
    const user = factory() as Record<string, unknown>
    expect(typeof user.name).toBe('string')
  })

  it('passes base options like generators through to generate', () => {
    const factory = fixtureFactory(UserSchema, {
      seed: 7,
      generators: {
        name: () => 'fixed-name',
      },
    })
    const user = factory()
    expect(user.name).toBe('fixed-name')
  })

  it('returns a fixture compatible with the schema', () => {
    const factory = fixtureFactory(UserSchema, { seed: 42 })
    const user = factory()
    const parsed = UserSchema.safeParse(user)
    expect(parsed.success).toBe(true)
  })
})

describe('autoReset', () => {
  it('accepts a fixture factory and registers a beforeEach hook', () => {
    const factory = fixtureFactory(UserSchema)
    expect(() => autoReset(factory)).not.toThrow()
  })
})
