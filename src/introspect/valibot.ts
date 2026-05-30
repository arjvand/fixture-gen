import type { ArrayConstraints, IntrospectedNode, NumberConstraints, StringConstraints } from './index'

interface ValibotSchema {
  kind?: string
  type?: string
  pipe?: unknown[]
  entries?: Record<string, unknown>
  item?: unknown
  items?: unknown[]
  key?: unknown
  value?: unknown
  options?: unknown[]
  wrapped?: unknown
  fallback?: unknown
  default?: unknown
  literal?: unknown
  message?: unknown
  rest?: unknown
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isSchema = (value: unknown): value is ValibotSchema =>
  isObject(value) && typeof value.type === 'string'

const valibotSteps = (schema: ValibotSchema): unknown[] => {
  if (Array.isArray(schema.pipe)) return schema.pipe.slice(1)
  if (Array.isArray(schema.message) && schema.message.every(isObject)) return schema.message
  return []
}

export function introspectValibot(schema: unknown): IntrospectedNode {
  if (!isSchema(schema)) return { kind: 'unknown' }

  if (schema.type === 'optional') {
    return { kind: 'optional', inner: introspectValibot(schema.wrapped) }
  }

  if (schema.type === 'nullable') {
    return { kind: 'nullable', inner: introspectValibot(schema.wrapped) }
  }

  switch (schema.type) {
    case 'string':
      return { kind: 'string', ...(hasKeys(stringConstraints(schema)) && { constraints: stringConstraints(schema) }) }
    case 'number': {
      const constraints = numberConstraints(schema)
      if (isInteger(schema)) {
        return { kind: 'integer', ...(hasKeys(constraints) && { constraints }) }
      }
      return { kind: 'number', ...(hasKeys(constraints) && { constraints }) }
    }
    case 'integer': {
      const constraints = numberConstraints(schema)
      return { kind: 'integer', ...(hasKeys(constraints) && { constraints }) }
    }
    case 'boolean':
      return { kind: 'boolean' }
    case 'date':
      return { kind: 'date' }
    case 'object':
      return { kind: 'object', entries: objectEntries(schema.entries) }
    case 'array': {
      const constraints = arrayConstraints(schema)
      return {
        kind: 'array',
        element: introspectValibot(schema.item),
        ...(hasKeys(constraints) && { constraints }),
      }
    }
    case 'tuple': {
      const elements = Array.isArray(schema.items) ? schema.items.map(introspectValibot) : []
      return {
        kind: 'tuple',
        elements,
        ...(schema.rest != null && { rest: introspectValibot(schema.rest) }),
      }
    }
    case 'record':
      return {
        kind: 'record',
        key: introspectValibot(schema.key),
        value: introspectValibot(schema.value),
      }
    case 'union':
    case 'variant':
      return {
        kind: 'union',
        members: Array.isArray(schema.options) ? schema.options.map(introspectValibot) : [],
      }
    case 'picklist':
      return {
        kind: 'enum',
        values: Array.isArray(schema.options)
          ? schema.options.filter(
              (value): value is string | number | boolean =>
                typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
            )
          : [],
      }
    case 'literal':
      return { kind: 'literal', value: schema.literal }
    case 'null':
      return { kind: 'literal', value: null }
    case 'undefined':
      return { kind: 'literal', value: undefined }
    default:
      if (schema.fallback !== undefined || schema.default !== undefined) {
        return introspectValibot({ ...schema, fallback: undefined, default: undefined })
      }
      return { kind: 'unknown' }
  }
}

function objectEntries(entries: Record<string, unknown> | undefined): Record<string, IntrospectedNode> {
  const result: Record<string, IntrospectedNode> = {}
  for (const [key, value] of Object.entries(entries ?? {})) {
    result[key] = introspectValibot(value)
  }
  return result
}

function stringConstraints(schema: ValibotSchema): StringConstraints {
  const constraints: StringConstraints = {}
  for (const step of valibotSteps(schema)) {
    if (!isObject(step) || typeof step.type !== 'string') continue
    switch (step.type) {
      case 'uuid':
      case 'cuid2':
      case 'nanoid':
      case 'emoji':
      case 'base64':
      case 'url':
      case 'ip':
      case 'ipv4':
      case 'ipv6':
      case 'email':
      case 'rfc_email':
        constraints.format = step.type === 'rfc_email' ? 'email' : step.type
        break
      case 'iso_date':
        constraints.format = 'date'
        break
      case 'iso_date_time':
      case 'iso_date_time_second':
      case 'iso_timestamp':
        constraints.format = 'datetime'
        break
      case 'iso_time':
      case 'iso_time_second':
        constraints.format = 'time'
        break
      case 'regex':
        if (step.requirement instanceof RegExp) constraints.pattern = step.requirement
        break
      case 'min_length':
        if (typeof step.requirement === 'number') constraints.minLength = step.requirement
        break
      case 'max_length':
        if (typeof step.requirement === 'number') constraints.maxLength = step.requirement
        break
    }
  }
  return constraints
}

function numberConstraints(schema: ValibotSchema): NumberConstraints {
  const constraints: NumberConstraints = {}
  for (const step of valibotSteps(schema)) {
    if (!isObject(step) || typeof step.type !== 'string') continue
    switch (step.type) {
      case 'integer':
        break
      case 'min_value':
        if (typeof step.requirement === 'number') {
          constraints.min = step.requirement
          constraints.minInclusive = true
        }
        break
      case 'max_value':
        if (typeof step.requirement === 'number') {
          constraints.max = step.requirement
          constraints.maxInclusive = true
        }
        break
    }
  }
  return constraints
}

function arrayConstraints(schema: ValibotSchema): ArrayConstraints {
  const constraints: ArrayConstraints = {}
  for (const step of valibotSteps(schema)) {
    if (!isObject(step) || typeof step.type !== 'string') continue
    switch (step.type) {
      case 'min_length':
        if (typeof step.requirement === 'number') constraints.minLength = step.requirement
        break
      case 'max_length':
        if (typeof step.requirement === 'number') constraints.maxLength = step.requirement
        break
    }
  }
  return constraints
}

function isInteger(schema: ValibotSchema): boolean {
  return valibotSteps(schema).some((step) => isObject(step) && step.type === 'integer')
}

const hasKeys = (value: object) => Object.keys(value).length > 0
