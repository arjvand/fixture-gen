# Deterministic generation

The same `seed` always yields identical output — ideal for snapshot tests and reproducible CI.

**When to use this:** any test, story, or pipeline where a changing fixture would cause flaky snapshots, hard-to-reproduce failures, or “works on my machine” noise. Prefer an explicit seed in tests; if you omit it, values are not guaranteed to match across runs.

## Seeds

```ts
const a = generate(User, { seed: 7 })
const b = generate(User, { seed: 7 })
// a deep-equals b  ✅

const c = generate(User, { seed: 8 })
// c differs from a ✅
```

When you omit `seed`, generation still works, but values are not guaranteed to match across runs. Prefer an explicit seed in tests.

## Batches with `generateMany`

```ts
import { generateMany } from 'fixture-gen'

const users = generateMany(User, 10, { seed: 42 })
// User[] of length 10, deterministic for the given seed
```

Each index derives a stable child seed from the base seed, so reordering calls in your suite does not scramble earlier items as long as you regenerate with the same seed and count.

## Why determinism matters

| Use case | Benefit |
|----------|---------|
| Snapshot tests | Fixtures don't thrash on every CI run |
| Debugging failures | Reproduce the exact payload from a seed |
| Parallel CI | Same seed → same data on every machine |
| Storybook | Stable visual baselines |

## How it works (briefly)

`fixture-gen` uses a seeded PRNG (mulberry32). Per-field values are derived from the base seed plus the field path, so changing one optional field does not cascade random noise into unrelated siblings the way a single global `Math.random()` stream would.

Library code never calls `Math.random()`.

## Related

- [Overrides & generators](/guide/overrides-generators) — pin or compute specific fields
- [CLI](/guide/cli) — snapshot and diff fixtures for drift detection
- [Scenarios](/guide/scenarios) — named shapes that stay deterministic under a seed
