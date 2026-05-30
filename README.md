# fixture-gen

> The deterministic fixture compiler for TypeScript teams who want realistic, invariant-safe test data from contracts.

[![npm version](https://img.shields.io/npm/v/fixture-gen.svg)](https://www.npmjs.com/package/fixture-gen)
[![bundle size](https://img.shields.io/bundlephobia/minzip/fixture-gen)](https://bundlephobia.com/package/fixture-gen)
[![CI](https://img.shields.io/github/actions/workflow/status/arjvand/fixture-gen/ci.yml)](https://github.com/arjvand/fixture-gen/actions)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

Instead of random mock data, `fixture-gen` turns your schemas into reproducible, scenario-aware test assets — the kind of thing that belongs in version control alongside your types. Change a type, regenerate fixtures, see exactly what broke.

The [Standard Schema](https://standardschema.dev) initiative unified the validation layer: frameworks can now accept Zod, Valibot, or ArkType through a single interface. But **fixture and mock generators never caught up** — `zod-fixture` is welded to Zod, and switching validators means rewriting your test data layer from scratch.

`fixture-gen` reads any Standard Schema-compliant object and produces realistic, **deterministic** output — no adapters, no per-library glue. Point it at your existing schemas and get fixtures.

## Features

- **🔌 Standard Schema native** — works with Zod, Valibot, and ArkType through the shared `~standard` interface, and understands TypeBox schemas directly. No adapter code for *you* to write — point it at your existing schemas.
- **🎲 Seeded determinism** — pass a `seed` and the same schema always produces the same data, so snapshots and assertions stay stable across runs and machines.
- **🔗 Relational generation** — generate connected record sets where child rows reference real parent keys (matching foreign keys across tables).
- **🧰 Custom generators** — pin exact fields with `overrides`, or compute field and schema-wide values with deterministic hooks.
- **🪶 Minimal runtime** — pure TypeScript, zero binary dependencies. Runs on Node.js, Bun, Deno, and edge runtimes.
- **🧩 Fully typed** — output is inferred from your schema, so fixtures match the types you already validate against.

**Planned** (see [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full post-1.0 plan):

- **🎭 Scenario-first** _(Phase 7)_ — generate named cases: `happy-path`, `empty-state`, `boundary-min`, `boundary-max`, `invalid`, `missing-subtree`
- **🛠 CLI + drift detection** _(Phase 8)_ — `fixture-gen diff` exits non-zero when schema changes alter fixture output; CI-ready watch mode and snapshot management
- **🔒 Advanced constraints** _(Phase 9)_ — schema-wide uniqueness, cross-field invariants, and business-rule hooks across `generateMany` / `generateRelational`
- **🌐 JSON Schema & OpenAPI bridge** _(Phase 10)_ — import OpenAPI specs, export Standard Schemas as JSON Schema, bridge AI structured-output contracts
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
}
```

## Comparison

| | **fixture-gen** | `zod-fixture` / `@anatine/zod-mock` | `faker.js` |
| --- | :---: | :---: | :---: |
| Schema-agnostic | ✅ | ❌ (Zod only) | ➖ (no schema layer) |
| Standard Schema native | ✅ | ❌ | ❌ |
| Seeded determinism | ✅ | ➖ varies | ✅ |
| Relational / FK generation | ✅ | ❌ | ❌ (manual) |
| Maps schema → mock automatically | ✅ | ✅ (Zod) | ❌ (write it yourself) |
| Runtime dependencies | none | Zod | none |
| Named scenarios (happy-path, etc.) | 🔵 Phase 7 | ❌ | ❌ |
| CLI + drift detection | 🔵 Phase 8 | ❌ | ❌ |
| JSON Schema / OpenAPI import-export | 🔵 Phase 10 | ❌ | ❌ |

🔵 = planned — see [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Supported runtimes

Node.js · Bun · Deno · edge runtimes (Cloudflare Workers, Vercel Edge, etc.). Ships ESM with type definitions; no native bindings.

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
