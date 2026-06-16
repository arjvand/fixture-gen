import type {
  ArrayConstraints,
  IntrospectedNode,
  NumberConstraints,
  StringConstraints,
} from './index'

export interface JSONSchema {
  $schema?: string
  $ref?: string
  $defs?: Record<string, JSONSchema>
  definitions?: Record<string, JSONSchema>
  type?: string | string[]
  format?: string
  enum?: unknown[]
  const?: unknown
  allOf?: JSONSchema[]
  anyOf?: JSONSchema[]
  oneOf?: JSONSchema[]
  minLength?: number
  maxLength?: number
  pattern?: string
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  properties?: Record<string, JSONSchema>
  patternProperties?: Record<string, JSONSchema>
  additionalProperties?: boolean | JSONSchema
  required?: string[]
  items?: JSONSchema | JSONSchema[]
  prefixItems?: JSONSchema[]
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
  default?: unknown
  examples?: unknown[]
  description?: string
  title?: string
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
    cur = cur[part]
  }
  return cur
}

function resolveRef(ref: string, defs: Record<string, JSONSchema>): JSONSchema | undefined {
  const hashIndex = ref.indexOf('#')
  const fragment = hashIndex >= 0 ? ref.slice(hashIndex + 1) : ''
  if (fragment.startsWith('/')) {
    const resolved = resolveJsonPointer({ $defs: defs, definitions: defs }, fragment)
    if (isObject(resolved)) return resolved as JSONSchema
  }
  return undefined
}

export function introspectJsonSchema(schema: unknown): IntrospectedNode {
  if (!isObject(schema)) return { kind: 'unknown' }

  const actualSchema = (
    '__jsonSchema' in schema ? (schema.__jsonSchema as JSONSchema) : (schema as JSONSchema)
  ) as JSONSchema
  const defs: Record<string, JSONSchema> =
    '__jsonSchemaDefs' in schema
      ? (schema.__jsonSchemaDefs as Record<string, JSONSchema>)
      : (actualSchema.$defs ?? actualSchema.definitions ?? {})

  return parseJsonSchema(actualSchema, defs, new Set())
}

function parseJsonSchema(
  schema: JSONSchema,
  defs: Record<string, JSONSchema>,
  visited: Set<string>,
): IntrospectedNode {
  if (!isObject(schema)) return { kind: 'unknown' }

  if (schema.$ref && !visited.has(schema.$ref)) {
    const resolved = resolveRef(schema.$ref, defs)
    if (resolved) {
      const nextVisited = new Set(visited)
      nextVisited.add(schema.$ref)
      return parseJsonSchema(resolved, defs, nextVisited)
    }
    return { kind: 'unknown' }
  }

  if (schema.const !== undefined) {
    return { kind: 'literal', value: schema.const }
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return {
      kind: 'enum',
      values: schema.enum.filter(
        (v): v is string | number | boolean =>
          typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
      ),
    }
  }

  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return {
      kind: 'union',
      members: schema.anyOf.map((m) => parseJsonSchema(m, defs, visited)),
    }
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return {
      kind: 'union',
      members: schema.oneOf.map((m) => parseJsonSchema(m, defs, visited)),
    }
  }

  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    return mergeAllOf(schema.allOf, schema, defs, visited)
  }

  const typeVal = schema.type
  const types: string[] = Array.isArray(typeVal) ? typeVal : typeVal ? [typeVal] : []

  if (types.length > 1) {
    return {
      kind: 'union',
      members: types.map((t) =>
        parseJsonSchema(
          { ...(schema as Record<string, unknown>), type: t } as JSONSchema,
          defs,
          visited,
        ),
      ),
    }
  }

  const type = types[0]

  switch (type) {
    case 'string':
      return makeStringNode(schema)
    case 'number':
      return makeNumberNode(schema, 'number')
    case 'integer':
      return makeNumberNode(schema, 'integer')
    case 'boolean':
      return { kind: 'boolean' }
    case 'null':
      return { kind: 'null' }
    case 'array':
      return parseArrayNode(schema, defs, visited)
    case 'object':
      return parseObjectNode(schema, defs, visited)
    default:
      if (isObject(schema.properties)) return parseObjectNode(schema, defs, visited)
      if (schema.items !== undefined) return parseArrayNode(schema, defs, visited)
      return { kind: 'unknown' }
  }
}

function mergeAllOf(
  allOf: JSONSchema[],
  parent: JSONSchema,
  defs: Record<string, JSONSchema>,
  visited: Set<string>,
): IntrospectedNode {
  const parsed = allOf.map((m) => parseJsonSchema(m, defs, visited))
  const objects = parsed.filter(
    (n): n is IntrospectedNode & { kind: 'object' } => n.kind === 'object',
  )

  if (objects.length === parsed.length && objects.length > 0) {
    const merged: Record<string, IntrospectedNode> = {}
    for (const obj of objects) {
      for (const [key, node] of Object.entries(obj.entries)) {
        merged[key] = node
      }
    }
    const result: IntrospectedNode = { kind: 'object', entries: merged }
    return applyParentProps(result, parent, defs, visited)
  }

  const first = parsed[0]
  if (first) {
    return applyParentProps(first, parent, defs, visited)
  }

  return { kind: 'unknown' }
}

function applyParentProps(
  node: IntrospectedNode,
  parent: JSONSchema,
  defs: Record<string, JSONSchema>,
  visited: Set<string>,
): IntrospectedNode {
  if (node.kind === 'object') {
    const entries = { ...node.entries }
    if (isObject(parent.properties)) {
      for (const [key, prop] of Object.entries(parent.properties)) {
        if (!(key in entries)) {
          const parsed = parseJsonSchema(prop, defs, visited)
          const required = Array.isArray(parent.required) && parent.required.includes(key)
          entries[key] = required ? parsed : wrapOptional(parsed)
        }
      }
    }
    return { kind: 'object', entries }
  }

  if (node.kind === 'string' && parent.pattern !== undefined) {
    return {
      kind: 'string',
      constraints: {
        ...(node.constraints ?? {}),
        ...(node.constraints?.pattern ? {} : { pattern: new RegExp(parent.pattern) }),
      },
    }
  }

  return node
}

function wrapOptional(node: IntrospectedNode): IntrospectedNode {
  if (
    node.kind === 'optional' ||
    node.kind === 'nullable' ||
    node.kind === 'default' ||
    node.kind === 'catch'
  ) {
    return node
  }
  return { kind: 'optional', inner: node }
}

function makeStringNode(schema: JSONSchema): IntrospectedNode {
  const constraints: StringConstraints = {}
  if (typeof schema.minLength === 'number') constraints.minLength = schema.minLength
  if (typeof schema.maxLength === 'number') constraints.maxLength = schema.maxLength
  if (typeof schema.pattern === 'string') constraints.pattern = new RegExp(schema.pattern)
  if (typeof schema.format === 'string') constraints.format = schema.format
  const hasConstraints = Object.keys(constraints).length > 0
  return hasConstraints ? { kind: 'string', constraints } : { kind: 'string' }
}

function makeNumberNode(schema: JSONSchema, kind: 'number' | 'integer'): IntrospectedNode {
  const constraints: NumberConstraints = {}
  if (typeof schema.minimum === 'number') {
    constraints.min = schema.minimum
    constraints.minInclusive = true
  } else if (typeof schema.exclusiveMinimum === 'number') {
    constraints.min = schema.exclusiveMinimum
    constraints.minInclusive = false
  }
  if (typeof schema.maximum === 'number') {
    constraints.max = schema.maximum
    constraints.maxInclusive = true
  } else if (typeof schema.exclusiveMaximum === 'number') {
    constraints.max = schema.exclusiveMaximum
    constraints.maxInclusive = false
  }
  const hasConstraints = Object.keys(constraints).length > 0
  return hasConstraints ? { kind, constraints } : { kind }
}

function parseArrayNode(
  schema: JSONSchema,
  defs: Record<string, JSONSchema>,
  visited: Set<string>,
): IntrospectedNode {
  const constraints: ArrayConstraints = {}
  if (typeof schema.minItems === 'number') constraints.minLength = schema.minItems
  if (typeof schema.maxItems === 'number') constraints.maxLength = schema.maxItems
  if (schema.uniqueItems === true) constraints.uniqueItems = true

  const items = schema.items
  const prefixItems = schema.prefixItems

  if (Array.isArray(items)) {
    return {
      kind: 'tuple',
      elements: items.map((item) => parseJsonSchema(item, defs, visited)),
    }
  }

  if (Array.isArray(prefixItems)) {
    const elements = prefixItems.map((item) => parseJsonSchema(item, defs, visited))
    const rest =
      isObject(items) || Array.isArray(items)
        ? parseJsonSchema(
            Array.isArray(items) ? (items[0] ?? { type: 'unknown' }) : items,
            defs,
            visited,
          )
        : undefined
    return elements.length > 0 || rest
      ? { kind: 'tuple', elements, ...(rest ? { rest } : {}) }
      : { kind: 'tuple', elements }
  }

  if (isObject(items) || Array.isArray(items)) {
    const element = isObject(items)
      ? parseJsonSchema(items, defs, visited)
      : parseJsonSchema(items[0] ?? { type: 'unknown' }, defs, visited)
    return {
      kind: 'array',
      element,
      ...(hasConstraintKeys(schema, ['minItems', 'maxItems', 'uniqueItems']) && { constraints }),
    }
  }

  return {
    kind: 'array',
    element: { kind: 'unknown' },
    ...(hasConstraintKeys(schema, ['minItems', 'maxItems', 'uniqueItems']) && { constraints }),
  }
}

function parseObjectNode(
  schema: JSONSchema,
  defs: Record<string, JSONSchema>,
  visited: Set<string>,
): IntrospectedNode {
  const properties = isObject(schema.properties) ? schema.properties : {}
  const required = Array.isArray(schema.required) ? schema.required : []
  const entries: Record<string, IntrospectedNode> = {}

  for (const [key, propSchema] of Object.entries(properties)) {
    const parsed = parseJsonSchema(propSchema as JSONSchema, defs, visited)
    entries[key] = required.includes(key) ? parsed : wrapOptional(parsed)
  }

  if (Object.keys(entries).length > 0 || isObject(schema.properties)) {
    return { kind: 'object', entries }
  }

  if (isObject(schema.patternProperties)) {
    const patterns = Object.entries(schema.patternProperties)
    if (patterns.length > 0) {
      const first = patterns[0]
      if (first) {
        const [, value] = first
        if (value) {
          return {
            kind: 'record',
            key: { kind: 'string' },
            value: parseJsonSchema(value as JSONSchema, defs, visited),
          }
        }
      }
    }
  }

  return { kind: 'object', entries: {} }
}

function hasConstraintKeys(schema: JSONSchema, keys: string[]): boolean {
  return keys.some((key) => key in schema && (schema as Record<string, unknown>)[key] !== undefined)
}
