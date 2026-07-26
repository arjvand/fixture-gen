# FAQ

## Does it support custom field generators?

Yes — use `overrides` for fixed top-level values, `generators` for field-path keyed computed values, and `generator` for schema-wide hooks.

See [Overrides & generators](/guide/overrides-generators).

## How does it pick realistic values?

It inspects the schema's type and constraints (formats like `uuid` / `email`, `min` / `max`, length, enums, patterns) and generates values that satisfy them — seeded so they stay reproducible.

## What happens with a schema type it doesn't understand?

Unsupported or opaque types fall back to a constraint-satisfying placeholder. You can always pin those fields with `overrides`, and unknown formats surface a warning so they're easy to spot.

## What about TypeBox formats?

TypeBox schemas work directly, but its runtime checker only validates registered formats. If you use `format: "uuid"` or similar, register the matching predicate in TypeBox's `FormatRegistry` before validating generated values.

## Will generated data pass my validator?

That's the goal: output is produced to satisfy the same schema you validate against, so `schema.parse(generate(schema))` (or the equivalent Standard Schema validate) succeeds for valid scenarios.

The `'invalid'` scenario is the deliberate exception — it produces a wrong-type root value for error-path tests.

## Which validators are supported?

Anything that implements [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType, and others), plus TypeBox schemas detected by their kind symbol. You can also generate from JSON Schema and OpenAPI without a validator package.

## Does it work in the browser / edge?

Yes. There are no native bindings. Supported runtimes: Node.js, Bun, Deno, and edge runtimes (Cloudflare Workers, Vercel Edge, etc.).

## How do I keep fixtures stable in CI?

Always pass an explicit `seed`. For schema drift that would change fixture shape, use the [CLI](/guide/cli) `snapshot` / `diff` workflow in CI.

## Is there a Vitest / Jest / Playwright integration?

Yes — see the [Ecosystem](/ecosystem/) plugins.

## License

MIT. See the [fixture-gen repository](https://github.com/arjvand/fixture-gen).
