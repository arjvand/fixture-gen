# Overrides & custom generators

Pin the fields your test cares about; generate the rest. Three layers control values without abandoning schema-driven fixtures.

**When to use this:** a test needs a fixed `role: 'admin'`, a computed slug, or a project-wide rule for certain field kinds.

## Priority (highest → lowest)

1. **`overrides`** — pin top-level fields after generation
2. **Field `generators`** — compute values for specific paths during generation
3. **Schema-wide `generator`** — hook every node
4. **Default engine** — constraint-satisfying random (seeded)

## Overrides

Force known values when a test needs them:

```ts
const admin = generate(User, {
  seed: 42,
  overrides: { name: 'Ada Lovelace', age: 36 },
})
```

`overrides` is the highest-priority top-level pin and applies after generation.

## Field-path generators

Use `generators` when a field needs a **computed** value instead of a fixed one:

```ts
const user = generate(User, {
  seed: 42,
  generators: {
    'profile.slug': ({ prng }) => `slug-${prng.string(6)}`,
  },
})
```

Keys are field paths. `*` matches one path segment (useful for list items and dynamic keys).

## Schema-wide generator

Run a hook on every introspected node:

```ts
const user = generate(User, {
  seed: 42,
  generator: ({ node, pathKey }) => {
    if (node.kind === 'string' && pathKey === 'tag') return 'schema-wide'
    return undefined // fall through to default generation
  },
})
```

Return `undefined` to leave the node to the default engine (or a more specific field generator).

## Generate context

```ts
interface GenerateContext {
  path: readonly string[]
  pathKey: string
  node: IntrospectedNode
  seed: number
  prng: Prng
}

type CustomGenerator = (context: GenerateContext) => unknown
```

Use `prng` for any randomness you introduce so output stays seed-deterministic.

## Combining with scenarios

```ts
generate(User, {
  seed: 1,
  scenario: 'empty-state',
  overrides: { role: 'admin' },
})
```

Scenarios shape structure; overrides and generators still apply on top. See [Scenarios](/guide/scenarios).
