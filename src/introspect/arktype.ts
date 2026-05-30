import type {
  ArrayConstraints,
  IntrospectedNode,
  NumberConstraints,
  StringConstraints,
} from './index'

const isSchemaLike = (value: unknown): value is Record<string, unknown> =>
  (typeof value === 'object' || typeof value === 'function') && value !== null

export function introspectArkType(schema: unknown): IntrospectedNode {
  const json = isSchemaLike(schema) ? schema.json : undefined
  return parseArkNode(json)
}

function parseArkNode(node: unknown): IntrospectedNode {
  if (Array.isArray(node)) return { kind: 'union', members: node.map(parseArkNode) }
  if (typeof node === 'string') return primitiveNode(node)
  if (!node || typeof node !== 'object') return { kind: 'unknown' }

  const record = node as Record<string, unknown>

  if ('unit' in record) {
    return { kind: 'literal', value: record.unit }
  }

  if (Array.isArray(record.branches)) {
    const meta = record.meta as Record<string, unknown> | undefined
    const format = typeof meta?.format === 'string' ? meta.format : undefined
    if (format === 'uuid' || format === 'email' || format === 'uri') {
      return { kind: 'string', constraints: { format } }
    }
    return { kind: 'union', members: record.branches.map(parseArkNode) }
  }

  if (record.domain === 'string') {
    const constraints = stringConstraints(record)
    return { kind: 'string', ...(hasKeys(constraints) && { constraints }) }
  }

  if (record.domain === 'number') {
    const constraints = numberConstraints(record)
    if (record.divisor === 1) {
      return { kind: 'integer', ...(hasKeys(constraints) && { constraints }) }
    }
    return { kind: 'number', ...(hasKeys(constraints) && { constraints }) }
  }

  if (record.domain === 'object') {
    if (
      Array.isArray(record.index) &&
      record.index.length > 0 &&
      !record.required &&
      !record.optional
    ) {
      const first = record.index[0]
      if (first && typeof first === 'object' && 'value' in first) {
        return {
          kind: 'record',
          key: primitiveKeyNode(first.signature),
          value: parseArkNode(first.value),
        }
      }
    }

    const entries: Record<string, IntrospectedNode> = {}
    for (const entry of [
      ...objectEntries(record.required),
      ...objectEntries(record.optional, true),
    ]) {
      entries[entry.key] = entry.value
    }
    return { kind: 'object', entries }
  }

  if (record.proto === 'Array' && record.sequence !== undefined) {
    const sequence = record.sequence
    if (sequence && typeof sequence === 'object') {
      const sequenceRecord = sequence as Record<string, unknown>
      const prefix = Array.isArray(sequenceRecord.prefix)
        ? sequenceRecord.prefix.map(parseArkNode)
        : []
      const optionals = Array.isArray(sequenceRecord.optionals)
        ? sequenceRecord.optionals.map(parseArkNode)
        : []
      const rest = sequenceRecord.rest != null ? parseArkNode(sequenceRecord.rest) : undefined
      return {
        kind: 'tuple',
        elements: [...prefix, ...optionals],
        ...(rest && { rest }),
      }
    }

    const constraints = arrayConstraints(record)
    return {
      kind: 'array',
      element: parseArkNode(sequence),
      ...(hasKeys(constraints) && { constraints }),
    }
  }

  if (record.anyOf) return parseArkNode(record.anyOf)

  if (record.pattern || record.predicate) {
    const constraints = stringConstraints(record)
    return { kind: 'string', ...(hasKeys(constraints) && { constraints }) }
  }

  if ('default' in record) {
    return parseArkNode(record.value ?? record.default)
  }

  return { kind: 'unknown' }
}

function primitiveNode(kind: string): IntrospectedNode {
  switch (kind) {
    case 'string':
      return { kind: 'string' }
    case 'number':
      return { kind: 'number' }
    case 'boolean':
      return { kind: 'boolean' }
    case 'object':
      return { kind: 'object', entries: {} }
    case 'null':
      return { kind: 'literal', value: null }
    case 'undefined':
      return { kind: 'literal', value: undefined }
    default:
      return { kind: 'unknown' }
  }
}

function primitiveKeyNode(signature: unknown): IntrospectedNode {
  if (signature === 'string') return { kind: 'string' }
  if (signature === 'number') return { kind: 'number' }
  if (signature === 'boolean') return { kind: 'boolean' }
  return { kind: 'string' }
}

function stringConstraints(node: Record<string, unknown>): StringConstraints {
  const constraints: StringConstraints = {}
  const meta = node.meta as Record<string, unknown> | undefined
  const format = typeof meta?.format === 'string' ? meta.format : undefined
  if (format === 'uuid' || format === 'email' || format === 'uri') constraints.format = format
  if (Array.isArray(node.pattern) && node.pattern.length > 0) {
    const first = node.pattern[0]
    if (first && typeof first === 'object' && typeof first.rule === 'string') {
      constraints.pattern = new RegExp(
        first.rule,
        typeof first.flags === 'string' ? first.flags : undefined,
      )
    }
  }
  return constraints
}

function numberConstraints(node: Record<string, unknown>): NumberConstraints {
  const constraints: NumberConstraints = {}
  if (typeof node.min === 'number') {
    constraints.min = node.min
    constraints.minInclusive = true
  }
  if (typeof node.max === 'number') {
    constraints.max = node.max
    constraints.maxInclusive = true
  }
  return constraints
}

function arrayConstraints(node: Record<string, unknown>): ArrayConstraints {
  const constraints: ArrayConstraints = {}
  if (typeof node.minLength === 'number') constraints.minLength = node.minLength
  if (typeof node.maxLength === 'number') constraints.maxLength = node.maxLength
  if (typeof node.exactLength === 'number') {
    constraints.minLength = node.exactLength
    constraints.maxLength = node.exactLength
  }
  return constraints
}

function objectEntries(
  values: unknown,
  optional = false,
): Array<{ key: string; value: IntrospectedNode }> {
  if (!Array.isArray(values)) return []
  return values.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || typeof entry.key !== 'string') return []
    const parsed = parseArkNode(entry.value)
    return [{ key: entry.key, value: optional ? { kind: 'optional', inner: parsed } : parsed }]
  })
}

function hasKeys(value: object): boolean {
  return Object.keys(value).length > 0
}
