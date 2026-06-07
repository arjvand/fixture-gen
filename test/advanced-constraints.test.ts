import { Type } from '@sinclair/typebox'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generate, generateMany, generateRelational } from '../src/index'
import type { StandardSchemaV1 } from '../src/standard'

const validates = (schema: StandardSchemaV1, value: unknown): boolean => {
  const result = schema['~standard'].validate(value)
  if (result instanceof Promise) throw new Error('expected synchronous validation')
  return result.issues === undefined
}

// ── Array uniqueItems ─────────────────────────────────────────────────────────

describe('array uniqueItems — TypeBox', () => {
  it('generates deduplicated items for uniqueItems:true array', () => {
    const schema = Type.Array(Type.String(), { uniqueItems: true, minItems: 5 })
    const arr = generate(schema) as string[]
    expect(arr.length).toBeGreaterThanOrEqual(5)
    expect(new Set(arr).size).toBe(arr.length)
  })

  it('generates a normal array without uniqueItems', () => {
    const schema = Type.Array(Type.String({ minLength: 1, maxLength: 3 }), {
      minItems: 3,
      maxItems: 3,
    })
    const arr = generate(schema)
    expect(Array.isArray(arr)).toBe(true)
  })
})

describe('array uniqueItems — Zod Set', () => {
  it('z.set() generates a Set instance with unique items', () => {
    const schema = z.set(z.string().min(2).max(6))
    const result = generate(schema)
    expect(result instanceof Set).toBe(true)
    expect(result.size).toBeGreaterThan(0)
  })
})

// ── generateMany unique option ────────────────────────────────────────────────

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(18).max(90),
})

describe('generateMany — unique option', () => {
  it('produces distinct email values across 100 records', () => {
    const records = generateMany(UserSchema, 100, { seed: 1, unique: ['email'] })
    expect(records).toHaveLength(100)
    const emails = records.map((r) => (r as { email: string }).email)
    expect(new Set(emails).size).toBe(100)
  })

  it('produces distinct email values across 1000 records', () => {
    const records = generateMany(UserSchema, 1000, { seed: 42, unique: ['email'] })
    expect(records).toHaveLength(1000)
    const emails = records.map((r) => (r as { email: string }).email)
    expect(new Set(emails).size).toBe(1000)
    for (const r of records) expect(validates(UserSchema, r)).toBe(true)
  })

  it('produces distinct UUID ids across 100 records', () => {
    const records = generateMany(UserSchema, 100, { seed: 0, unique: ['id'] })
    const ids = records.map((r) => (r as { id: string }).id)
    expect(new Set(ids).size).toBe(100)
  })

  it('is deterministic for the same seed', () => {
    const a = generateMany(UserSchema, 10, { seed: 7, unique: ['email'] })
    const b = generateMany(UserSchema, 10, { seed: 7, unique: ['email'] })
    expect(a).toEqual(b)
  })

  it('all generated records still validate against schema', () => {
    const records = generateMany(UserSchema, 50, { seed: 3, unique: ['email'] })
    for (const r of records) {
      expect(validates(UserSchema, r)).toBe(true)
    }
  })

  it('supports unique on nested field paths', () => {
    const schema = z.object({ user: z.object({ email: z.string().email() }) })
    const records = generateMany(schema, 20, { seed: 1, unique: ['user.email'] })
    const emails = records.map((r) => (r as { user: { email: string } }).user.email)
    expect(new Set(emails).size).toBe(20)
  })

  it('works without unique option (fast path unchanged)', () => {
    const records = generateMany(UserSchema, 5, { seed: 0 })
    expect(records).toHaveLength(5)
    for (const r of records) expect(validates(UserSchema, r)).toBe(true)
  })
})

// ── refine hook ───────────────────────────────────────────────────────────────

const ProductSchema = z.object({
  price: z.number().min(1).max(1000),
  discountedPrice: z.number().min(0).max(1000),
  inStock: z.boolean(),
  stockCount: z.number().int().min(0).max(500),
})

describe('generate — refine hook', () => {
  it('enforces cross-field invariant: discountedPrice < price', () => {
    const record = generate(ProductSchema, {
      seed: 1,
      refine: (r) => {
        if (r.discountedPrice >= r.price) {
          return { discountedPrice: r.price * 0.8 }
        }
      },
    })
    expect(record.discountedPrice).toBeLessThan(record.price)
  })

  it('enforces stockCount=0 when inStock=false', () => {
    // Use overrides to guarantee inStock=false so the refine assertion always runs
    const record = generate(ProductSchema, {
      seed: 5,
      overrides: { inStock: false },
      refine: (r) => {
        if (!r.inStock) return { stockCount: 0 }
      },
    })
    expect(record.inStock).toBe(false)
    expect(record.stockCount).toBe(0)
  })

  it('refine hook returning void leaves record unchanged', () => {
    const base = generate(ProductSchema, { seed: 2 })
    const withNoop = generate(ProductSchema, { seed: 2, refine: () => undefined })
    expect(base).toEqual(withNoop)
  })

  it('refine applies across all records in generateMany', () => {
    const records = generateMany(ProductSchema, 20, {
      seed: 1,
      refine: (r) => {
        if (r.discountedPrice >= r.price) {
          return { discountedPrice: r.price * 0.8 }
        }
      },
    })
    expect(records).toHaveLength(20)
    for (const r of records) {
      expect(r.discountedPrice).toBeLessThan(r.price)
    }
  })

  it('refine combined with unique works correctly', () => {
    const schema = z.object({ email: z.string().email(), role: z.enum(['admin', 'user']) })
    const records = generateMany(schema, 20, {
      seed: 1,
      unique: ['email'],
      refine: () => ({ role: 'user' as const }),
    }) as Array<{ email: string; role: string }>
    const emails = records.map((r) => r.email)
    expect(new Set(emails).size).toBe(20)
    for (const r of records) expect(r.role).toBe('user')
  })
})

// ── refine + boundary scenarios ───────────────────────────────────────────────

describe('refine hook — boundary scenario integration', () => {
  it('refine applies after boundary-min generation', () => {
    const record = generate(ProductSchema, {
      seed: 1,
      scenario: 'boundary-min',
      refine: (r) => ({ discountedPrice: r.price * 0.5 }),
    })
    expect(record.discountedPrice).toBe(record.price * 0.5)
  })
})

// ── generateRelational rules hooks ───────────────────────────────────────────

const OrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  total: z.number().min(0).max(10000),
  status: z.enum(['pending', 'paid', 'cancelled']),
})

describe('generateRelational — rules hooks', () => {
  it('rule hook can mutate records post-generation', () => {
    const result = generateRelational(
      { users: UserSchema, orders: OrderSchema },
      {
        seed: 1,
        counts: { users: 3, orders: 10 },
        relations: { 'orders.userId': 'users.id' },
        rules: [
          (tables) => {
            const orders = tables.orders as Array<{ status: string }>
            for (const order of orders) order.status = 'paid'
          },
        ],
      },
    )
    const orders = result.orders as Array<{ status: string }>
    expect(orders.every((o) => o.status === 'paid')).toBe(true)
  })

  it('rule hook can enforce cross-table invariant', () => {
    let violations = 0
    const result = generateRelational(
      { users: UserSchema, orders: OrderSchema },
      {
        seed: 2,
        counts: { users: 3, orders: 9 },
        relations: { 'orders.userId': 'users.id' },
        rules: [
          (tables) => {
            const userIds = new Set((tables.users as Array<{ id: string }>).map((u) => u.id))
            const orders = tables.orders as Array<{ userId: string }>
            for (const order of orders) {
              if (!userIds.has(order.userId)) violations++
            }
          },
        ],
      },
    )
    expect(result.orders).toHaveLength(9)
    expect(violations).toBe(0)
  })

  it('empty rules array is a no-op', () => {
    const a = generateRelational(
      { users: UserSchema },
      { seed: 1, counts: { users: 3 }, rules: [] },
    )
    const b = generateRelational({ users: UserSchema }, { seed: 1, counts: { users: 3 } })
    expect(a).toEqual(b)
  })

  it('multiple rules are applied in order', () => {
    const calls: number[] = []
    generateRelational(
      { users: UserSchema },
      {
        seed: 1,
        counts: { users: 2 },
        rules: [
          () => {
            calls.push(1)
          },
          () => {
            calls.push(2)
          },
        ],
      },
    )
    expect(calls).toEqual([1, 2])
  })
})
