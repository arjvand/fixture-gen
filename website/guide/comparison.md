---
description: How fixture-gen compares to faker.js, fast-check, zod-fixture, and test-data-bot — schema-agnostic, seeded determinism, relational generation, and a CLI.
---

# Comparison

How `fixture-gen` stacks up against common alternatives.

If you already validate with Zod, Valibot, ArkType, TypeBox, or JSON Schema, `fixture-gen` turns those schemas into deterministic fixtures. Faker fills free-form data; fast-check explores properties; Zod-only mockers stay inside one ecosystem.

| | **fixture-gen** | `zod-fixture` / `@anatine/zod-mock` | `faker.js` | `fast-check` | `test-data-bot` |
| --- | :---: | :---: | :---: | :---: | :---: |
| Schema-agnostic | <IconCheck class="ok"/> | <IconX class="no"/> (Zod only) | <IconMinus class="maybe"/> (no schema layer) | <IconX class="no"/> | <IconX class="no"/> |
| Standard Schema native | <IconCheck class="ok"/> | <IconX class="no"/> | <IconX class="no"/> | <IconX class="no"/> | <IconX class="no"/> |
| Seeded determinism | <IconCheck class="ok"/> | <IconMinus class="maybe"/> varies | <IconCheck class="ok"/> | <IconCheck class="ok"/> | <IconX class="no"/> |
| Relational / FK generation | <IconCheck class="ok"/> | <IconX class="no"/> | <IconX class="no"/> (manual) | <IconX class="no"/> | <IconX class="no"/> |
| Maps schema → mock automatically | <IconCheck class="ok"/> | <IconCheck class="ok"/> (Zod) | <IconX class="no"/> (write it yourself) | <IconX class="no"/> (write arbitraries) | <IconX class="no"/> (write factories) |
| Field overrides | <IconCheck class="ok"/> | <IconX class="no"/> | <IconX class="no"/> | <IconX class="no"/> | <IconCheck class="ok"/> |
| Runtime dependencies | none | Zod | none | none | none |
| Named scenarios (happy-path, etc.) | <IconCheck class="ok"/> | <IconX class="no"/> | <IconX class="no"/> | <IconX class="no"/> | <IconX class="no"/> |
| Cross-record uniqueness / refine hooks | <IconCheck class="ok"/> | <IconX class="no"/> | <IconX class="no"/> | <IconX class="no"/> | <IconX class="no"/> |
| CLI + drift detection | <IconCheck class="ok"/> | <IconX class="no"/> | <IconX class="no"/> | <IconX class="no"/> | <IconX class="no"/> |
| JSON Schema / OpenAPI import-export | <IconCheck class="ok"/> | <IconX class="no"/> | <IconX class="no"/> | <IconX class="no"/> | <IconX class="no"/> |

## When to use what

- **fixture-gen** — you already have Zod/Valibot/ArkType/TypeBox (or JSON Schema/OpenAPI) and want schema-valid, deterministic fixtures with minimal glue.
- **faker.js** — you need realistic free-form data without a schema, or to fill fields that are not in a validator.
- **fast-check** — you want property-based testing with shrinking, not fixed fixtures for unit/UI tests.
- **zod-fixture / zod-mock** — you are all-in on Zod only and do not need relational generation, scenarios, or a CLI.

## Planned

See the [Roadmap](/roadmap) for upcoming work (for example `@fixture-gen/db` with Prisma and Drizzle).
