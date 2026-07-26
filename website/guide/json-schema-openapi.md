# JSON Schema & OpenAPI

Generate fixtures directly from JSON Schema objects and OpenAPI 3.x specs — **no Zod, Valibot, or other validator package required**. Ideal for contract-first APIs and shared OpenAPI specs.

**When to use this:** the source of truth is a JSON Schema or OpenAPI document rather than a TypeScript validator.

## `generateFromJsonSchema`

Pass any JSON Schema object (Draft 2020-12, Draft 7, etc.) and get a deterministic, constraint-satisfying fixture:

```ts
import { generateFromJsonSchema } from 'fixture-gen'

const fixture = generateFromJsonSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', minLength: 2, maxLength: 50 },
      age: { type: 'integer', minimum: 18, maximum: 99 },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['id', 'name', 'age'],
  },
  { seed: 42 },
)
// { id: '...uuid...', name: '...', age: 37, tags: [...] }
```

All options (`seed`, `overrides`, `scenario`, `generators`, `refine`) pass through:

```ts
generateFromJsonSchema(schema, { seed: 1, scenario: 'empty-state' })
generateFromJsonSchema(schema, { seed: 1, overrides: { name: 'Ada' } })
```

### Supported JSON Schema features

- `type`, `format`
- `minLength` / `maxLength` / `pattern`
- `minimum` / `maximum` / `exclusiveMinimum` / `exclusiveMaximum`
- `properties` / `required` / `patternProperties`
- `items` / `prefixItems` / `minItems` / `maxItems` / `uniqueItems`
- `enum`, `const`
- `anyOf` / `oneOf` (union)
- `allOf` (object merge)
- `$ref` via `$defs` / `definitions`
- Circular ref detection

---

## `generateFromOpenApi`

Extract a named schema from an OpenAPI 3.x spec, resolve local `$ref` links, and generate a fixture:

```ts
import { generateFromOpenApi } from 'fixture-gen'

const spec = {
  openapi: '3.0.0',
  info: { title: 'API', version: '1.0.0' },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          address: { $ref: '#/components/schemas/Address' },
        },
        required: ['id', 'name'],
      },
      Address: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          zip: { type: 'string' },
        },
        required: ['city'],
      },
    },
  },
}

const user = generateFromOpenApi(spec, 'User', { seed: 42 })
// { id: 123, name: '...', address: { city: '...', zip: '...' } }
```

Local `$ref` pointers (`#/components/schemas/...`, `#/$defs/...`, `#/definitions/...`) are resolved automatically. Circular references are detected and replaced with a placeholder.

::: warning Cross-file `$ref`
Cross-file `$ref` is **not** supported — bundle your spec first if it uses external files.
:::

---

## `toJsonSchema`

Export any Standard Schema as a JSON Schema object. Delegates to vendor-native methods where available and falls back to a generic converter via the introspection layer:

```ts
import { z } from 'zod'
import { Type } from '@sinclair/typebox'
import { type } from 'arktype'
import { toJsonSchema } from 'fixture-gen'

// Zod v4+ → delegates to .toJSONSchema()
toJsonSchema(z.object({ name: z.string().min(3) }))

// TypeBox → cloned and returned (already JSON Schema)
toJsonSchema(Type.String({ format: 'uuid' }))

// ArkType / Valibot → inferred via introspection
toJsonSchema(type({ id: 'number', name: 'string' }))
```

---

## AI structured-output contracts

Use `generateFromJsonSchema` to test AI function-calling / tool-use response schemas before integrating with an LLM provider:

```ts
const toolSchema = {
  type: 'object',
  properties: {
    symbol: { type: 'string', pattern: '^[A-Z]{1,5}$' },
    quantity: { type: 'integer', minimum: 1, maximum: 10000 },
    orderType: { type: 'string', enum: ['market', 'limit', 'stop'] },
  },
  required: ['symbol', 'quantity', 'orderType'],
}

const fixture = generateFromJsonSchema(toolSchema, { seed: 1 })
// { symbol: 'ABC', quantity: 42, orderType: 'market' }
```
