---
layout: home
title: fixture-gen — Deterministic test fixtures from your schema
titleTemplate: false

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
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M15 8V2"/><path d="M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z"/><path d="M9 8V2"/></svg>
    title: Works with your validators
    details: Same generate() call for Zod, Valibot, ArkType, and TypeBox. No adapters for you to write — point it at the schemas you already have.
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/></svg>
    title: Stable across CI runs
    details: Pass a seed and every machine produces the same fixture. Snapshots and assertions stop thrashing between runs.
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
    title: Foreign keys that resolve
    details: Generate related tables where every child FK points at a real parent row — not a random UUID that never exists.
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-3 3-8"/><path d="M22 10s-3-3-3-8"/><path d="M10 2c0 4.4-3.6 8-8 8"/><path d="M14 2c0 4.4 3.6 8 8 8"/><path d="M2 10s2 2 2 5"/><path d="M22 10s-2 2-2 5"/><path d="M8 15h8"/><path d="M2 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/><path d="M14 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/></svg>
    title: Named test scenarios
    details: happy-path, empty-state, boundary-min, boundary-max, invalid, missing-subtree — or defineScenario for your own cases.
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg>
    title: Uniqueness & business rules
    details: Unique emails across a batch, refine hooks for multi-field invariants, and rules that span generateRelational tables.
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.086 18.412A2 2 0 0112.67 19H5v-7.672a2 2 0 01.586-1.414L11.75 3.75a6 6 0 118.49 8.49z"/><path d="M16 8 2 22"/><path d="M17.488 15H9"/></svg>
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
