# @fixture-gen/jest

Use `fixtureFactory` in Jest so each test starts from the same seed — deterministic, schema-valid fixtures with automatic reset via `autoReset`.

## Installation

```bash
npm install --save-dev @fixture-gen/jest
```

> Requires `jest >= 29.0.0` as a peer dependency.

## Usage

```ts
import { fixtureFactory, autoReset } from '@fixture-gen/jest'
import { z } from 'zod'

const User = z.object({
  id: z.string().uuid(),
  name: z.string(),
  age: z.number().int().min(18).max(99),
})

const user = fixtureFactory(User, { seed: 1 })
autoReset(user) // resets seed before each test

describe('User', () => {
  it('creates a valid user', () => {
    const u = user()
    expect(typeof u.name).toBe('string')
  })

  it('each test gets the same initial seed', () => {
    const u = user()
    // same seed as the first test's first call
  })
})
```

The API matches `@fixture-gen/vitest` — import from `@fixture-gen/jest` instead.

## API

### `fixtureFactory(schema, options?)`

Creates a callable factory that produces a fixture on each invocation.

- **`schema`** — Any [Standard Schema](https://standardschema.dev)
- **`options`** — Same options as `generate()` from `fixture-gen`

Returns a `FixtureFactory<T>`:

| Member | Signature | Description |
|--------|-----------|-------------|
| `()` | `(overrides?) => T` | Generate a fixture (callable) |
| `.generate()` | `(overrides?) => T` | Same as calling the factory |
| `.reset()` | `() => void` | Reset the internal counter so next output matches the first call |

### `autoReset(factory)`

Registers a Jest `beforeEach` hook (from `@jest/globals`) that calls `factory.reset()`.

```ts
autoReset(userFactory)
// ≡ beforeEach(() => userFactory.reset())
```

::: tip Without `@jest/globals`
If you use Jest without `@jest/globals`, call `factory.reset()` manually in your own `beforeEach` block.
:::
