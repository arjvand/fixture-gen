---
description: Curated fixture-gen examples — component tests without fixture drift, API handler tests, Storybook stories, and more real-world patterns.
---

# Examples

Curated patterns from real test and product workflows. Each example uses the same core API — swap validators freely.

## Component test without fixture drift

**Use when:** rendering UI with schema-shaped props and you want each test to start from the same seed.

```ts
import { render, screen } from '@testing-library/react'
import { fixtureFactory, autoReset } from '@fixture-gen/vitest'
import { UserSchema } from './schemas'
import { UserCard } from './UserCard'

const user = fixtureFactory(UserSchema, { seed: 1 })
autoReset(user)

test('renders user name', () => {
  const u = user()
  render(<UserCard user={u} />)
  expect(screen.getByText(u.name)).toBeInTheDocument()
})

test('each test starts with seed 1', () => {
  const u = user() // same data as the first test's first call
  expect(u.name).toBeDefined()
})
```

See also: [Vitest plugin](/ecosystem/vitest)

## API payload that validates

**Use when:** calling a handler or client that expects a schema-valid body.

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

## Storybook args that stay stable

**Use when:** you want visual baselines that do not thrash between builds.

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

## Users & posts with real foreign keys

**Use when:** seeding related tables and every child FK must point at a real parent.

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
    relations: { 'posts.userId': 'users.id' },
  },
)

// Every post.userId is a real users[].id
```

See also: [Relational generation](/guide/relational)

## Scenario matrix for edge coverage

**Use when:** you want one test loop over happy-path, empty, boundary, and invalid shapes.

```ts
import { generate } from 'fixture-gen'

const scenarios = [
  'happy-path',
  'empty-state',
  'boundary-min',
  'boundary-max',
  'invalid',
  'missing-subtree',
] as const

for (const scenario of scenarios) {
  test(`handles ${scenario}`, () => {
    const fixture = generate(UserSchema, { seed: 1, scenario })
    // assert UI / validation behavior for each intent
  })
}
```

See also: [Scenarios](/guide/scenarios)

## Unique emails across a batch

**Use when:** `generateMany` would otherwise collide on unique columns.

```ts
import { generateMany } from 'fixture-gen'

const users = generateMany(UserSchema, 1000, {
  seed: 42,
  unique: ['email'],
})
```

See also: [Advanced constraints](/guide/advanced-constraints)

## Playwright e2e fixture

**Use when:** extending Playwright tests with schema-valid user data per worker.

```ts
import { test as base } from '@playwright/test'
import { fixtureFactory } from '@fixture-gen/playwright'

export const test = base.extend({
  user: fixtureFactory(UserSchema, { seed: 42, isolateWorkers: true }),
})

test('profile page', async ({ user, page }) => {
  await page.goto(`/users/${user.id}`)
})
```

See also: [Playwright plugin](/ecosystem/playwright)

## OpenAPI contract fixture

**Use when:** you have an OpenAPI spec and no TypeScript validator package in the test path.

```ts
import { generateFromOpenApi } from 'fixture-gen'
import spec from './openapi.json'

const user = generateFromOpenApi(spec, 'User', { seed: 42 })
```

See also: [JSON Schema & OpenAPI](/guide/json-schema-openapi)

## Repo examples

Runnable TypeScript samples live in the main package:

| File | Topic |
|------|--------|
| [examples/zod.ts](https://github.com/arjvand/fixture-gen/blob/main/examples/zod.ts) | Zod basics |
| [examples/valibot.ts](https://github.com/arjvand/fixture-gen/blob/main/examples/valibot.ts) | Valibot |
| [examples/arktype.ts](https://github.com/arjvand/fixture-gen/blob/main/examples/arktype.ts) | ArkType |
| [examples/typebox.ts](https://github.com/arjvand/fixture-gen/blob/main/examples/typebox.ts) | TypeBox |
| [examples/relational.ts](https://github.com/arjvand/fixture-gen/blob/main/examples/relational.ts) | FK linking |
| [examples/custom-generators.ts](https://github.com/arjvand/fixture-gen/blob/main/examples/custom-generators.ts) | Generators |
| [examples/vitest.ts](https://github.com/arjvand/fixture-gen/blob/main/examples/vitest.ts) | Vitest plugin |
| [examples/playwright.ts](https://github.com/arjvand/fixture-gen/blob/main/examples/playwright.ts) | Playwright plugin |
