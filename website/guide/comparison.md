# Comparison

How `fixture-gen` stacks up against common alternatives.

If you already validate with Zod, Valibot, ArkType, TypeBox, or JSON Schema, `fixture-gen` turns those schemas into deterministic fixtures. Faker fills free-form data; fast-check explores properties; Zod-only mockers stay inside one ecosystem.

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

- **fixture-gen** — you already have Zod/Valibot/ArkType/TypeBox (or JSON Schema/OpenAPI) and want schema-valid, deterministic fixtures with minimal glue.
- **faker.js** — you need realistic free-form data without a schema, or to fill fields that are not in a validator.
- **fast-check** — you want property-based testing with shrinking, not fixed fixtures for unit/UI tests.
- **zod-fixture / zod-mock** — you are all-in on Zod only and do not need relational generation, scenarios, or a CLI.

## Planned

See the [Roadmap](/roadmap) for upcoming work (for example `@fixture-gen/db` with Prisma and Drizzle).
