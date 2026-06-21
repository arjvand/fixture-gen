# AGENTS.md

> Compact instructions for OpenCode sessions working on fixture-gen.
> See [CLAUDE.md](./CLAUDE.md) for the comprehensive project guide (commands, architecture, design principles, conventions).

## Quick reference

- **Package manager**: npm (committed lockfile; CI runs `npm ci`)
- **ESM only**: `"type": "module"`; use `import`/`export` throughout
- **Zero runtime deps**: all validators are devDependencies; never `import` them in library code
- **Single barrel**: `src/index.ts` is the only exports entrypoint
- **CLI entry**: `src/cli/index.ts` → `dist/cli.js` via tsup
- **Node**: `>= 18` required (`engines` field in package.json)

## Commands (in order of `check`)

```bash
npm run lint        # biome check . (lint + format + import-order)
npm run typecheck   # tsc --noEmit
npm run build       # tsup → dist/ (lib: ESM+CJS+dts, CLI: ESM)
npm run size        # size-limit (budget: 20 kB for dist/index.js)
npm run test:runtime # scripts/runtime-smoke.sh — cross-runtime smoke
npm test            # vitest run (full suite)
npm run check       # lint → typecheck → build → size → test:runtime → test
```

## Testing

- **Vitest globals OFF**: always `import { describe, it, expect } from 'vitest'`
- **Test locations**: `test/**/*.test.ts` or `src/**/*.test.ts`
- **Unit tests**: `npm run test:unit` — excludes `cross-validator.test.ts`
- **Per-vendor compat**: `CROSS_VALIDATOR_VENDOR=zod npm run test:compat`
- **Per-runtime smoke**: `RUNTIME_SMOKE_TARGET=node npm run test:runtime`
- **Single test**: `npx vitest run test/smoke.test.ts` or `npx vitest run -t "test name"`

## Architecture

- **Introspection**: `~standard.vendor`-keyed dispatch in `src/introspect/`. Unknown vendors → `{ kind: 'unknown' }`.
- **PRNG**: mulberry32 (`src/prng.ts`) — NEVER use `Math.random()` in library code.
- **Seeds**: `deriveSeed()` in `src/hash.ts` derives per-field seeds from base seed + path.
- **TypeBox**: detected by `Symbol(TypeBox.Kind)` — not through `~standard` (TypeBox doesn't implement it).
- **JSON Schema / OpenAPI bridge**: `generateFromJsonSchema`, `generateFromOpenApi`, `toJsonSchema` in `src/json-schema.ts`, `src/openapi.ts`, `src/to-json-schema.ts` — generate fixtures directly from JSON Schema or OpenAPI specs without a validator.

## Style

- **Biome**: single quotes, semicolons-as-needed, 2-space indent, 100-col width, organized imports. Run `npm run format`; don't hand-format.
- **TypeScript strict**: `noUncheckedIndexedAccess`, `verbatimModuleSyntax` (`import type`/`export type`), `isolatedModules`.
- **Commits**: Conventional Commits (`feat:`, `chore:`, etc.).
- **`.editorconfig`**: spaces, 2 indent, LF, trailing newline.

## Gotchas

- `dist/` is gitignored; build before running smoke tests.
- Cross-validator tests are slow — run serially per-vendor in CI matrix.
- Edge runtime smoke uses `@edge-runtime/vm` — works on Node; no browser needed.
- `clearScenarios()` in test teardown avoids cross-test pollution from `defineScenario`.
