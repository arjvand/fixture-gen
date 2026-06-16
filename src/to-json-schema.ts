import type { IntrospectedNode, NumberConstraints } from './introspect'
import { introspect } from './introspect'
import type { JSONSchema } from './introspect/json-schema'

const TYPEBOX_KIND = 'Symbol(TypeBox.Kind)'

const isObject = (value: unknown): value is Record<string, unknown> =>
  (typeof value === 'object' || typeof value === 'function') && value !== null

function hasTypeBoxKind(value: unknown): boolean {
  return (
    isObject(value) &&
    Object.getOwnPropertySymbols(value).some((symbol) => symbol.toString() === TYPEBOX_KIND)
  )
}

/**
 * Convert a Standard Schema (or TypeBox schema) to a JSON Schema object.
 *
 * Uses vendor-native methods where available:
 * - TypeBox schemas are already JSON Schema — cloned and returned as-is.
 * - Zod v4+ schemas expose `.toJSONSchema()` — delegated.
 * - ArkType schemas expose `.json` — returned.
 * - Valibot and others fall back to an inferred converter via the introspection layer.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { toJsonSchema } from 'fixture-gen'
 *
 * const jsonSchema = toJsonSchema(z.object({ name: z.string() }))
 * ```
 */
export function toJsonSchema(schema: unknown): JSONSchema {
  if (!isObject(schema)) return { type: 'unknown' }

  // TypeBox — already JSON Schema
  if (hasTypeBoxKind(schema)) {
    return cloneJsonSchema(schema as unknown as JSONSchema)
  }

  // Zod v4+ — delegate to native method
  const toJsonSchemaFn = (schema as Record<string, unknown>).toJSONSchema as unknown as
    | (() => unknown)
    | undefined
  if (typeof toJsonSchemaFn === 'function') {
    const result = toJsonSchemaFn()
    if (isObject(result)) return result as unknown as JSONSchema
  }

  // Fallback: introspect → generic converter
  const node = introspect(schema)
  return introspectedNodeToJsonSchema(node)
}

function introspectedNodeToJsonSchema(node: IntrospectedNode): JSONSchema {
  switch (node.kind) {
    case 'string': {
      const s: JSONSchema = { type: 'string' }
      const c = node.constraints
      if (c) {
        if (c.format) s.format = c.format
        if (c.minLength !== undefined) s.minLength = c.minLength
        if (c.maxLength !== undefined) s.maxLength = c.maxLength
        if (c.pattern) s.pattern = c.pattern.source
      }
      return s
    }
    case 'number':
    case 'integer': {
      const s: JSONSchema = {
        type: node.kind,
      }
      applyNumberConstraints(s, node.constraints)
      return s
    }
    case 'boolean':
      return { type: 'boolean' }
    case 'date':
      return { type: 'string', format: 'date-time' }
    case 'null':
      return { type: 'null' }
    case 'object': {
      const properties: Record<string, JSONSchema> = {}
      const required: string[] = []
      for (const [key, entry] of Object.entries(node.entries)) {
        if (entry) {
          const unwrapped = unwrapOptional(entry)
          properties[key] = introspectedNodeToJsonSchema(unwrapped.node)
          if (!unwrapped.isOptional) required.push(key)
        }
      }
      const result: JSONSchema = { type: 'object', properties }
      if (required.length > 0) result.required = required
      return result
    }
    case 'array': {
      const s: JSONSchema = {
        type: 'array',
        items: introspectedNodeToJsonSchema(node.element),
      }
      const c = node.constraints
      if (c) {
        if (c.minLength !== undefined) s.minItems = c.minLength
        if (c.maxLength !== undefined) s.maxItems = c.maxLength
        if (c.uniqueItems) s.uniqueItems = true
      }
      return s
    }
    case 'set': {
      const s: JSONSchema = {
        type: 'array',
        items: introspectedNodeToJsonSchema(node.element),
        uniqueItems: true,
      }
      const c = node.constraints
      if (c) {
        if (c.minLength !== undefined) s.minItems = c.minLength
        if (c.maxLength !== undefined) s.maxItems = c.maxLength
      }
      return s
    }
    case 'tuple': {
      const prefixItems = node.elements.map(introspectedNodeToJsonSchema)
      const s: JSONSchema = {
        type: 'array',
        prefixItems,
        minItems: node.elements.length,
      }
      if (node.rest) {
        s.items = introspectedNodeToJsonSchema(node.rest)
        s.maxItems = node.elements.length + 3
      } else {
        s.maxItems = node.elements.length
      }
      return s
    }
    case 'record':
      return {
        type: 'object',
        additionalProperties: introspectedNodeToJsonSchema(node.value),
      }
    case 'union':
      return { anyOf: node.members.map(introspectedNodeToJsonSchema) }
    case 'enum':
      return { enum: [...node.values] }
    case 'literal':
      return { const: node.value }
    case 'optional':
      return introspectedNodeToJsonSchema(node.inner)
    case 'nullable':
      return {
        anyOf: [introspectedNodeToJsonSchema(node.inner), { type: 'null' }],
      }
    case 'default':
    case 'catch':
      return introspectedNodeToJsonSchema(node.inner)
    default:
      return {}
  }
}

function applyNumberConstraints(
  schema: JSONSchema,
  constraints: NumberConstraints | undefined,
): void {
  if (!constraints) return
  if (constraints.min !== undefined) {
    if (constraints.minInclusive === false) {
      schema.exclusiveMinimum = constraints.min
    } else {
      schema.minimum = constraints.min
    }
  }
  if (constraints.max !== undefined) {
    if (constraints.maxInclusive === false) {
      schema.exclusiveMaximum = constraints.max
    } else {
      schema.maximum = constraints.max
    }
  }
}

interface UnwrapResult {
  node: IntrospectedNode
  isOptional: boolean
}

function unwrapOptional(node: IntrospectedNode): UnwrapResult {
  if (node.kind === 'optional') {
    const inner = unwrapOptional(node.inner)
    return { node: inner.node, isOptional: true }
  }
  if (node.kind === 'default' || node.kind === 'catch') {
    return unwrapOptional(node.inner)
  }
  return { node, isOptional: false }
}

function cloneJsonSchema(schema: JSONSchema): JSONSchema {
  return JSON.parse(JSON.stringify(schema))
}
