# Relational generation

`generateRelational` builds multiple record sets at once and wires child records to **real** parent keys, so foreign keys actually resolve.

## Basic example

```ts
import { generateRelational } from 'fixture-gen'
import { z } from 'zod'

const User = z.object({
  id: z.string().uuid(),
  name: z.string(),
})

const Post = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
})

const { users, posts } = generateRelational(
  { users: User, posts: Post },
  {
    seed: 42,
    counts: { users: 3, posts: 10 },
    relations: {
      'posts.userId': 'users.id', // every post.userId is one of the generated users[].id
    },
  },
)

// posts.every(p => users.some(u => u.id === p.userId)) === true ✅
```

## Options

```ts
interface RelationalOptions<S> {
  seed?: number
  /** How many records to generate per schema key. */
  counts: { [K in keyof S]?: number }
  /** Map `"childTable.field": "parentTable.field"` to link foreign keys. */
  relations?: Record<string, string>
  /** Named scenario applied to all tables during generation. */
  scenario?: BuiltinScenario | string
  /** Post-generation hooks: each receives the full row set and may mutate records. */
  rules?: Array<(tables: Record<string, unknown[]>) => void>
}
```

## Relations map

Keys and values use `"table.field"` paths:

```ts
relations: {
  'posts.userId': 'users.id',
  'comments.postId': 'posts.id',
  'comments.authorId': 'users.id',
}
```

Children are linked after parents exist, so every FK points at a generated parent value.

## Business rules

After FK linking, run cross-table invariants with `rules`:

```ts
const { users, invoices } = generateRelational(
  { users: UserSchema, invoices: InvoiceSchema },
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

Multiple rules apply in order. See [Advanced constraints](/guide/advanced-constraints) for uniqueness and `refine`.

## Return type

```ts
function generateRelational<S extends Record<string, StandardSchemaV1>>(
  schemas: S,
  options: RelationalOptions<S>,
): { [K in keyof S]: InferOutput<S[K]>[] }
```

Keys of the returned object match the keys you passed in `schemas`.
