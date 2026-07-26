# @fixture-gen/vitest

Thin **Vitest** integration — deterministic, schema-agnostic test fixtures with automatic seed reset per test.

## Installation

```bash
npm install --save-dev @fixture-gen/vitest
```

> Requires `vitest >= 1.0.0` as a peer dependency.

## Usage

```ts
import { fixtureFactory, autoReset } from '@fixture-gen/vitest'
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
    expect(u.name).toBeTypeOf('string')
  })

  it('each test gets the same initial seed', () => {
    const u = user()
    // same seed as the first test's first call — deterministic across tests
  })
})
```

## API

### `fixtureFactory(schema, options?)`

Creates a callable factory that produces a fixture on each invocation.

- **`schema`** — Any [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType, TypeBox, …)
- **`options`** — Same options as `generate()` from `fixture-gen` (`seed`, `overrides`, `generators`, …)

Returns a `FixtureFactory<T>`:

| Member | Signature | Description |
|--------|-----------|-------------|
| `()` | `(overrides?) => T` | Generate a fixture (callable) |
| `.generate()` | `(overrides?) => T` | Same as calling the factory |
| `.reset()` | `() => void` | Reset the internal counter so next output matches the first call |

Each call increments a counter added to the base seed, so every call produces a different fixture.

### `autoReset(factory)`

Registers a Vitest `beforeEach` hook that calls `factory.reset()`, giving every test a clean starting seed.

```ts
autoReset(userFactory)
// ≡ beforeEach(() => userFactory.reset())
```

## Examples

See [`examples/vitest.ts`](https://github.com/arjvand/fixture-gen/blob/main/examples/vitest.ts) in the fixture-gen repository.
