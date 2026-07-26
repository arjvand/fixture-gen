# Getting started

Make tests easier to trust: point `fixture-gen` at a schema and get reproducible data that already satisfies it — no hand-written factories, no adapter code.

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

## Install

```bash
npm install -D fixture-gen
# pnpm add -D fixture-gen
# yarn add -D fixture-gen
# bun add -d fixture-gen
```

See [Install](/guide/install) for Deno and runtime notes.

## Your first fixture

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
```

Because `fixture-gen` only depends on the Standard Schema interface, the **exact same call** works with any compliant validator:

::: code-group

```ts [Valibot]
import * as v from 'valibot'
import { generate } from 'fixture-gen'

const User = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.string(),
})

const user = generate(User, { seed: 42 })
```

```ts [ArkType]
import { type } from 'arktype'
import { generate } from 'fixture-gen'

const User = type({ id: 'string.uuid', name: 'string' })

const user = generate(User, { seed: 42 })
```

```ts [TypeBox]
import { Type } from '@sinclair/typebox'
import { generate } from 'fixture-gen'

const User = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
})

const user = generate(User, { seed: 42 })
```

:::

## Real-world usage

### React component test (Vitest + Testing Library)

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

## Next steps

- [Deterministic generation](/guide/determinism) — seeds, batches, snapshots
- [Scenarios](/guide/scenarios) — happy-path, empty-state, boundaries
- [Relational generation](/guide/relational) — foreign keys that resolve
- [Ecosystem plugins](/ecosystem/) — Vitest, Jest, Playwright
