---
description: Frequently asked questions about fixture-gen — Faker vs. schema-derived fixtures, differences from zod-mock, fast-check comparison, and validator support.
---

# FAQ

## Why not just use Faker or hand-written factories?

Faker produces realistic strings, but it does not know your schema — emails may pass, required nested objects may not, and enums can still be wrong. Hand-written factories drift the moment a field is renamed or a constraint tightens.

`fixture-gen` generates from the schema you already validate against, so fixtures stay in sync. Use [overrides](/guide/overrides-generators) when a test needs a fixed value; generate the rest.

For a side-by-side view, see [Comparison](/guide/comparison).

## How is this different from `zod-mock` / `zod-fixture`?

Those tools target Zod only. `fixture-gen` is schema-agnostic (Zod, Valibot, ArkType, TypeBox, JSON Schema, OpenAPI), adds relational FK linking, named scenarios, uniqueness / refine hooks, and a CLI for snapshot drift detection.

If you are all-in on Zod and need none of that, a Zod-only mocker can be enough. See [Comparison](/guide/comparison).

## How is this different from property-based testing (fast-check)?

**fast-check** explores many random inputs and shrinks failures — ideal for property tests. **fixture-gen** produces fixed, seed-stable fixtures for unit, UI, Storybook, and e2e tests where you want the same payload every run.

They solve different problems; many teams use both.

## Will generated data pass my validator?

Yes for valid scenarios — that is the design goal. Output is built to satisfy the same schema you validate against, so `schema.parse(generate(schema))` (or the equivalent Standard Schema validate) succeeds.

The `'invalid'` [scenario](/guide/scenarios) is the deliberate exception: it produces a wrong-type root value for error-path tests.

## How do I keep fixtures stable in CI?

Always pass an explicit `seed`. Same seed → same data on every machine.

```ts
const user = generate(UserSchema, { seed: 42 })
```

For schema drift that would change fixture shape, use the [CLI](/guide/cli) `snapshot` / `diff` workflow in CI.

## What if a field needs a fixed value for this test?

Use `overrides` for top-level pins, or `generators` for computed field paths:

```ts
generate(UserSchema, {
  seed: 1,
  overrides: { role: 'admin' },
})
```

See [Overrides & generators](/guide/overrides-generators).

## Does it support custom field generators?

Yes — `overrides` for fixed top-level values, `generators` for field-path keyed computed values, and `generator` for schema-wide hooks.

See [Overrides & generators](/guide/overrides-generators).

## How does it pick realistic values?

It inspects the schema's type and constraints (formats like `uuid` / `email`, `min` / `max`, length, enums, patterns) and generates values that satisfy them — seeded so they stay reproducible.

## What happens with a schema type it doesn't understand?

Unsupported or opaque types fall back to a constraint-satisfying placeholder. You can always pin those fields with `overrides`, and unknown formats surface a warning so they are easy to spot.

## Can I generate from OpenAPI or JSON Schema without a validator package?

Yes. Use `generateFromJsonSchema` or `generateFromOpenApi` — no Zod/Valibot install required for contract-first workflows.

See [JSON Schema & OpenAPI](/guide/json-schema-openapi).

## Which validators are supported?

Anything that implements [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType, and others), plus TypeBox schemas detected by their kind symbol. You can also generate from JSON Schema and OpenAPI without a validator package.

## Does TypeScript infer the fixture type?

Yes. Output is inferred from your schema, so fixtures match the types you already validate against.

## Does it work in the browser / edge?

Yes. There are no native bindings. Supported runtimes: Node.js, Bun, Deno, and edge runtimes (Cloudflare Workers, Vercel Edge, etc.).

## What about TypeBox formats?

TypeBox schemas work directly, but its runtime checker only validates registered formats. If you use `format: "uuid"` or similar, register the matching predicate in TypeBox's `FormatRegistry` before validating generated values.

## Is there a Vitest / Jest / Playwright integration?

Yes — thin plugins with `fixtureFactory` and per-test seed reset. See the [Ecosystem](/ecosystem/) plugins.

## License

MIT. See the [fixture-gen repository](https://github.com/arjvand/fixture-gen).
