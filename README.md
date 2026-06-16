# fixture-gen

> Generate deterministic, schema-valid fixtures from your existing TypeScript validators.

[![npm version](https://img.shields.io/npm/v/fixture-gen.svg)](https://www.npmjs.com/package/fixture-gen)
[![bundle size](https://img.shields.io/bundlephobia/minzip/fixture-gen)](https://bundlephobia.com/package/fixture-gen)
[![CI](https://img.shields.io/github/actions/workflow/status/arjvand/fixture-gen/ci.yml)](https://github.com/arjvand/fixture-gen/actions)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

Make tests easier to trust: point `fixture-gen` at a schema and get reproducible data that already satisfies it—no hand-written factories, no adapter code.

```ts
// Before: brittle manual fixture that drifts from the schema
const user = {
  id: '2b8f1c6e-6f90-4c52-9c83-0d9f2f4cf5c9',
  name: 'John',
  email: 'john@example.com',
  role: 'admin',
  profile: { avatarUrl: null }, // schema now requires a string
}

test('shows the admin badge', () => {
  render(<UserCard user={user} />)
  expect(screen.getByText('Admin')).toBeInTheDocument()
})

// After: the same test, with a schema-derived fixture in one line
test('shows the admin badge', () => {
  const user = generate(UserSchema, { seed: 42, overrides: { role: 'admin' } })
  render(<UserCard user={user} />)
  expect(screen.getByText('Admin')).toBeInTheDocument()
})
```

Built on Standard Schema, it works with Zod, Valibot, ArkType, and TypeBox through the same API.

## Features

- **🔌 Standard Schema native** — works with Zod, Valibot, and ArkType through the shared `~standard` interface, and understands TypeBox schemas directly. No adapter code for *you* to write — point it at your existing schemas.
- **🎲 Seeded determinism** — pass a `seed` and the same schema always produces the same data, so snapshots and assertions stay stable across runs and machines.
- **🔗 Relational generation** — generate connected record sets where child rows reference real parent keys (matching foreign keys across tables).
- **🧰 Custom generators** — pin exact fields with `overrides`, or compute field and schema-wide values with deterministic hooks.
- **🪶 Minimal runtime** — pure TypeScript, zero binary dependencies. Runs on Node.js, Bun, Deno, and edge runtimes.
- **🎭 Scenario-first** — named, intent-bearing test cases: `happy-path`, `empty-state`, `boundary-min`, `boundary-max`, `invalid`, `missing-subtree`. Define project-specific cases with `defineScenario`.
- **🔒 Advanced constraints** — schema-wide uniqueness (`unique: ['email']`), cross-field invariants (`refine`), and business-rule hooks (`rules`) across `generateMany` / `generateRelational`.
- **🧩 Fully typed** — output is inferred from your schema, so fixtures match the types you already validate against.

**Planned** (see [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full post-1.0 plan):

- **🔧 Ecosystem plugins** _(Phase 11)_ — `@fixture-gen/vitest`, `@fixture-gen/jest`, `@fixture-gen/playwright`, `@fixture-gen/db` (Prisma + Drizzle)

## Install

```bash
npm install -D fixture-gen
# pnpm add -D fixture-gen
# yarn add -D fixture-gen
# bun add -d fixture-gen
```

Deno:

```ts
import { generate } from 'npm:fixture-gen'
```

## Quick start

```ts
import { generate } from 'fixture-gen'
import { z } from 'zod'

const User = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(18).max(99),
})

const user = generate(User, { seed: 42 })
// {
//   id: '1f8c...-uuid',
//   name: 'Felicia Bartell',
//   email: 'orval.kihn@example.com',
//   age: 37,
// }
```

Because `fixture-gen` only depends on the Standard Schema interface, the **exact same call** works with any compliant validator:

```ts
import * as v from 'valibot'
import { generate } from 'fixture-gen'

const User = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.string(),
})

const user = generate(User, { seed: 42 }) // ✅ no adapter needed
```

```ts
import { type } from 'arktype'
import { generate } from 'fixture-gen'

const User = type({ id: 'string.uuid', name: 'string' })

const user = generate(User, { seed: 42 }) // ✅ works the same
```

## Real-world usage

### React component test (Vitest + Testing Library)

```ts
import { render, screen } from '@testing-library/react'
import { generate } from 'fixture-gen'
import { UserSchema } from './schemas'
import { UserCard } from './UserCard'

test('renders user name', () => {
  const user = generate(UserSchema, { seed: 1 })
  render(<UserCard user={user} />)
  expect(screen.getByText(user.name)).toBeInTheDocument()
})
```

### API handler test

```ts
import { generate } from 'fixture-gen'
import { UserSchema } from './schemas'
import { createUser } from './api'

test('creates a user', async () => {
  const payload = generate(UserSchema, { seed: 1 })
  const result = await createUser(payload)
  expect(result.id).toBeDefined()
})
```

### Storybook story

```ts
import { generate } from 'fixture-gen'
import { UserSchema } from './schemas'
import { UserCard } from './UserCard'

export const Default = {
  args: {
    user: generate(UserSchema, { seed: 1 }),
  },
}

export const Admin = {
  args: {
    user: generate(UserSchema, { seed: 1, overrides: { role: 'admin' } }),
  },
}
```

## Deterministic generation

The same `seed` always yields identical output — ideal for snapshot tests and reproducible CI:

```ts
const a = generate(User, { seed: 7 })
const b = generate(User, { seed: 7 })
// a deep-equals b  ✅

const c = generate(User, { seed: 8 })
// c differs from a ✅
```

Need a batch? Use `generateMany`:

```ts
import { generateMany } from 'fixture-gen'

const users = generateMany(User, 10, { seed: 42 })
// User[] of length 10, deterministic for the given seed
```

Override specific fields when a test needs a known value:

```ts
const admin = generate(User, {
  seed: 42,
  overrides: { name: 'Ada Lovelace', age: 36 },
})
```

Use custom generators when a field needs a computed value instead of a fixed one:

```ts
const user = generate(User, {
  seed: 42,
  generators: {
    'profile.slug': ({ prng }) => `slug-${prng.string(6)}`,
  },
  generator: ({ node, pathKey }) => {
    if (node.kind === 'string' && pathKey === 'tag') return 'schema-wide'
    return undefined
  },
})
```

## Scenario-first generation

Pass a `scenario` to get named, intent-bearing test data instead of random values:

```ts
import { generate, generateMany, defineScenario } from 'fixture-gen'

// Built-in scenarios
generate(User, { scenario: 'happy-path' })      // valid, representative data
generate(User, { scenario: 'empty-state' })     // optionals absent, arrays []
generate(User, { scenario: 'boundary-min' })    // numbers/strings at min constraints
generate(User, { scenario: 'boundary-max' })    // numbers/strings at max constraints
generate(User, { scenario: 'invalid' })         // wrong-type root — fails validation
generate(User, { scenario: 'missing-subtree' }) // nested objects → null
```

Define project-specific cases with `defineScenario`:

```ts
// Overrides object
defineScenario('admin-user', { role: 'admin', active: true })

// Factory function
defineScenario<User>('premium-user', (value) => ({ ...value, plan: 'premium' }))

// Inherit from a built-in, then patch
defineScenario('empty-admin', { extends: 'empty-state', role: 'admin' })
```

Scenarios propagate through `generateMany` and `generateRelational`. See [`docs/scenarios.md`](./docs/scenarios.md) for the full guide.

## Relational generation

`generateRelational` builds multiple record sets at once and wires child records to **real** parent keys, so foreign keys actually resolve:

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

## Advanced constraints

### Cross-record uniqueness

Pass `unique` to `generateMany` to guarantee a field is distinct across every record — no two records share the same value:

```ts
import { generateMany } from 'fixture-gen'

// 1000 users, no two share an email
const users = generateMany(UserSchema, 1000, { seed: 42, unique: ['email'] })

// Unique on multiple fields (each is independently unique)
const users2 = generateMany(UserSchema, 500, { seed: 0, unique: ['id', 'email'] })

// Dot notation for nested paths
const records = generateMany(schema, 20, { unique: ['user.email'] })
```

TypeBox arrays marked `uniqueItems: true` and Zod `z.set()` schemas are automatically deduplicated at the item level.

### Cross-field invariants (`refine`)

The `refine` hook runs after each record is generated and may return field overrides to enforce invariants that span multiple fields:

```ts
import { generate, generateMany } from 'fixture-gen'

const product = generate(ProductSchema, {
  seed: 1,
  refine: (r) => {
    if (r.discountedPrice >= r.price) {
      return { discountedPrice: r.price * 0.8 }
    }
  },
})

// refine applies to every record in generateMany too
const products = generateMany(ProductSchema, 100, {
  seed: 1,
  refine: (r) => {
    if (r.discountedPrice >= r.price) return { discountedPrice: r.price * 0.8 }
  },
})
```

`refine` composes with `unique`, `overrides`, `scenario`, and custom `generators`.

### Business-rule hooks (`rules` in `generateRelational`)

Pass a `rules` array to `generateRelational` to enforce cross-table invariants after FK linking:

```ts
import { generateRelational } from 'fixture-gen'

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

See [`docs/advanced-constraints.md`](./docs/advanced-constraints.md) for the full guide.

## API

Full reference: [docs/API.md](./docs/API.md)

### `generate(schema, options?)`

Generate a single fixture from a Standard Schema.

```ts
function generate<T>(schema: StandardSchemaV1<unknown, T>, options?: GenerateOptions<T>): T
```

### `generateMany(schema, count, options?)`

Generate an array of `count` fixtures.

```ts
function generateMany<T>(
  schema: StandardSchemaV1<unknown, T>,
  count: number,
  options?: GenerateOptions<T>,
): T[]
```

### `generateRelational(schemas, options)`

Generate multiple named record sets with foreign-key relationships resolved between them.

```ts
function generateRelational<S extends Record<string, StandardSchemaV1>>(
  schemas: S,
  options: RelationalOptions<S>,
): { [K in keyof S]: InferOutput<S[K]>[] }
```

### Options

```ts
interface GenerateOptions<T> {
  /** Seed for deterministic output. Same seed → same data. */
  seed?: number
  /** Force specific top-level field values, bypassing generation. */
  overrides?: Partial<T>
  /** Field-path keyed custom generators. `*` matches one path segment. */
  generators?: Record<string, CustomGenerator>
  /** Schema-wide hook that can override any node. */
  generator?: CustomGenerator
  /** Named scenario controlling generation behavior. */
  scenario?: BuiltinScenario | string
  /** Field paths (dot-separated) that must be unique across all generateMany records. */
  unique?: string[]
  /** Post-generation hook: return field overrides to enforce cross-field invariants. */
  refine?: (record: T) => Partial<T> | undefined
}

interface GenerateContext {
  path: readonly string[]
  pathKey: string
  node: IntrospectedNode
  seed: number
  prng: Prng
}

type CustomGenerator = (context: GenerateContext) => unknown

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

### `defineScenario(name, input)`

Register a named scenario for use with `generate({ scenario: name })`.

```ts
type BuiltinScenario =
  | 'happy-path' | 'empty-state'
  | 'boundary-min' | 'boundary-max'
  | 'invalid' | 'missing-subtree'

// Overrides object (may include `extends` to inherit from another scenario)
defineScenario('admin-user', { role: 'admin' })
defineScenario('empty-admin', { extends: 'empty-state', role: 'admin' })

// Factory function
defineScenario<User>('premium-user', (value) => ({ ...value, plan: 'premium' }))
```

Use `clearScenarios()` in test teardown to avoid cross-test pollution:

```ts
import { clearScenarios } from 'fixture-gen'
afterEach(() => clearScenarios())
```

## Comparison

| | **fixture-gen** | `zod-fixture` / `@anatine/zod-mock` | `faker.js` | `fast-check` | `test-data-bot` |
| --- | :---: | :---: | :---: | :---: | :---: |
| Schema-agnostic | ✅ | ❌ (Zod only) | ➖ (no schema layer) | ❌ | ❌ |
| Standard Schema native | ✅ | ❌ | ❌ | ❌ | ❌ |
| Seeded determinism | ✅ | ➖ varies | ✅ | ✅ | ❌ |
| Relational / FK generation | ✅ | ❌ | ❌ (manual) | ❌ | ❌ |
| Maps schema → mock automatically | ✅ | ✅ (Zod) | ❌ (write it yourself) | ❌ (write arbitraries) | ❌ (write factories) |
| Field overrides | ✅ | ❌ | ❌ | ❌ | ✅ |
| Runtime dependencies | none | Zod | none | none | none |
| Named scenarios (happy-path, etc.) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cross-record uniqueness / refine hooks | ✅ | ❌ | ❌ | ❌ | ❌ |
| CLI + drift detection | ✅ | ❌ | ❌ | ❌ | ❌ |
| JSON Schema / OpenAPI import-export | ✅ | ❌ | ❌ | ❌ | ❌ |

🔵 = planned — see [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Supported runtimes

Node.js · Bun · Deno · edge runtimes (Cloudflare Workers, Vercel Edge, etc.). Ships ESM with type definitions; no native bindings.

## CLI quick-start

### Install

```bash
npm install -D fixture-gen
# or globally:
npm install -g fixture-gen
```

### Commands

**Generate a fixture to stdout:**

```bash
fixture-gen generate path/to/schema.js --seed 42
fixture-gen generate path/to/schema.js --format ts --out fixtures/user.ts
```

**Save a snapshot to disk (for drift detection):**

```bash
fixture-gen snapshot path/to/schema.js --dir fixtures/ --seed 42
```

**Detect fixture drift:**

```bash
fixture-gen diff path/to/schema.js --dir fixtures/ --seed 42
# exits 0 if output matches snapshot, 1 if drift detected

# Machine-readable JSON diff (for PR bots):
fixture-gen diff path/to/schema.js --dir fixtures/ --format json
```

**Watch for schema changes during development:**

```bash
fixture-gen watch path/to/schema.js --seed 42
# prints changed fields as you save the schema file
```

### Output formats

| Flag | Output |
|------|--------|
| `--format json` | Pretty-printed JSON (default) |
| `--format jsonl` | Single-line JSON (for piping) |
| `--format ts` | `export const fixture = {...} as const` |

### Schema file format

The CLI expects a `.js` or `.mjs` file exporting a Standard Schema validator as its `default` export:

```js
// schemas/user.js
import { z } from 'zod'
export default z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
})
```

> **TypeScript schemas:** Compile with `tsc` first, or run the CLI via `tsx` / `bun`:
> `bunx fixture-gen generate schemas/user.ts --seed 1`

### CI integration — drift detection

Add fixture drift detection to your CI pipeline so schema changes that silently alter fixture shape are caught before merge:

```yaml
# .github/workflows/ci.yml
- name: Check fixture drift
  run: |
    fixture-gen diff schemas/user.js --dir fixtures/ --seed 0
    fixture-gen diff schemas/post.js --dir fixtures/ --seed 0
```

When a schema changes in a way that alters generated output, `fixture-gen diff` exits non-zero and prints what changed. Update the stored snapshot intentionally with `fixture-gen snapshot` and commit the updated `.json` files to document the change.

**Full example workflow:**

1. Commit: `fixture-gen snapshot schemas/user.js --dir fixtures/` → commit `fixtures/user-default-seed0.json`
2. CI: `fixture-gen diff schemas/user.js --dir fixtures/` runs on every PR
3. Schema change detected: CI fails, developer runs `fixture-gen diff` locally to review, updates snapshot, commits

## Using with OpenAPI / JSON Schema

`fixture-gen` can generate fixtures directly from JSON Schema objects and
OpenAPI 3.x spec documents — no validator adapter needed.

### `generateFromJsonSchema`

Pass any JSON Schema object (Draft 2020-12, Draft 7, etc.) and get a
deterministic, constraint-satisfying fixture:

```ts
import { generateFromJsonSchema } from 'fixture-gen'

const fixture = generateFromJsonSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', minLength: 2, maxLength: 50 },
      age: { type: 'integer', minimum: 18, maximum: 99 },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['id', 'name', 'age'],
  },
  { seed: 42 },
)
// { id: '...uuid...', name: '...', age: 37, tags: [...] }
```

All options (`seed`, `overrides`, `scenario`, `generators`, `refine`)
pass through:

```ts
generateFromJsonSchema(schema, { seed: 1, scenario: 'empty-state' })
generateFromJsonSchema(schema, { seed: 1, overrides: { name: 'Ada' } })
```

**Supported JSON Schema features:** `type`, `format`, `minLength`/`maxLength`
/`pattern`, `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`,
`properties`/`required`/`patternProperties`, `items`/`prefixItems`
/`minItems`/`maxItems`/`uniqueItems`, `enum`, `const`, `anyOf`/`oneOf`
(union), `allOf` (object merge), `$ref` via `$defs`/`definitions`, circular
ref detection.

### `generateFromOpenApi`

Extract a named schema from an OpenAPI 3.x spec, resolve local `$ref`
links, and generate a fixture:

```ts
import { generateFromOpenApi } from 'fixture-gen'

const spec = {
  openapi: '3.0.0',
  info: { title: 'API', version: '1.0.0' },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          address: { $ref: '#/components/schemas/Address' },
        },
        required: ['id', 'name'],
      },
      Address: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          zip: { type: 'string' },
        },
        required: ['city'],
      },
    },
  },
}

const user = generateFromOpenApi(spec, 'User', { seed: 42 })
// { id: 123, name: '...', address: { city: '...', zip: '...' } }
```

Local `$ref` pointers (`#/components/schemas/...`, `#/$defs/...`,
`#/definitions/...`) are resolved automatically. Circular references
are detected and replaced with a placeholder. Cross-file `$ref` is
**not** supported — bundle your spec first if it uses external files.

### `toJsonSchema`

Export any Standard Schema as a JSON Schema object. Delegates to
vendor-native methods where available and falls back to a generic
converter via the introspection layer:

```ts
import { z } from 'zod'
import { Type } from '@sinclair/typebox'
import { type } from 'arktype'
import { toJsonSchema } from 'fixture-gen'

// Zod v4+ → delegates to .toJSONSchema()
toJsonSchema(z.object({ name: z.string().min(3) }))
// → { type: 'object', properties: { name: { type: 'string', minLength: 3 } }, ... }

// TypeBox → cloned and returned (already JSON Schema)
toJsonSchema(Type.String({ format: 'uuid' }))
// → { type: 'string', format: 'uuid' }

// ArkType / Valibot → inferred via introspection
toJsonSchema(type({ id: 'number', name: 'string' }))
// → { type: 'object', properties: { id: { type: 'number' }, name: { type: 'string' } }, ... }
```

### AI structured-output contract example

Use `generateFromJsonSchema` to test AI function-calling response
schemas before integrating with an LLM provider:

```ts
// OpenAI function-calling / Anthropic tool-use schema
const toolSchema = {
  type: 'object',
  properties: {
    symbol: { type: 'string', pattern: '^[A-Z]{1,5}$' },
    quantity: { type: 'integer', minimum: 1, maximum: 10000 },
    orderType: { type: 'string', enum: ['market', 'limit', 'stop'] },
  },
  required: ['symbol', 'quantity', 'orderType'],
}

const fixture = generateFromJsonSchema(toolSchema, { seed: 1 })
// { symbol: 'ABC', quantity: 42, orderType: 'market' }
```

## FAQ

**Does it support custom field generators?**
Yes — use `overrides` for fixed top-level values, `generators` for field-path keyed computed values, and `generator` for schema-wide hooks.

**How does it pick realistic values?**
It inspects the schema's type and constraints (formats like `uuid`/`email`, `min`/`max`, length, enums, patterns) and generates values that satisfy them — seeded so they stay reproducible.

**What happens with a schema type it doesn't understand?**
Unsupported or opaque types fall back to a constraint-satisfying placeholder. You can always pin those fields with `overrides`, and unknown formats surface a warning so they're easy to spot.

**What about TypeBox formats?**
TypeBox schemas work directly, but its runtime checker only validates registered formats. If you use `format: "uuid"` or similar, register the matching predicate in TypeBox's `FormatRegistry` before validating generated values.

**Will generated data pass my validator?**
That's the goal: output is produced to satisfy the same schema you validate against, so `schema.parse(generate(schema))` succeeds.

## Contributing

Issues and pull requests are welcome. Please open an issue to discuss substantial changes before submitting a PR.

## License

[MIT](./LICENSE)