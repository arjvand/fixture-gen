import type { ArrayConstraints, IntrospectedNode, NumberConstraints, StringConstraints } from './index'

const isSchemaLike = (value: unknown): value is Record<string, unknown> | Function =>
  (typeof value === 'object' || typeof value === 'function') && value !== null

export function introspectArkType(schema: unknown): IntrospectedNode {
  const json = isSchemaLike(schema) ? (schema as any).json : undefined
  return parseArkNode(json)
}

function parseArkNode(node: any): IntrospectedNode {
  if (Array.isArray(node)) return { kind: 'union', members: node.map(parseArkNode) }
  if (typeof node === 'string') return primitiveNode(node)
  if (!node || typeof node !== 'object') return { kind: 'unknown' }

  if ('unit' in node) {
    return { kind: 'literal', value: node.unit }
  }

  if (Array.isArray(node.branches)) {
    const format = typeof node.meta?.format === 'string' ? node.meta.format : undefined
    if (format === 'uuid' || format === 'email' || format === 'uri') {
      return { kind: 'string', constraints: { format } }
    }
    return { kind: 'union', members: node.branches.map(parseArkNode) }
  }

  if (node.domain === 'string') {
    const constraints = stringConstraints(node)
    return { kind: 'string', ...(hasKeys(constraints) && { constraints }) }
  }

  if (node.domain === 'number') {
    const constraints = numberConstraints(node)
    if (node.divisor === 1) {
      return { kind: 'integer', ...(hasKeys(constraints) && { constraints }) }
    }
    return { kind: 'number', ...(hasKeys(constraints) && { constraints }) }
  }

  if (node.domain === 'object') {
    if (Array.isArray(node.index) && node.index.length > 0 && !node.required && !node.optional) {
      const first = node.index[0]
      if (first && typeof first === 'object' && 'value' in first) {
        return {
          kind: 'record',
          key: primitiveKeyNode(first.signature),
          value: parseArkNode(first.value),
        }
      }
    }

    const entries: Record<string, IntrospectedNode> = {}
    for (const entry of [...objectEntries(node.required), ...objectEntries(node.optional, true)]) {
      entries[entry.key] = entry.value
    }
    return { kind: 'object', entries }
  }

  if (node.proto === 'Array' && node.sequence !== undefined) {
    const sequence = node.sequence
    if (sequence && typeof sequence === 'object') {
      const prefix = Array.isArray(sequence.prefix) ? sequence.prefix.map(parseArkNode) : []
      const optionals = Array.isArray(sequence.optionals) ? sequence.optionals.map(parseArkNode) : []
      const rest = sequence.rest != null ? parseArkNode(sequence.rest) : undefined
      return {
        kind: 'tuple',
        elements: [...prefix, ...optionals],
        ...(rest && { rest }),
      }
    }

    const constraints = arrayConstraints(node)
    return {
      kind: 'array',
      element: parseArkNode(sequence),
      ...(hasKeys(constraints) && { constraints }),
    }
  }

  if (node.anyOf) return parseArkNode(node.anyOf)

  if (node.pattern || node.predicate) {
    const constraints = stringConstraints(node)
    return { kind: 'string', ...(hasKeys(constraints) && { constraints }) }
  }

  if ('default' in node) {
    return parseArkNode(node.value ?? node.default)
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

function stringConstraints(node: any): StringConstraints {
  const constraints: StringConstraints = {}
  const format = typeof node.meta?.format === 'string' ? node.meta.format : undefined
  if (format === 'uuid' || format === 'email' || format === 'uri') constraints.format = format
  if (Array.isArray(node.pattern) && node.pattern.length > 0) {
    const first = node.pattern[0]
    if (first && typeof first === 'object' && typeof first.rule === 'string') {
      constraints.pattern = new RegExp(first.rule, typeof first.flags === 'string' ? first.flags : undefined)
    }
  }
  return constraints
}

function numberConstraints(node: any): NumberConstraints {
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

function arrayConstraints(node: any): ArrayConstraints {
  const constraints: ArrayConstraints = {}
  if (typeof node.minLength === 'number') constraints.minLength = node.minLength
  if (typeof node.maxLength === 'number') constraints.maxLength = node.maxLength
  if (typeof node.exactLength === 'number') {
    constraints.minLength = node.exactLength
    constraints.maxLength = node.exactLength
  }
  return constraints
}

function objectEntries(values: any, optional = false): Array<{ key: string; value: IntrospectedNode }> {
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
