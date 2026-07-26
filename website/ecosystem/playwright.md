# @fixture-gen/playwright

Thin **Playwright** integration — deterministic, schema-agnostic fixtures via `test.extend`.

## Installation

```bash
npm install --save-dev @fixture-gen/playwright
```

> Requires `@playwright/test >= 1.40.0` as a peer dependency.

## Usage

### Single value per test (`fixtureFactory`)

```ts
import { test as base, expect } from '@playwright/test'
import { fixtureFactory } from '@fixture-gen/playwright'
import { z } from 'zod'

const User = z.object({
  id: z.string().uuid(),
  name: z.string(),
  age: z.number().int().min(18).max(99),
})

export const test = base.extend({
  user: fixtureFactory(User, { seed: 42 }),
})

test('shows profile', async ({ user, page }) => {
  await page.goto(`/users/${user.id}`)
  await expect(page.getByText(user.name)).toBeVisible()
})
```

Each test receives one freshly generated, schema-valid value. The same `seed` always yields the same value across runs and machines.

### Multiple values / overrides (`factoryFixture`)

```ts
import { test as base } from '@playwright/test'
import { factoryFixture } from '@fixture-gen/playwright'

export const test = base.extend({
  user: factoryFixture(User, { seed: 1 }),
})

test('creates two users', async ({ user }) => {
  const admin = user({ name: 'Admin' })
  const guest = user({ name: 'Guest' })
  // admin and guest differ (seed counter increments)
})
```

The factory counter starts at 0 for every test (fresh factory per fixture setup).

### Standalone factory (`createFactory`)

Same seed-counter model as `@fixture-gen/vitest` / `@fixture-gen/jest`, useful outside `test.extend`:

```ts
import { createFactory } from '@fixture-gen/playwright'

const user = createFactory(User, { seed: 1 })
const a = user()
const b = user({ name: 'Alice' })
user.reset() // next call matches first
```

## API

### `fixtureFactory(schema, options?)`

Returns a Playwright fixture function for `test.extend` that injects **one** generated value per test.

- **`schema`** — Any [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType, TypeBox, …)
- **`options`** — Same options as `generate()` from `fixture-gen`, plus:
  - **`isolateWorkers?: boolean`** — when `true`, mixes `testInfo.workerIndex` into the seed (`baseSeed + workerIndex * 1_000_003`) so parallel workers produce different but still deterministic fixtures. Default `false`.

### `factoryFixture(schema, options?)`

Returns a Playwright fixture that injects a callable `FixtureFactory<T>`:

| Member | Signature | Description |
|--------|-----------|-------------|
| `()` | `(overrides?) => T` | Generate a fixture |
| `.generate()` | `(overrides?) => T` | Same as calling the factory |
| `.reset()` | `() => void` | Reset the internal counter |

### `createFactory(schema, options?)`

Standalone callable factory (no Playwright lifecycle). Same `FixtureFactory` shape as above.

## Examples

See [`examples/playwright.ts`](https://github.com/arjvand/fixture-gen/blob/main/examples/playwright.ts) in the fixture-gen repository.
