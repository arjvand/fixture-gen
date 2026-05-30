import type {
  ArrayConstraints,
  IntrospectedNode,
  NumberConstraints,
  StringConstraints,
} from './index'

const TYPEBOX_KIND = 'Symbol(TypeBox.Kind)'
const TYPEBOX_OPTIONAL = 'Symbol(TypeBox.Optional)'

const isObject = (value: unknown): value is Record<string | symbol, unknown> =>
  typeof value === 'object' && value !== null

const hasTypeBoxKind = (value: unknown): boolean =>
  isObject(value) &&
  Object.getOwnPropertySymbols(value).some((symbol) => symbol.toString() === TYPEBOX_KIND)

const isOptional = (value: unknown): boolean =>
  isObject(value) &&
  Object.getOwnPropertySymbols(value).some((symbol) => symbol.toString() === TYPEBOX_OPTIONAL)

const kindName = (value: unknown): string | undefined => {
  if (!isObject(value)) return undefined
  const symbol = Object.getOwnPropertySymbols(value).find((s) => s.toString() === TYPEBOX_KIND)
  const kind = symbol ? value[symbol] : undefined
  return typeof kind === 'string' ? kind : undefined
}

export function introspectTypeBox(schema: unknown): IntrospectedNode {
  if (!isObject(schema)) return { kind: 'unknown' }

  const inner = parseTypeBox(schema)
  return isOptional(schema) ? { kind: 'optional', inner } : inner
}

function parseTypeBox(schema: unknown): IntrospectedNode {
  if (!isObject(schema)) return { kind: 'unknown' }

  const kind = kindName(schema)

  if (kind === 'Optional') {
    const inner = cloneWithoutKind(schema)
    return { kind: 'optional', inner: parseTypeBox(inner) }
  }

  if (kind === 'Null' || schema.type === 'null') {
    return { kind: 'literal', value: null }
  }

  if (kind === 'Date' || schema.type === 'Date') {
    return { kind: 'date' }
  }

  if (schema.default !== undefined) {
    return parseTypeBox(cloneWithoutKeys(schema, ['default']))
  }

  if (schema.const !== undefined) {
    return { kind: 'literal', value: schema.const }
  }

  if (Array.isArray(schema.enum)) {
    return {
      kind: 'enum',
      values: schema.enum.filter(
        (value): value is string | number | boolean =>
          typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
      ),
    }
  }

  if (Array.isArray(schema.anyOf)) {
    return { kind: 'union', members: schema.anyOf.map(parseTypeBox) }
  }

  switch (schema.type) {
    case 'string':
      return {
        kind: 'string',
        ...(hasKeys(stringConstraints(schema)) && { constraints: stringConstraints(schema) }),
      }
    case 'number': {
      const constraints = numberConstraints(schema)
      return { kind: 'number', ...(hasKeys(constraints) && { constraints }) }
    }
    case 'integer': {
      const constraints = numberConstraints(schema)
      return { kind: 'integer', ...(hasKeys(constraints) && { constraints }) }
    }
    case 'boolean':
      return { kind: 'boolean' }
    case 'array': {
      const constraints = arrayConstraints(schema)
      const items = schema.items
      if (Array.isArray(items)) {
        return {
          kind: 'tuple',
          elements: items.map(parseTypeBox),
        }
      }
      if (!isObject(items)) {
        return {
          kind: 'array',
          element: { kind: 'unknown' },
          ...(hasKeys(constraints) && { constraints }),
        }
      }
      return {
        kind: 'array',
        element: parseTypeBox(items),
        ...(hasKeys(constraints) && { constraints }),
      }
    }
    case 'object':
      return parseObject(schema)
    default:
      break
  }

  if (hasTypeBoxKind(schema)) {
    const entries = parseObject(schema)
    if (entries.kind !== 'unknown') return entries
  }

  return { kind: 'unknown' }
}

function parseObject(schema: Record<string | symbol, unknown>): IntrospectedNode {
  const properties = isObject(schema.properties) ? schema.properties : undefined
  const required = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((key): key is string => typeof key === 'string')
      : [],
  )
  const entries: Record<string, IntrospectedNode> = {}

  for (const [key, value] of Object.entries(properties ?? {})) {
    const child = parseTypeBox(value as Record<string | symbol, unknown>)
    const optional = isOptional(value) || !required.has(key)
    entries[key] =
      optional && child.kind !== 'optional' ? { kind: 'optional', inner: child } : child
  }

  if (Object.keys(entries).length > 0 || properties !== undefined) {
    return { kind: 'object', entries }
  }

  if (isObject(schema.patternProperties)) {
    const patterns = Object.entries(schema.patternProperties)
    if (patterns.length > 0) {
      const [, value] = patterns[0] ?? []
      return { kind: 'record', key: { kind: 'string' }, value: parseTypeBox(value) }
    }
  }

  return { kind: 'object', entries: {} }
}

function stringConstraints(schema: Record<string | symbol, unknown>): StringConstraints {
  const constraints: StringConstraints = {}
  if (typeof schema.format === 'string')
    constraints.format = schema.format === 'date-time' ? 'datetime' : schema.format
  if (typeof schema.minLength === 'number') constraints.minLength = schema.minLength
  if (typeof schema.maxLength === 'number') constraints.maxLength = schema.maxLength
  if (typeof schema.pattern === 'string') constraints.pattern = new RegExp(schema.pattern)
  return constraints
}

function numberConstraints(schema: Record<string | symbol, unknown>): NumberConstraints {
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
  return constraints
}

function arrayConstraints(schema: Record<string | symbol, unknown>): ArrayConstraints {
  const constraints: ArrayConstraints = {}
  if (typeof schema.minItems === 'number') constraints.minLength = schema.minItems
  if (typeof schema.maxItems === 'number') constraints.maxLength = schema.maxItems
  return constraints
}

function cloneWithoutKind(
  schema: Record<string | symbol, unknown>,
): Record<string | symbol, unknown> {
  const clone: Record<string | symbol, unknown> = {}
  for (const key of Reflect.ownKeys(schema)) {
    if (typeof key === 'symbol' && key.toString() === TYPEBOX_KIND) continue
    clone[key as string | symbol] = schema[key as keyof typeof schema]
  }
  return clone
}

function cloneWithoutKeys(
  schema: Record<string | symbol, unknown>,
  keys: string[],
): Record<string | symbol, unknown> {
  const clone: Record<string | symbol, unknown> = {}
  for (const key of Reflect.ownKeys(schema)) {
    if (typeof key === 'string' && keys.includes(key)) continue
    clone[key as string | symbol] = schema[key as keyof typeof schema]
  }
  return clone
}

function hasKeys(value: object): boolean {
  return Object.keys(value).length > 0
}
