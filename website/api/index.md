# API Reference

Public surface of `fixture-gen`.

## Core generation

### `generate(schema, options?)`

Generate a single fixture from a Standard Schema or supported schema object.

```ts
function generate<T>(
  schema: StandardSchemaV1<unknown, T>,
  options?: GenerateOptions<T>,
): T
```

### `generateMany(schema, count, options?)`

Generate `count` fixtures with derived deterministic seeds.

```ts
function generateMany<T>(
  schema: StandardSchemaV1<unknown, T>,
  count: number,
  options?: GenerateOptions<T>,
): T[]
```

### `generateRelational(schemas, options)`

Generate multiple named record sets and resolve foreign-key relationships between them.

```ts
function generateRelational<S extends Record<string, StandardSchemaV1>>(
  schemas: S,
  options: RelationalOptions<S>,
): { [K in keyof S]: InferOutput<S[K]>[] }
```

---

## Options

### `GenerateOptions<T>`

```ts
interface GenerateOptions<T> {
  /** Seed for deterministic output. Same seed → same data. */
  seed?: number
  /** Force specific top-level field values, bypassing generation. */
  overrides?: Partial<T>
  /** Field-path keyed custom generators. `*` matches one path segment. */
  generators?: Record<string, CustomGenerator>
  /** Schema-wide hook that can override any node. */
  generator?: CustomGenerator
  /** Named scenario controlling generation behavior. */
  scenario?: BuiltinScenario | string
  /** Field paths (dot-separated) that must be unique across all generateMany records. */
  unique?: string[]
  /** Post-generation hook: return field overrides to enforce cross-field invariants. */
  refine?: (record: T) => Partial<T> | undefined
}
```

### `RelationalOptions<S>`

```ts
interface RelationalOptions<S> {
  seed?: number
  /** How many records to generate per schema key. */
  counts: { [K in keyof S]?: number }
  /** Map `"childTable.field": "parentTable.field"` to link foreign keys. */
  relations?: Record<string, string>
  /** Named scenario applied to all tables during generation. */
  scenario?: BuiltinScenario | string
  /** Post-generation hooks: each receives the full row set and may mutate records. */
  rules?: Array<(tables: Record<string, unknown[]>) => void>
}
```

### Custom generation types

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

- `generators` — field-path keyed map of custom generator functions
- `generator` — schema-wide hook that runs on every node
- `overrides` — applies after generation; highest-priority top-level pin

---

## Scenarios

### `defineScenario(name, input)`

Register a named scenario for use with `generate({ scenario: name })`.

```ts
type BuiltinScenario =
  | 'happy-path'
  | 'empty-state'
  | 'boundary-min'
  | 'boundary-max'
  | 'invalid'
  | 'missing-subtree'

// Overrides object (may include `extends` to inherit from another scenario)
defineScenario('admin-user', { role: 'admin' })
defineScenario('empty-admin', { extends: 'empty-state', role: 'admin' })

// Factory function
defineScenario<User>('premium-user', (value) => ({ ...value, plan: 'premium' }))
```

### `clearScenarios()`

Clear all user-defined scenarios. Use in test teardown to avoid cross-test pollution:

```ts
import { clearScenarios } from 'fixture-gen'

afterEach(() => clearScenarios())
```

---

## JSON Schema / OpenAPI

### `generateFromJsonSchema(schema, options?)`

Generate a fixture from a JSON Schema object.

```ts
function generateFromJsonSchema(
  schema: object,
  options?: GenerateOptions<unknown>,
): unknown
```

### `generateFromOpenApi(spec, schemaName, options?)`

Extract a named component schema from an OpenAPI 3.x document and generate a fixture.

```ts
function generateFromOpenApi(
  spec: object,
  schemaName: string,
  options?: GenerateOptions<unknown>,
): unknown
```

### `toJsonSchema(schema)`

Export a Standard Schema (or TypeBox schema) as a JSON Schema object.

```ts
function toJsonSchema(schema: unknown): object
```

---

## Supporting types

| Type | Description |
|------|-------------|
| `InferOutput<S>` | Infers the validated output type for a Standard Schema |
| `StandardSchemaV1` | Minimal internal declaration of the Standard Schema interface |
| `VERSION` | Package release marker string |

---

## Guides

- [Deterministic generation](/guide/determinism)
- [Overrides & generators](/guide/overrides-generators)
- [Scenarios](/guide/scenarios)
- [Relational generation](/guide/relational)
- [Advanced constraints](/guide/advanced-constraints)
- [JSON Schema & OpenAPI](/guide/json-schema-openapi)
