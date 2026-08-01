---
description: Install fixture-gen for Node.js, Bun, Deno, and edge runtimes. Includes a CLI binary and ecosystem plugins for Vitest, Jest, and Playwright.
---

# Install

Add `fixture-gen` as a dev dependency, then generate fixtures in tests, stories, and scripts.

## Package managers

```bash
npm install -D fixture-gen
# pnpm add -D fixture-gen
# yarn add -D fixture-gen
# bun add -d fixture-gen
```

`fixture-gen` is typically a **dev dependency** — you generate fixtures in tests, stories, and scripts, not in production bundles.

## Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | `>= 18` |
| TypeScript (optional) | `>= 5` recommended |

Validators (Zod, Valibot, ArkType, TypeBox) are **not** bundled. Install only the ones you already use.

## Deno

```ts
import { generate } from 'npm:fixture-gen'
```

## Supported runtimes

- Node.js
- Bun
- Deno
- Edge runtimes (Cloudflare Workers, Vercel Edge, and similar)

Ships ESM with type definitions and a CJS build for require consumers. No native bindings.

## Ecosystem plugins

Install only the plugin for your test runner:

```bash
npm install -D @fixture-gen/vitest      # peer: vitest >= 1
npm install -D @fixture-gen/jest        # peer: jest >= 29
npm install -D @fixture-gen/playwright  # peer: @playwright/test >= 1.40
```

See the [Ecosystem](/ecosystem/) section for usage.

## CLI binary

Installing `fixture-gen` also provides the `fixture-gen` CLI:

```bash
npx fixture-gen generate path/to/schema.js --seed 42
```

Or install globally:

```bash
npm install -g fixture-gen
```

Full CLI docs: [CLI](/guide/cli).
