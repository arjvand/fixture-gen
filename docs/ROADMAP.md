# fixture-gen — Roadmap

This document breaks the build of `fixture-gen` into ordered, dependency-correct phases. It is the execution plan behind the API and feature promises in [`README.md`](../README.md).

- Phases are roughly **sequential** — each builds on the previous.
- `- [ ]` checkboxes track task-level progress.
- "Exit criteria" define when a phase is considered done.

## Overview

| Phase | Goal | Status |
| :--- | :--- | :--- |
| [0 — Scaffolding](#phase-0--project-scaffolding) | Buildable, testable, CI-backed repo | 🟢 Done |
| [1 — Core engine](#phase-1--core-engine--standard-schema-introspection) | Seeded `generate()` over Standard Schema | 🟢 Done |
| [2 — Type coverage](#phase-2--rich-type--constraint-coverage) | Full type & constraint support | 🟢 Done |
| [3 — Cross-validator](#phase-3--cross-validator-compatibility) | Zod / Valibot / ArkType / TypeBox parity | 🟢 Done |
| [4 — Relational](#phase-4--relational-generation) | `generateRelational` with FK integrity | 🟢 Done |
| [5 — Runtime hardening](#phase-5--runtime--footprint-hardening) | Multi-runtime, zero deps, size budget | 🟢 Done |
| [6 — 1.0 release](#phase-6--dx-docs--10-release) | Docs, custom generators, publish | 🟢 Done |
| [7 — Scenarios](#phase-7--scenario-first-generation) | Named test-case generation | 🟢 Done |
| [8 — CLI & workflow](#phase-8--cli--workflow-tooling) | Drift detection, watch, CI integration | 🟢 Done |
| [9 — Advanced constraints](#phase-9--advanced-constraint-engine) | Uniqueness, cross-field rules, business hooks | 🔵 Planned |
| [10 — JSON Schema bridge](#phase-10--json-schema--openapi-bridge) | OpenAPI / JSON Schema import-export | 🔵 Planned |
| [11 — Ecosystem plugins](#phase-11--ecosystem-plugins) | Vitest / Jest / Playwright / DB adapters | 🔵 Planned |

Legend: 🔵 Planned · 🟡 In progress · 🟢 Done

**Current status:** Phases 0–8 are complete and published as `fixture-gen@1.1.0`. Phases 9–11 chart the post-1.1 roadmap toward the fixture compiler vision: advanced constraints, JSON Schema bridging, and ecosystem plugins.

---

## Phase 0 — Project scaffolding

**Goal:** A repository that builds, tests, lints, and runs in CI.

**Scope:** Tooling and project skeleton only — no library logic yet.

**Deliverables:** `package.json`, TypeScript config, build pipeline emitting ESM + type declarations, linting/formatting, a test runner, a CI workflow, and an MIT `LICENSE`.

- [x] Initialize `package.json` (name `fixture-gen`, `type: "module"`, exports map, `files` allowlist)
- [x] Add `tsconfig.json` (strict, `moduleResolution: "bundler"`)
- [x] Set up bundler (tsup) → ESM output + `.d.ts`
- [x] Add linter + formatter (Biome)
- [x] Add test runner (Vitest)
- [x] Add `LICENSE` (MIT) and reference it from `README.md`
- [x] Add GitHub Actions CI: install → lint → build → test
- [x] Add `.gitignore`, `.editorconfig`

**Exit criteria:** `npm run build` and `npm test` pass locally and green in CI.

---

## Phase 1 — Core engine & Standard Schema introspection

**Goal:** A minimal, deterministic `generate()` that reads the Standard Schema interface and produces validating output for primitives and flat objects.

**Scope:** The generation core. Depends on Phase 0.

**Deliverables:** Standard Schema introspection layer, a seeded PRNG, primitive value generators, and the `generate()` MVP.

- [x] Define internal types around the `~standard` (`StandardSchemaV1`) interface
- [x] Implement a deterministic seeded PRNG (e.g. mulberry32/xorshift) — same seed ⇒ same stream
- [x] Implement a schema walker that resolves node kind + constraints
- [x] Primitive generators: string, number, integer, boolean, date
- [x] Flat object generation
- [x] Public `generate(schema, options?)` with `{ seed }`
- [x] Validate generated output via `schema['~standard'].validate` in tests

**Exit criteria:** `generate(schema)` output passes the schema's own validation for primitives and flat objects; identical `seed` produces identical output.

> **Note:** the `~standard` interface exposes no runtime schema structure, so introspection reads validator internals via a centralized `~standard.vendor`-keyed layer (Zod implemented; others land in Phase 3) with a placeholder fallback for unknown vendors. See the introspection note in [`CLAUDE.md`](../CLAUDE.md).

---

## Phase 2 — Rich type & constraint coverage

**Goal:** Support the full realistic type matrix and honor schema constraints when generating values.

**Scope:** Extends the Phase 1 engine. The bulk of correctness work.

**Deliverables:** Composite type support, constraint-aware generation, `generateMany`, and per-field `overrides`.

- [x] Composite types: nested objects, arrays, tuples, records
- [x] Modifiers: optional, nullable, default, catch
- [x] Unions, discriminated unions, enums, literals
- [x] Constraint-aware values: `min`/`max`, length, integer/positive, regex patterns
- [x] String formats: uuid, email, url, datetime, ip, etc.
- [x] `generateMany(schema, count, options?)`
- [x] `overrides` to pin specific field values
- [x] Expand the round-trip validation suite across the full type matrix

**Exit criteria:** Generated data validates across the supported type/constraint matrix; `generateMany` and `overrides` covered by tests.

---

## Phase 3 — Cross-validator compatibility

**Goal:** Prove the "no adapters" promise — identical behavior across the four target validators.

**Scope:** Compatibility verification and any minimal normalization needed per library.

**Deliverables:** A shared conformance suite executed against each validator, plus documented caveats.

- [x] Author one conformance test suite parameterized by validator
- [x] Run it against **Zod**
- [x] Run it against **Valibot**
- [x] Run it against **ArkType**
- [x] Run it against **TypeBox**
- [x] CI matrix across all four
- [x] Document any per-library limitations / unsupported nodes

**Exit criteria:** The same fixtures validate across all four libraries in CI; caveats documented.

> **Caveat:** TypeBox schemas are supported directly through their JSON Schema shape. If a test suite relies on TypeBox format keywords such as `uuid`, register the matching checker in `FormatRegistry` before validating generated output.

---

## Phase 4 — Relational generation

**Goal:** Generate connected record sets where child records reference real parent keys.

**Scope:** A new entry point on top of the stable single-record engine. Depends on Phases 1–2.

**Deliverables:** `generateRelational` with foreign-key resolution and deterministic, referentially-intact linking.

- [x] `generateRelational(schemas, { counts, relations, seed })`
- [x] Parse `relations` mapping `"child.field": "parent.field"`
- [x] Generate parents first, then assign child FKs from real parent keys
- [x] Guarantee referential integrity (every FK resolves)
- [x] Deterministic linking under a fixed seed
- [x] Tests asserting integrity and determinism

**Exit criteria:** Generated children always reference existing parent keys; integrity and determinism asserted in tests.

---

## Phase 5 — Runtime & footprint hardening

**Goal:** Deliver on "minimal runtime, runs everywhere, zero binary deps."

**Scope:** Packaging, portability, and size — no new features.

**Deliverables:** Verified multi-runtime support, dependency audit, and a bundle-size budget.

- [x] Smoke tests on Node.js
- [x] Smoke tests on Bun
- [x] Smoke tests on Deno
- [x] Smoke test on an edge runtime (Workers / Vercel Edge)
- [x] Confirm zero runtime dependencies
- [x] Verify ESM + type declarations resolve cleanly for consumers
- [x] Add a bundle-size check/budget (size-limit) and confirm tree-shakeability

**Exit criteria:** Smoke tests pass on each runtime; package ships zero runtime deps and stays within the size budget.

---

## Phase 6 — DX, docs & 1.0 release

**Goal:** Ship a documented, releasable `1.0.0`.

**Scope:** Final DX polish and release plumbing after the core feature set is complete.

**Deliverables:** API docs, examples, custom field generators, release workflow, and a published package.

- [x] TSDoc on the public API; generate API reference
- [x] Runnable examples (per validator + relational)
- [x] Custom field generators (the README FAQ roadmap item)
- [x] Set up release workflow and npm publish automation
- [x] Wire up real README badges (npm, CI, bundle size)
- [x] Publish `1.0.0` to npm

**Exit criteria:** `fixture-gen@1.0.0` published with green CI and working badges.

---

## Backlog / future ideas

Items below are tracked here before they are promoted into a numbered phase. Once scoped and sequenced, each moves into its own phase above.

- Locale-aware / faker-style value providers (name, address, phone)
- Schema-wide custom generator hooks (beyond per-field `overrides`)
- Performance benchmarks vs `zod-fixture` and faker-based setups

---

## Phase 7 — Scenario-first generation

**Goal:** Let callers generate named, intent-bearing test cases instead of anonymous random data.

**Scope:** New `scenario` option on existing entry points plus a scenario-definition API. Depends on Phase 2 (constraint engine) and Phase 4 (relational).

**Deliverables:** Built-in scenario catalogue, `defineScenario` for user-defined cases, and scenario propagation through `generateMany` / `generateRelational`.

- [x] Add `scenario` option to `generate(schema, { scenario, seed })`
- [x] Built-in scenarios: `'happy-path'` (valid, representative), `'empty-state'` (all optionals absent, arrays empty), `'boundary-min'` (all constraints at lower bound), `'boundary-max'` (all constraints at upper bound), `'invalid'` (intentionally fails schema — useful for error-path tests), `'missing-subtree'` (required nested object absent)
- [x] `defineScenario(name, overrides | factory)` for project-specific cases
- [x] Scenario inheritance: `defineScenario('my-case', { extends: 'happy-path', … })`
- [x] Propagate scenario through `generateMany` and `generateRelational`
- [x] Document each built-in scenario with examples in `docs/scenarios.md`

**Exit criteria:** `generate(schema, { scenario: 'boundary-min' })` always produces a value at the minimum boundary; `defineScenario` lets users register named cases; all scenarios covered by round-trip validation tests. ✅ Shipped in `1.1.0`.

---

## Phase 8 — CLI & workflow tooling

**Goal:** Own the fixture workflow, not just the library call — make `fixture-gen` a first-class CI tool.

**Scope:** A standalone `fixture-gen` CLI and a drift-detection pipeline. No new generation features; the CLI shells out to the same engine.

**Deliverables:** `fixture-gen` binary, snapshot persistence, drift detection, and a watch mode.

- [x] `fixture-gen generate <schema-file> [--scenario] [--seed] [--out]` — write fixture JSON to stdout or a file
- [x] `fixture-gen snapshot <schema-file> [--dir fixtures/]` — write or refresh named snapshots on disk
- [x] `fixture-gen diff <schema-file>` — compare current engine output against stored snapshots; exit non-zero on drift (CI-friendly)
- [x] `fixture-gen watch <schema-file>` — re-run on schema change; print diff of what changed
- [x] `--format json | jsonl | ts` output modes
- [x] Structured JSON diff output (machine-readable, for PR comment bots)
- [x] README section: "CLI quick-start" with install + common workflows
- [x] Document CI integration pattern (add `fixture-gen diff` to the test step)

**Exit criteria:** `fixture-gen diff` exits non-zero when a schema change would alter fixture output; `fixture-gen watch` reprints changed fields on save; a CI example workflow is documented.

---

## Phase 9 — Advanced constraint engine

**Goal:** Guarantee invariants that span multiple fields and records — the gap between "type-aware" and "constraint-aware."

**Scope:** Extends Phase 2 (field constraints) and Phase 4 (relational) with cross-field and cross-record rules. No public API surface changes beyond new options.

**Deliverables:** Uniqueness guarantees, conditional constraints, and user-supplied business-rule hooks.

- [ ] `unique: true` on array-item schemas → deduplicated generated sets
- [ ] Schema-wide uniqueness: ensure a field value is unique across all records in `generateMany` (e.g. unique email per user)
- [ ] Conditional constraints: `refine` / `when` hooks that receive the partial object and return additional field constraints
- [ ] Business-rule hooks: `generateRelational({ rules: [fn] })` — post-generation validators that can mutate or reject records
- [ ] Boundary scenario integration: `boundary-min` / `boundary-max` use refined constraints, not just raw schema min/max
- [ ] Tests asserting uniqueness across 1 000-record `generateMany` runs
- [ ] Docs: "Advanced constraints" guide

**Exit criteria:** `generateMany(schema, 1000, { unique: ['email'] })` produces 1 000 records with distinct email values; business-rule hooks can enforce cross-field invariants.

---

## Phase 10 — JSON Schema & OpenAPI bridge

**Goal:** Make `fixture-gen` the bridge between TypeScript types, JSON Schema, and AI-friendly contracts — sit in the middle of backend, frontend, and AI workflows.

**Scope:** New entry points that accept JSON Schema objects and OpenAPI `components/schemas` blocks. Complements (not replaces) the existing Standard Schema path.

**Deliverables:** `generateFromJsonSchema`, `generateFromOpenApi`, and a JSON Schema export for any Standard Schema.

- [ ] `generateFromJsonSchema(schema: JSONSchema, opts?)` — generate a fixture directly from a JSON Schema object
- [ ] `generateFromOpenApi(spec, schemaName, opts?)` — accept a parsed OpenAPI 3.x document and a component name
- [ ] `toJsonSchema(standardSchema)` — export a Standard Schema as JSON Schema (delegates to Zod's `.toJSONSchema()` where available, otherwise infers)
- [ ] Scenario support passes through to both new entry points
- [ ] README section: "Using with OpenAPI / JSON Schema" with a fetch-spec-then-generate example
- [ ] Structured output contract example: "Generate test fixtures for an AI function-call response schema"

**Exit criteria:** `generateFromJsonSchema({ type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] })` returns a validating fixture; `generateFromOpenApi` resolves `$ref` across components.

---

## Phase 11 — Ecosystem plugins

**Goal:** Integrate into the tools TypeScript teams already use rather than asking them to call the API directly.

**Scope:** Thin adapter packages that delegate to the core engine. Each plugin is a separate npm package under the `@fixture-gen/` scope.

**Deliverables:** Vitest plugin, Jest plugin, Playwright fixtures helper, and a DB seeding adapter.

- [ ] `@fixture-gen/vitest` — `fixtureFactory(schema, opts)` returns a Vitest `beforeEach`-compatible factory with automatic seed reset per test
- [ ] `@fixture-gen/jest` — same pattern, Jest lifecycle hooks
- [ ] `@fixture-gen/playwright` — Playwright fixtures integration: `test.extend({ user: fixtureFactory(UserSchema) })`
- [ ] `@fixture-gen/db` — `seedDatabase(orm, relationalFixture)` adapter with Prisma and Drizzle targets
- [ ] Monorepo setup: `packages/` with shared `tsconfig` and changesets for independent versioning
- [ ] Each plugin has its own README and a working example in `examples/`

**Exit criteria:** A Vitest test can import `{ fixtureFactory } from '@fixture-gen/vitest'` and receive a fresh seeded fixture per test; the Prisma DB adapter can seed a test database from `generateRelational` output.

---

## Contributing

Each phase maps to a GitHub milestone; checklist items map to issues. Pick up unblocked tasks within the lowest open phase, and keep the status table above in sync as work lands.
