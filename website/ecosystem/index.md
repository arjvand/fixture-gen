---
description: Ecosystem plugins that drop schema-valid factories into your test runner — @fixture-gen/vitest, @fixture-gen/jest, and @fixture-gen/playwright.
---

# Ecosystem

Drop schema-valid factories into the test runner you already use. These thin plugins wrap `fixture-gen` for Vitest, Jest, and Playwright — no heavy runtime dependencies beyond the tools you already have.

| Package | Integrates with | Highlights |
|---------|-----------------|------------|
| [`@fixture-gen/vitest`](/ecosystem/vitest) | Vitest ≥ 1 | `fixtureFactory` + `autoReset` |
| [`@fixture-gen/jest`](/ecosystem/jest) | Jest ≥ 29 | Same API as Vitest plugin |
| [`@fixture-gen/playwright`](/ecosystem/playwright) | Playwright ≥ 1.40 | `test.extend` fixtures + worker isolation |

## Planned

- **`@fixture-gen/db`** — seed a test database from `generateRelational` output (Prisma + Drizzle targets)

See the [Roadmap](/roadmap) for status.

## Shared factory model

Vitest and Jest plugins expose the same `FixtureFactory` shape:

| Member | Signature | Description |
|--------|-----------|-------------|
| `()` | `(overrides?) => T` | Generate a fixture |
| `.generate()` | `(overrides?) => T` | Same as calling the factory |
| `.reset()` | `() => void` | Reset internal counter so next call matches the first |

Each call increments a counter added to the base seed, so successive calls produce different data. `autoReset(factory)` registers a `beforeEach` that resets the counter before each test.
