---
layout: home

hero:
  name: fixture-gen
  text: Schema-valid fixtures, every time
  tagline: Generate deterministic test data from your existing TypeScript validators — Zod, Valibot, ArkType, TypeBox, and more. No hand-written factories. No adapter code.
  image:
    src: /logo.png
    alt: fixture-gen
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/arjvand/fixture-gen
    - theme: alt
      text: npm
      link: https://www.npmjs.com/package/fixture-gen

features:
  - icon: 🔌
    title: Standard Schema native
    details: Works with Zod, Valibot, and ArkType through the shared ~standard interface, and understands TypeBox directly. Point it at your existing schemas.
  - icon: 🎲
    title: Seeded determinism
    details: Pass a seed and the same schema always produces the same data — stable snapshots and assertions across runs and machines.
  - icon: 🔗
    title: Relational generation
    details: Generate connected record sets where child rows reference real parent keys, so foreign keys actually resolve.
  - icon: 🎭
    title: Scenario-first
    details: Named intent-bearing cases — happy-path, empty-state, boundary-min, boundary-max, invalid, missing-subtree — plus defineScenario for your own.
  - icon: 🔒
    title: Advanced constraints
    details: Cross-record uniqueness, refine hooks for multi-field invariants, and business-rule hooks across generateRelational.
  - icon: 🪶
    title: Minimal runtime
    details: Pure TypeScript, zero binary dependencies. Runs on Node.js, Bun, Deno, and edge runtimes. Fully typed output.
---

## Quick taste

```ts
import { generate } from 'fixture-gen'
import { z } from 'zod'

const User = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(18).max(99),
})

const user = generate(User, { seed: 42 })
// {
//   id: '1f8c...-uuid',
//   name: 'Felicia Bartell',
//   email: 'orval.kihn@example.com',
//   age: 37,
// }
```

Same call works with Valibot, ArkType, and TypeBox — no adapters.

```bash
npm install -D fixture-gen
```

[Continue to the guide →](/guide/getting-started)
