# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`fixture-gen` — schema-agnostic, deterministic test fixtures for any [Standard Schema](https://standardschema.dev) validator (Zod, Valibot, ArkType, TypeBox, …). The public API accepts any schema through the shared `~standard` (`StandardSchemaV1`) interface and produces validating mock data — **consumers write no adapter code**. ESM-only, zero runtime dependencies, targets Node/Bun/Deno/edge.

> **Introspection reality:** the `~standard` interface carries *no schema structure* at runtime (only `vendor`/`validate`/type-level `types`). Structure is recovered by a centralized, **`~standard.vendor`-keyed** introspection layer that reads each validator's internals (validators stay devDeps only). Unknown vendors / opaque nodes fall back to a constraint-satisfying placeholder verified via `~standard.validate`.

**Current state: Phase 6 (DX, docs & 1.0 release) completed.** `generate(schema, { seed })` produces deterministic, validating output for the supported validator matrix: Zod, Valibot, ArkType, and TypeBox. `generateMany` and `generateRelational` are also covered. The full stable API is specified in `README.md`, and the ordered build plan in `docs/ROADMAP.md`. `fixture-gen` is published to npm at version `1.0.0`.

## Commands

Package manager is **npm** (committed `package-lock.json`; CI runs `npm ci`).

```bash
npm run build       # tsup → dist/ (ESM + .d.ts + sourcemaps)
npm run dev         # tsup --watch
npm test            # vitest run (one-shot)
npm run test:watch  # vitest watch
npm run typecheck   # tsc --noEmit
npm run lint        # biome check .   (lint + format + import-order check)
npm run format      # biome format --write .
npm run check       # lint → typecheck → build → test (the full CI-equivalent gate)
```

Single test file / single test: `npx vitest run test/smoke.test.ts` or `npx vitest run -t "exposes a VERSION export"`.

Tests live in `test/**/*.test.ts` or `src/**/*.test.ts`. Vitest globals are **off** — import `describe`/`it`/`expect` from `vitest` explicitly.

## Architecture (target — see docs/ROADMAP.md)

The library is built bottom-up over the Standard Schema interface; planned core components (Phase 1+):

- **Standard Schema introspection** (`src/standard.ts`, `src/introspect/`) — internal `~standard` types plus a `vendor`-keyed walker that resolves each node's kind + constraints from the validator's internals (Zod, Valibot, and ArkType via `~standard`; TypeBox is read directly from its JSON Schema shape). The public API stays validator-agnostic for Standard Schema validators, and output is verified by round-tripping through each library's runtime validator in tests. Unknown vendors / opaque nodes resolve to `{ kind: 'unknown' }` and a placeholder.
- **Seeded PRNG** (mulberry32/xorshift) — the determinism foundation. Same seed ⇒ same value stream. All randomness must route through it; never call `Math.random()` in library code.
- **Value generators** — primitive generators (string/number/integer/boolean/date), then composites (objects/arrays/tuples/records), modifiers (optional/nullable/default), unions/enums/literals, and constraint/format-aware values (min/max, length, regex, uuid/email/url/…).
- **Public entry points** — `generate(schema, opts)`, `generateMany(schema, count, opts)`, and `generateRelational(schemas, { counts, relations, seed })` which generates parents first then assigns child foreign keys from real parent keys.

`src/index.ts` is the single barrel export (`exports` map points only here).

## Non-negotiable design principles

1. **Determinism by default** — identical `seed` must always yield identical output across runs/machines. All randomness flows through the seeded PRNG.
2. **Zero validator runtime deps; no consumer adapters** — validators are the *consumer's* dependency; the public API reaches a schema only through `~standard`. Don't add runtime deps and don't `import` any validator. Vendor introspection *does* read validator internals, but only in the centralized, `vendor`-keyed `src/introspect/` layer, through `unknown`-typed access (no validator import) — and validators appear only as devDeps. Consumers never write per-library adapter glue.
3. **Output must validate** — the goal is `schema.parse(generate(schema))` succeeds. Unsupported/opaque nodes fall back to a constraint-satisfying placeholder rather than throwing.
4. **ESM-only, tree-shakeable** — `sideEffects: false`; no top-level side effects.

## Conventions

- **Style is enforced by Biome** (`biome.json`): single quotes, semicolons as-needed (omit them), 2-space indent, 100-col width, organized imports. Run `npm run format`; don't hand-fight these.
- **TypeScript is strict** with `noUncheckedIndexedAccess` (indexed access is `T | undefined` — guard it), `verbatimModuleSyntax` (use `import type` / `export type` for type-only imports), and `isolatedModules`.
- Commits follow Conventional Commits (e.g. `chore:`, `feat:`).
