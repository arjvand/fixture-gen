# Advanced constraints

When uniqueness or cross-field rules matter — unique emails across a batch, multi-field invariants, or business rules that span related tables.

**When to use this:** DB-like uniqueness, `endDate >= startDate` style refine logic, or free-plan invoices that must have `amount: 0` after relational generation.

---

## Array uniqueness (`uniqueItems`)

When a schema marks an array as containing unique items — via TypeBox's `uniqueItems: true` or a Zod `z.set()` — `fixture-gen` automatically deduplicates generated items.

```ts
import { Type } from '@sinclair/typebox'
import { generate } from 'fixture-gen'

const schema = Type.Array(Type.String(), { uniqueItems: true, minItems: 5 })
const tags = generate(schema) as string[]
// tags has no repeated values
```

```ts
import { z } from 'zod'
import { generate } from 'fixture-gen'

const tagSet = z.set(z.string())
const result = generate(tagSet) as string[] // unique strings
```

---

## Cross-record uniqueness (`unique` in `generateMany`)

Pass `unique: ['fieldPath']` to ensure a field is distinct across every record `generateMany` produces. Dot notation accesses nested fields.

```ts
import { z } from 'zod'
import { generateMany } from 'fixture-gen'

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
})

// 1000 users, no two share an email
const users = generateMany(UserSchema, 1000, { seed: 42, unique: ['email'] })
```

Multiple fields can be listed; each is independently unique:

```ts
generateMany(UserSchema, 500, { seed: 0, unique: ['id', 'email'] })
```

Nested paths:

```ts
const records = generateMany(schema, 20, { unique: ['user.email'] })
```

`generateMany` retries internally (up to 20× `count` attempts) and throws if it cannot satisfy uniqueness — typically a sign the field's value space is too small for the requested count.

---

## Cross-field constraints (`refine` hook)

The `refine` hook runs after each record is generated. It receives the complete record and may return field overrides to enforce invariants that span multiple fields.

```ts
import { z } from 'zod'
import { generate, generateMany } from 'fixture-gen'

const ProductSchema = z.object({
  price: z.number().min(1).max(500),
  discountedPrice: z.number().min(0).max(500),
})

const product = generate(ProductSchema, {
  seed: 1,
  refine: (r) => {
    if (r.discountedPrice >= r.price) {
      return { discountedPrice: r.price * 0.8 }
    }
  },
})
```

`refine` also applies to every record in `generateMany`:

```ts
const products = generateMany(ProductSchema, 100, {
  seed: 1,
  refine: (r) => {
    if (r.discountedPrice >= r.price) return { discountedPrice: r.price * 0.8 }
  },
})
```

`refine` is composable with `unique`, `overrides`, `scenario`, and custom `generators`.

---

## Business-rule hooks (`rules` in `generateRelational`)

`generateRelational` accepts a `rules` array of post-generation hooks. Each hook receives the full row map and may mutate records to enforce cross-table invariants.

```ts
import { z } from 'zod'
import { generateRelational } from 'fixture-gen'

const User = z.object({ id: z.string().uuid(), plan: z.enum(['free', 'pro']) })
const Invoice = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().min(0),
})

const { users, invoices } = generateRelational(
  { users: User, invoices: Invoice },
  {
    seed: 1,
    counts: { users: 10, invoices: 50 },
    relations: { 'invoices.userId': 'users.id' },
    rules: [
      (tables) => {
        const freeIds = new Set(
          (tables.users as Array<{ id: string; plan: string }>)
            .filter((u) => u.plan === 'free')
            .map((u) => u.id),
        )
        for (const inv of tables.invoices as Array<{ userId: string; amount: number }>) {
          if (freeIds.has(inv.userId)) inv.amount = 0
        }
      },
    ],
  },
)
```

Multiple rules are applied in order. Rules run after all FK relations are resolved, so parent IDs are available.

---

## Boundary scenarios + `refine`

`refine` applies after boundary scenario generation, so cross-field invariants hold at boundary values:

```ts
const record = generate(ProductSchema, {
  scenario: 'boundary-min',
  refine: (r) => {
    if (r.discountedPrice >= r.price) return { discountedPrice: r.price * 0.5 }
  },
})
```
