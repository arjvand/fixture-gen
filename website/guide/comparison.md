# Comparison

How `fixture-gen` stacks up against common alternatives.

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

## When to use what

- **fixture-gen** — You already have Zod/Valibot/ArkType/TypeBox (or JSON Schema) and want schema-valid, deterministic fixtures with minimal glue.
- **faker.js** — You need realistic free-form data without a schema, or to fill fields that aren't in a validator.
- **fast-check** — You want property-based testing with shrinking, not fixed fixtures for unit/UI tests.
- **zod-fixture / zod-mock** — You're all-in on Zod only and don't need relational generation, scenarios, or a CLI.

## Planned

See the [Roadmap](/roadmap) for upcoming work (for example `@fixture-gen/db` with Prisma and Drizzle).
