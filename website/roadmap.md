---
description: The fixture-gen roadmap — what has shipped across 11 phases and what is next, including ecosystem plugins and DB adapters.
---

# Roadmap

What has shipped and what is next for users of `fixture-gen`. Full phase checklists live in the [package ROADMAP](https://github.com/arjvand/fixture-gen/blob/main/docs/ROADMAP.md).

## Overview

| Phase | Goal | Status |
| :--- | :--- | :--- |
| 0 — Scaffolding | Buildable, testable, CI-backed repo | Done |
| 1 — Core engine | Seeded `generate()` over Standard Schema | Done |
| 2 — Type coverage | Full type & constraint support | Done |
| 3 — Cross-validator | Zod / Valibot / ArkType / TypeBox parity | Done |
| 4 — Relational | `generateRelational` with FK integrity | Done |
| 5 — Runtime hardening | Multi-runtime, zero deps, size budget | Done |
| 6 — 1.0 release | Docs, custom generators, publish | Done |
| 7 — Scenarios | Named test-case generation | Done |
| 8 — CLI & workflow | Drift detection, watch, CI integration | Done |
| 9 — Advanced constraints | Uniqueness, cross-field rules, business hooks | Done |
| 10 — JSON Schema bridge | OpenAPI / JSON Schema import-export | Done |
| 11 — Ecosystem plugins | Vitest / Jest / Playwright / DB adapters | In progress |

**Current status:** Phases 0–10 are complete and published as `fixture-gen@1.4.x`. Phase 11 is in progress — `@fixture-gen/vitest`, `@fixture-gen/jest`, and `@fixture-gen/playwright` have shipped; the DB adapter remains.

## Shipped highlights

- Seeded `generate` / `generateMany` / `generateRelational`
- Standard Schema + TypeBox support
- Built-in and user-defined [scenarios](/guide/scenarios)
- [CLI](/guide/cli) with snapshot, diff, and watch
- [Advanced constraints](/guide/advanced-constraints): `unique`, `refine`, `rules`
- [JSON Schema & OpenAPI](/guide/json-schema-openapi) bridge
- Ecosystem plugins for [Vitest](/ecosystem/vitest), [Jest](/ecosystem/jest), and [Playwright](/ecosystem/playwright)

## Next up

- **`@fixture-gen/db`** — `seedDatabase(orm, relationalFixture)` adapter with Prisma and Drizzle targets

## Contributing

Issues and pull requests are welcome on [arjvand/fixture-gen](https://github.com/arjvand/fixture-gen). Please open an issue to discuss substantial changes before submitting a PR.
