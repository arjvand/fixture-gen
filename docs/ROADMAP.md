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
| [6 — 1.0 release](#phase-6--dx-docs--10-release) | Docs, custom generators, publish | 🟡 In progress |

Legend: 🔵 Planned · 🟡 In progress · 🟢 Done

Current branch status: phases 0-5 are implemented in `src/` and covered by tests/smoke checks. Phase 6 is now in progress with DX/docs, custom generators, examples, and tagged-release publishing wired into GitHub Actions.

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
- [ ] Wire up real README badges (npm, CI, bundle size)
- [ ] Publish `1.0.0` to npm

**Exit criteria:** `fixture-gen@1.0.0` published with green CI and working badges.

---

## Backlog / future ideas

- Locale-aware / faker-style value providers
- Schema-wide custom generator hooks (beyond per-field `overrides`)
- CLI for generating fixtures to JSON/stdout
- Performance benchmarks vs `zod-fixture` and faker-based setups
- Pluggable persistence (seed a DB / ORM directly from relational output)

## Contributing

Each phase maps to a GitHub milestone; checklist items map to issues. Pick up unblocked tasks within the lowest open phase, and keep the status table above in sync as work lands.
