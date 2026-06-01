import type {
  ArrayConstraints,
  IntrospectedNode,
  NumberConstraints,
  StringConstraints,
} from './index'

interface ZodV4Def {
  type: string
  shape?: Record<string, unknown>
  checks?: unknown[]
  element?: unknown
  items?: unknown[]
  rest?: unknown
  options?: unknown[]
  discriminator?: string
  entries?: Record<string, unknown>
  values?: unknown[]
  innerType?: unknown
  defaultValue?: unknown
  keyType?: unknown
  valueType?: unknown
}

interface ZodV4 {
  _zod: { def: ZodV4Def }
}

interface ZodV3Def {
  typeName: string
  shape?: Record<string, unknown> | (() => Record<string, unknown>)
  checks?: Array<{
    kind?: string
    value?: number
    max?: number
    min?: number
    inclusive?: boolean
    regex?: RegExp
  }>
  type?: unknown
  items?: unknown[]
  rest?: unknown
  options?: unknown[] | Map<unknown, unknown>
  discriminator?: string
  values?: readonly (string | number)[]
  value?: unknown
  innerType?: unknown
  defaultValue?: unknown
  catchValue?: unknown
  keyType?: unknown
  valueType?: unknown
  minLength?: { value: number } | null
  maxLength?: { value: number } | null
  minSize?: { value: number } | null
  maxSize?: { value: number } | null
}

interface ZodV3 {
  _def: ZodV3Def
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

const isZodV4 = (s: unknown): s is ZodV4 =>
  isObject(s) && isObject((s as Record<string, unknown>)._zod)

const isZodV3 = (s: unknown): s is ZodV3 =>
  isObject(s) && isObject((s as Record<string, unknown>)._def)

export function introspectZod(schema: unknown): IntrospectedNode {
  if (isZodV4(schema)) return fromV4(schema)
  if (isZodV3(schema)) return fromV3(schema)
  return { kind: 'unknown' }
}

// ── Zod 4 ────────────────────────────────────────────────────────────────────

function fromV4(schema: ZodV4): IntrospectedNode {
  const def = schema._zod.def
  switch (def.type) {
    case 'string': {
      const constraints = stringConstraintsV4(def.checks ?? [])
      return { kind: 'string', ...(hasKeys(constraints) && { constraints }) }
    }
    case 'number': {
      const constraints = numberConstraintsV4(def.checks ?? [])
      if (isIntegerV4(def.checks))
        return { kind: 'integer', ...(hasKeys(constraints) && { constraints }) }
      return { kind: 'number', ...(hasKeys(constraints) && { constraints }) }
    }
    case 'boolean':
      return { kind: 'boolean' }
    case 'date':
      return { kind: 'date' }
    case 'object':
      return objectNode(def.shape)
    case 'array': {
      const constraints = arrayConstraintsV4(def.checks ?? [])
      return {
        kind: 'array',
        element: introspectZod(def.element),
        ...(hasKeys(constraints) && { constraints }),
      }
    }
    case 'tuple': {
      const items = Array.isArray(def.items) ? def.items : []
      return {
        kind: 'tuple',
        elements: items.map(introspectZod),
        ...(def.rest != null && { rest: introspectZod(def.rest) }),
      }
    }
    case 'record':
      return {
        kind: 'record',
        key: introspectZod(def.keyType),
        value: introspectZod(def.valueType),
      }
    case 'optional':
      return { kind: 'optional', inner: introspectZod(def.innerType) }
    case 'nullable':
      return { kind: 'nullable', inner: introspectZod(def.innerType) }
    case 'default':
      return { kind: 'default', inner: introspectZod(def.innerType) }
    case 'catch':
      return { kind: 'catch', inner: introspectZod(def.innerType) }
    case 'union': {
      const opts = Array.isArray(def.options) ? def.options : []
      return { kind: 'union', members: opts.map(introspectZod) }
    }
    case 'enum': {
      const vals = def.entries ? Object.values(def.entries) : []
      return {
        kind: 'enum',
        values: vals.filter(
          (v): v is string | number | boolean =>
            typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
        ),
      }
    }
    case 'literal': {
      const vals = Array.isArray(def.values) ? def.values : []
      return { kind: 'literal', value: vals[0] }
    }
    case 'null':
      return { kind: 'null' }
    case 'undefined':
      return { kind: 'literal', value: undefined }
    case 'any':
    case 'unknown':
      return { kind: 'any' }
    case 'set': {
      const element =
        def.valueType !== undefined ? introspectZod(def.valueType) : { kind: 'any' as const }
      return { kind: 'array', element, constraints: { uniqueItems: true } }
    }
    default:
      return { kind: 'unknown' }
  }
}

function stringConstraintsV4(checks: unknown[]): StringConstraints {
  const c: StringConstraints = {}
  for (const check of checks) {
    if (!isObject(check)) continue
    const ch = check as Record<string, unknown>
    if (!isObject(ch._zod) || !isObject((ch._zod as Record<string, unknown>).def)) continue
    const d = (ch._zod as Record<string, unknown>).def as Record<string, unknown>
    if (d.check === 'string_format') {
      if (typeof d.format === 'string' && d.format !== 'regex') c.format = d.format
      else if (d.format === 'regex' && d.pattern instanceof RegExp) c.pattern = d.pattern
    } else if (d.check === 'min_length' && typeof d.minimum === 'number') {
      c.minLength = d.minimum
    } else if (d.check === 'max_length' && typeof d.maximum === 'number') {
      c.maxLength = d.maximum
    }
  }
  return c
}

function numberConstraintsV4(checks: unknown[]): NumberConstraints {
  const c: NumberConstraints = {}
  for (const check of checks) {
    if (!isObject(check)) continue
    const ch = check as Record<string, unknown>
    if (!isObject(ch._zod) || !isObject((ch._zod as Record<string, unknown>).def)) continue
    const d = (ch._zod as Record<string, unknown>).def as Record<string, unknown>
    if (d.check === 'greater_than' && typeof d.value === 'number') {
      c.min = d.value
      c.minInclusive = d.inclusive === true
    } else if (d.check === 'less_than' && typeof d.value === 'number') {
      c.max = d.value
      c.maxInclusive = d.inclusive === true
    }
  }
  return c
}

function arrayConstraintsV4(checks: unknown[]): ArrayConstraints {
  const c: ArrayConstraints = {}
  for (const check of checks) {
    if (!isObject(check)) continue
    const ch = check as Record<string, unknown>
    if (!isObject(ch._zod) || !isObject((ch._zod as Record<string, unknown>).def)) continue
    const d = (ch._zod as Record<string, unknown>).def as Record<string, unknown>
    if (d.check === 'min_length' && typeof d.minimum === 'number') c.minLength = d.minimum
    else if (d.check === 'max_length' && typeof d.maximum === 'number') c.maxLength = d.maximum
  }
  return c
}

function isIntegerV4(checks: unknown[] | undefined): boolean {
  if (!checks) return false
  return checks.some((check) => {
    const format =
      isObject(check) && isObject(check._zod) && isObject(check._zod.def)
        ? check._zod.def.format
        : undefined
    return typeof format === 'string' && format.includes('int')
  })
}

// ── Zod 3 ────────────────────────────────────────────────────────────────────

function fromV3(schema: ZodV3): IntrospectedNode {
  const def = schema._def
  switch (def.typeName) {
    case 'ZodString': {
      const constraints = stringConstraintsV3(def.checks ?? [])
      return { kind: 'string', ...(hasKeys(constraints) && { constraints }) }
    }
    case 'ZodNumber': {
      const constraints = numberConstraintsV3(def.checks ?? [])
      if (def.checks?.some((c) => c.kind === 'int'))
        return { kind: 'integer', ...(hasKeys(constraints) && { constraints }) }
      return { kind: 'number', ...(hasKeys(constraints) && { constraints }) }
    }
    case 'ZodBoolean':
      return { kind: 'boolean' }
    case 'ZodDate':
      return { kind: 'date' }
    case 'ZodObject': {
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape
      return objectNode(shape)
    }
    case 'ZodArray': {
      const constraints: ArrayConstraints = {}
      if (def.minLength) constraints.minLength = def.minLength.value
      if (def.maxLength) constraints.maxLength = def.maxLength.value
      return {
        kind: 'array',
        element: introspectZod(def.type),
        ...(hasKeys(constraints) && { constraints }),
      }
    }
    case 'ZodTuple': {
      const items = Array.isArray(def.items) ? def.items : []
      return {
        kind: 'tuple',
        elements: items.map(introspectZod),
        ...(def.rest != null && { rest: introspectZod(def.rest) }),
      }
    }
    case 'ZodRecord':
      return {
        kind: 'record',
        key: introspectZod(def.keyType),
        value: introspectZod(def.valueType),
      }
    case 'ZodOptional':
      return { kind: 'optional', inner: introspectZod(def.innerType) }
    case 'ZodNullable':
      return { kind: 'nullable', inner: introspectZod(def.innerType) }
    case 'ZodDefault':
      return { kind: 'default', inner: introspectZod(def.innerType) }
    case 'ZodCatch':
      return { kind: 'catch', inner: introspectZod(def.innerType) }
    case 'ZodUnion': {
      const opts = Array.isArray(def.options) ? def.options : []
      return { kind: 'union', members: opts.map(introspectZod) }
    }
    case 'ZodDiscriminatedUnion': {
      const opts =
        def.options instanceof Map
          ? [...def.options.values()].flat()
          : Array.isArray(def.options)
            ? def.options
            : []
      return { kind: 'union', members: (opts as unknown[]).map(introspectZod) }
    }
    case 'ZodEnum': {
      const vals = Array.isArray(def.values) ? def.values : []
      return { kind: 'enum', values: vals }
    }
    case 'ZodLiteral':
      return { kind: 'literal', value: def.value }
    case 'ZodNull':
      return { kind: 'null' }
    case 'ZodUndefined':
      return { kind: 'literal', value: undefined }
    case 'ZodAny':
    case 'ZodUnknown':
      return { kind: 'any' }
    case 'ZodSet': {
      const element =
        def.valueType !== undefined ? introspectZod(def.valueType) : { kind: 'any' as const }
      const constraints: ArrayConstraints = { uniqueItems: true }
      if (def.minSize?.value !== undefined) constraints.minLength = def.minSize.value
      if (def.maxSize?.value !== undefined) constraints.maxLength = def.maxSize.value
      return { kind: 'array', element, constraints }
    }
    default:
      return { kind: 'unknown' }
  }
}

function stringConstraintsV3(
  checks: Array<{ kind?: string; value?: number; regex?: RegExp }>,
): StringConstraints {
  const c: StringConstraints = {}
  const FORMAT_KINDS = new Set([
    'email',
    'url',
    'uuid',
    'datetime',
    'ip',
    'ipv4',
    'ipv6',
    'cuid',
    'cuid2',
    'nanoid',
    'base64',
    'emoji',
  ])
  for (const check of checks) {
    if (!check.kind) continue
    if (FORMAT_KINDS.has(check.kind)) c.format = check.kind
    else if (check.kind === 'regex' && check.regex) c.pattern = check.regex
    else if (check.kind === 'min' && check.value !== undefined) c.minLength = check.value
    else if (check.kind === 'max' && check.value !== undefined) c.maxLength = check.value
  }
  return c
}

function numberConstraintsV3(
  checks: Array<{ kind?: string; value?: number; inclusive?: boolean }>,
): NumberConstraints {
  const c: NumberConstraints = {}
  for (const check of checks) {
    if (check.kind === 'min' && check.value !== undefined) {
      c.min = check.value
      c.minInclusive = check.inclusive !== false
    } else if (check.kind === 'max' && check.value !== undefined) {
      c.max = check.value
      c.maxInclusive = check.inclusive !== false
    }
  }
  return c
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function objectNode(shape: Record<string, unknown> | undefined): IntrospectedNode {
  const entries: Record<string, IntrospectedNode> = {}
  for (const key of Object.keys(shape ?? {})) {
    entries[key] = introspectZod(shape?.[key])
  }
  return { kind: 'object', entries }
}

const hasKeys = (o: object) => Object.keys(o).length > 0
