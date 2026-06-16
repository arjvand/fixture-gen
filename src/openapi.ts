import { generate } from './generate'
import type { GenerateOptions } from './generate'
import type { JSONSchema } from './introspect/json-schema'
import type { StandardSchemaV1 } from './standard'

export interface OpenAPIObject {
  openapi: string
  info: { title: string; version: string }
  components?: {
    schemas?: Record<string, JSONSchema>
  }
  [key: string]: unknown
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function resolveJsonPointer(obj: unknown, pointer: string): unknown {
  if (!pointer || !pointer.startsWith('/')) return obj
  const parts = pointer
    .split('/')
    .slice(1)
    .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'))
  let cur: unknown = obj
  for (const part of parts) {
    if (!isObject(cur)) return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

function resolveLocalRef(ref: string, root: OpenAPIObject): JSONSchema | undefined {
  const hashIndex = ref.indexOf('#')
  const fragment = hashIndex >= 0 ? ref.slice(hashIndex + 1) : ''
  if (fragment.startsWith('/')) {
    const resolved = resolveJsonPointer(root, fragment)
    if (isObject(resolved)) return resolved as JSONSchema
  }
  return undefined
}

function deepResolveRefs(schema: unknown, root: OpenAPIObject, visited: Set<string>): unknown {
  if (!isObject(schema)) return schema
  if (Array.isArray(schema)) {
    return schema.map((item) => deepResolveRefs(item, root, visited))
  }

  const typed = schema as Record<string, unknown>

  if (typeof typed.$ref === 'string') {
    const refValue = typed.$ref as string
    if (visited.has(refValue)) {
      return { type: 'object' }
    }
    const resolved = resolveLocalRef(refValue, root)
    if (resolved) {
      const nextVisited = new Set(visited)
      nextVisited.add(refValue)
      return deepResolveRefs(resolved, root, nextVisited)
    }
    return typed
  }

  const result: Record<string, unknown> = {}
  for (const key of Object.keys(typed)) {
    result[key] = deepResolveRefs(typed[key], root, visited)
  }
  return result
}

/**
 * Generate a fixture from an OpenAPI 3.x spec component schema.
 *
 * Resolves local `$ref` pointers (`#/components/schemas/...`,
 * `#/$defs/...`, `#/definitions/...`) and handles circular references.
 *
 * @example
 * ```ts
 * const spec = {
 *   openapi: '3.0.0',
 *   info: { title: 'API', version: '1.0.0' },
 *   components: {
 *     schemas: {
 *       User: {
 *         type: 'object',
 *         properties: {
 *           id: { type: 'string', format: 'uuid' },
 *           name: { type: 'string' },
 *         },
 *         required: ['id', 'name'],
 *       },
 *     },
 *   },
 * }
 *
 * const fixture = generateFromOpenApi(spec, 'User', { seed: 42 })
 * ```
 */
export function generateFromOpenApi(
  spec: OpenAPIObject,
  schemaName: string,
  options?: GenerateOptions,
): unknown {
  const schemas = spec.components?.schemas
  if (!schemas) {
    throw new Error('fixture-gen: OpenAPI spec has no components/schemas')
  }
  const schema = schemas[schemaName]
  if (!schema) {
    throw new Error(`fixture-gen: schema "${schemaName}" not found in OpenAPI components/schemas`)
  }

  const resolved = deepResolveRefs(schema, spec, new Set())
  const defs = (resolved as Record<string, unknown>).$defs as Record<string, JSONSchema> | undefined

  const wrapped = {
    '~standard': {
      vendor: 'json-schema',
      version: 1,
      validate: (value: unknown) => ({ value }),
    },
    __jsonSchema: resolved,
    ...(defs ? { __jsonSchemaDefs: defs } : {}),
  }
  return generate(wrapped as unknown as StandardSchemaV1, options)
}
