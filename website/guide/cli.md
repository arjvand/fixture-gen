---
description: The fixture-gen CLI generates fixtures, saves snapshots, diffs engine output, and watches schema changes — catch schema drift in CI.
---

# CLI

Catch schema drift in CI before tests go green on stale fixtures. The CLI generates fixtures, saves snapshots, diffs output, and watches schema changes.

**When to use this:** pipeline checks that fixture shape still matches the schema, or local generation of snapshot files for review.

## Install

The binary is included when you install the package:

```bash
npm install -D fixture-gen
# or globally:
npm install -g fixture-gen
```

## Commands

### `generate`

Write a fixture to stdout or a file:

```bash
fixture-gen generate path/to/schema.js --seed 42
fixture-gen generate path/to/schema.js --format ts --out fixtures/user.ts
```

### `snapshot`

Save a snapshot to disk (for drift detection):

```bash
fixture-gen snapshot path/to/schema.js --dir fixtures/ --seed 42
```

### `diff`

Compare current engine output against stored snapshots; exit non-zero on drift (CI-friendly):

```bash
fixture-gen diff path/to/schema.js --dir fixtures/ --seed 42
# exits 0 if output matches snapshot, 1 if drift detected

# Machine-readable JSON diff (for PR bots):
fixture-gen diff path/to/schema.js --dir fixtures/ --format json
```

### `watch`

Re-run on schema change and print what changed:

```bash
fixture-gen watch path/to/schema.js --seed 42
```

## Output formats

| Flag | Output |
|------|--------|
| `--format json` | Pretty-printed JSON (default) |
| `--format jsonl` | Single-line JSON (for piping) |
| `--format ts` | `export const fixture = {...} as const` |

## Schema file format

The CLI expects a `.js` or `.mjs` file exporting a Standard Schema validator as its **default** export:

```js
// schemas/user.js
import { z } from 'zod'
export default z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
})
```

::: tip TypeScript schemas
Compile with `tsc` first, or run the CLI via `tsx` / `bun`:

```bash
bunx fixture-gen generate schemas/user.ts --seed 1
```
:::

## CI integration — drift detection

Add fixture drift detection so schema changes that silently alter fixture shape are caught before merge:

```yaml
# .github/workflows/ci.yml
- name: Check fixture drift
  run: |
    fixture-gen diff schemas/user.js --dir fixtures/ --seed 0
    fixture-gen diff schemas/post.js --dir fixtures/ --seed 0
```

### Recommended workflow

1. **Commit a baseline:**  
   `fixture-gen snapshot schemas/user.js --dir fixtures/` → commit `fixtures/user-default-seed0.json`
2. **CI on every PR:**  
   `fixture-gen diff schemas/user.js --dir fixtures/`
3. **On intentional schema change:**  
   Review the diff locally, update the snapshot with `fixture-gen snapshot`, and commit the updated JSON.
