import type { GenerateOptions } from './generate'
import { generate } from './generate'
import type { JSONSchema } from './introspect/json-schema'
import type { StandardSchemaV1 } from './standard'

/**
 * Generate a fixture directly from a JSON Schema object.
 *
 * Scenarios, overrides, generators, refine, and unique all pass through to
 * the underlying generation engine.
 *
 * @example
 * ```ts
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     id: { type: 'string', format: 'uuid' },
 *     name: { type: 'string' },
 *   },
 *   required: ['id', 'name'],
 * }
 *
 * const fixture = generateFromJsonSchema(schema, { seed: 42 })
 * ```
 */
export function generateFromJsonSchema(schema: JSONSchema, options?: GenerateOptions): unknown {
  const defs = schema.$defs ?? schema.definitions
  const wrapped = {
    '~standard': {
      vendor: 'json-schema',
      version: 1,
      validate: (value: unknown) => ({ value }),
    },
    __jsonSchema: schema,
    ...(defs ? { __jsonSchemaDefs: defs } : {}),
  }
  return generate(wrapped as unknown as StandardSchemaV1, options)
}
