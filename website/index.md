---
layout: home

description: Generate deterministic, schema-valid test fixtures from Zod, Valibot, ArkType, TypeBox, JSON Schema, and OpenAPI. Zero runtime dependencies.

hero:
  name: fixture-gen
  text: Test data that always matches your schema
  tagline: Generate deterministic fixtures from your existing validators — Zod, Valibot, ArkType, TypeBox, JSON Schema, and OpenAPI. Same seed, same data. No hand-written factories.
  image:
    src: /logo.png
    alt: fixture-gen
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/arjvand/fixture-gen

features:
  - icon: 🔌
    title: Works with your validators
    details: Same generate() call for Zod, Valibot, ArkType, and TypeBox. No adapters for you to write — point it at the schemas you already have.
  - icon: 🎲
    title: Stable across CI runs
    details: Pass a seed and every machine produces the same fixture. Snapshots and assertions stop thrashing between runs.
  - icon: 🔗
    title: Foreign keys that resolve
    details: Generate related tables where every child FK points at a real parent row — not a random UUID that never exists.
  - icon: 🎭
    title: Named test scenarios
    details: happy-path, empty-state, boundary-min, boundary-max, invalid, missing-subtree — or defineScenario for your own cases.
  - icon: 🔒
    title: Uniqueness & business rules
    details: Unique emails across a batch, refine hooks for multi-field invariants, and rules that span generateRelational tables.
  - icon: 🪶
    title: Tiny, typed, portable
    details: Pure TypeScript, zero binary dependencies. Runs on Node.js, Bun, Deno, and edge. Fully typed output from your schema.
---

## Quick taste

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

Same call works with Valibot, ArkType, and TypeBox — no adapters.

```bash
npm install -D fixture-gen
```

## The problem it solves

Hand-written fixtures go stale the moment the schema changes. Faker ignores your constraints. Custom factories are another surface to maintain — and they still drift.

Your schemas already describe what valid data looks like. `fixture-gen` turns them into fixtures that stay valid and reproducible.

## Before / after

```ts
// Before: brittle manual fixture that drifts from the schema
const user = {
  id: '2b8f1c6e-6f90-4c52-9c83-0d9f2f4cf5c9',
  name: 'John',
  email: 'john@example.com',
  role: 'admin',
  profile: { avatarUrl: null }, // schema now requires a string
}

// After: schema-derived fixture in one line
const user = generate(UserSchema, { seed: 42, overrides: { role: 'admin' } })
```

## When to use what

- **fixture-gen** — you already have a schema and want validating, deterministic fixtures
- **Faker alone** — free-form realistic strings with no schema to satisfy
- **fast-check** — property-based testing with shrinking, not fixed unit/UI fixtures

See the full [comparison](/guide/comparison).

## Works with your test runner

| Package | Integrates with |
|---------|-----------------|
| [`@fixture-gen/vitest`](/ecosystem/vitest) | Vitest |
| [`@fixture-gen/jest`](/ecosystem/jest) | Jest |
| [`@fixture-gen/playwright`](/ecosystem/playwright) | Playwright |

## Next step

```bash
npm install -D fixture-gen
```

[Continue to the guide →](/guide/getting-started)
