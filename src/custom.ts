import { deriveSeed } from './hash'
import type { IntrospectedNode } from './introspect'
import { type Prng, createPrng } from './prng'

export interface GenerateContext {
  /** Path segments from the root schema to the current node. */
  readonly path: readonly string[]
  /** Dot-joined path string used by field generators. */
  readonly pathKey: string
  /** Introspected schema node at the current path. */
  readonly node: IntrospectedNode
  /** Root seed used for deterministic generation. */
  readonly seed: number
  /** Deterministic path-local PRNG for custom value construction. */
  readonly prng: Prng
}

/** Custom generator function used by `GenerateOptions.generator` and `GenerateOptions.generators`. */
export type CustomGenerator = (context: GenerateContext) => unknown

/** Create the context passed to custom generators. */
export function createContext(
  seed: number,
  path: readonly string[],
  node: IntrospectedNode,
): GenerateContext {
  const pathKey = path.join('.')
  return {
    path,
    pathKey,
    node,
    seed,
    prng: createPrng(deriveSeed(seed, pathKey)),
  }
}

export function resolveCustomGenerator(
  path: readonly string[],
  generators: Record<string, CustomGenerator> | undefined,
): CustomGenerator | undefined {
  if (!generators) return undefined

  const pathKey = path.join('.')
  if (Object.prototype.hasOwnProperty.call(generators, pathKey)) {
    return generators[pathKey]
  }

  for (const [pattern, generator] of Object.entries(generators)) {
    if (pattern === pathKey) continue
    if (matchesPattern(pattern, path)) return generator
  }

  return undefined
}

export function isValidCustomValue(node: IntrospectedNode, value: unknown): boolean {
  switch (node.kind) {
    case 'string':
      return isValidString(node.constraints, value)
    case 'number':
      return isValidNumber(node.constraints, value)
    case 'integer':
      return isValidInteger(node.constraints, value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'date':
      return value instanceof Date && !Number.isNaN(value.getTime())
    case 'object':
      return isValidObject(node.entries, value)
    case 'array':
      return isValidArray(node, value)
    case 'tuple':
      return isValidTuple(node, value)
    case 'record':
      return isValidRecord(node, value)
    case 'optional':
      return value === undefined || isValidCustomValue(node.inner, value)
    case 'nullable':
      return value === null || isValidCustomValue(node.inner, value)
    case 'default':
    case 'catch':
      return isValidCustomValue(node.inner, value)
    case 'union':
      return node.members.some((member) => isValidCustomValue(member, value))
    case 'enum':
      return node.values.some((candidate) => Object.is(candidate, value))
    case 'literal':
      return Object.is(node.value, value)
    default:
      return true
  }
}

function matchesPattern(pattern: string, path: readonly string[]): boolean {
  if (pattern === '') return path.length === 0

  const parts = pattern.split('.')
  if (parts.length !== path.length) return false

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const segment = path[i]
    if (part !== '*' && part !== segment) return false
  }

  return true
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
  )
}

function isValidObject(entries: Record<string, IntrospectedNode>, value: unknown): boolean {
  if (!isPlainObject(value)) return false

  for (const key of Object.keys(value)) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) return false
  }

  for (const [key, child] of Object.entries(entries)) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      if (child.kind === 'optional' || child.kind === 'default' || child.kind === 'catch') {
        continue
      }
      return false
    }

    if (!isValidCustomValue(child, value[key])) return false
  }

  return true
}

function isValidArray(node: Extract<IntrospectedNode, { kind: 'array' }>, value: unknown): boolean {
  if (!Array.isArray(value)) return false

  const length = value.length
  const min = node.constraints?.minLength ?? 0
  if (length < min) return false
  if (node.constraints?.maxLength !== undefined && length > node.constraints.maxLength) {
    return false
  }

  return value.every((item) => isValidCustomValue(node.element, item))
}

function isValidTuple(node: Extract<IntrospectedNode, { kind: 'tuple' }>, value: unknown): boolean {
  if (!Array.isArray(value)) return false
  if (value.length < node.elements.length) return false
  if (!node.rest && value.length !== node.elements.length) return false

  for (let i = 0; i < node.elements.length; i++) {
    const element = node.elements[i]
    if (element === undefined || !isValidCustomValue(element, value[i])) return false
  }

  if (node.rest) {
    for (let i = node.elements.length; i < value.length; i++) {
      if (!isValidCustomValue(node.rest, value[i])) return false
    }
  }

  return true
}

function isValidRecord(
  node: Extract<IntrospectedNode, { kind: 'record' }>,
  value: unknown,
): boolean {
  if (!isPlainObject(value)) return false

  for (const [key, item] of Object.entries(value)) {
    if (!isValidRecordKey(node.key, key)) return false
    if (!isValidCustomValue(node.value, item)) return false
  }

  return true
}

function isValidRecordKey(node: IntrospectedNode, key: string): boolean {
  switch (node.kind) {
    case 'string':
      return isValidString(node.constraints, key)
    case 'integer':
      return /^-?\d+$/.test(key)
    case 'number':
      return Number.isFinite(Number(key))
    case 'boolean':
      return key === 'true' || key === 'false'
    case 'enum':
      return node.values.some((candidate) => String(candidate) === key)
    case 'literal':
      return String(node.value) === key
    case 'union':
      return node.members.some((member) => isValidRecordKey(member, key))
    default:
      return true
  }
}

function isValidString(
  constraints: Extract<IntrospectedNode, { kind: 'string' }>['constraints'],
  value: unknown,
): boolean {
  if (typeof value !== 'string') return false

  if (constraints?.minLength !== undefined && value.length < constraints.minLength) return false
  if (constraints?.maxLength !== undefined && value.length > constraints.maxLength) return false
  if (constraints?.pattern && !cloneRegex(constraints.pattern).test(value)) return false

  switch (constraints?.format) {
    case 'uuid':
      return UUID_RE.test(value)
    case 'email':
      return EMAIL_RE.test(value)
    case 'url':
    case 'uri':
      return isValidUrl(value)
    case 'datetime':
      return !Number.isNaN(Date.parse(value))
    case 'date':
      return DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    case 'time':
      return TIME_RE.test(value)
    case 'ip':
    case 'ipv4':
      return IPV4_RE.test(value)
    case 'ipv6':
      return IPV6_RE.test(value)
    case 'cuid':
      return /^c[a-z0-9]{24}$/i.test(value)
    case 'cuid2':
      return /^[a-z0-9]{24}$/i.test(value)
    case 'nanoid':
      return /^[A-Za-z0-9_-]{21}$/.test(value)
    case 'base64':
      return BASE64_RE.test(value)
    case 'emoji':
      return EMOJI_RE.test(value)
    default:
      return true
  }
}

function isValidNumber(
  constraints: Extract<IntrospectedNode, { kind: 'number' }>['constraints'],
  value: unknown,
): boolean {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  if (constraints?.min !== undefined) {
    if (constraints.minInclusive === false ? value <= constraints.min : value < constraints.min) {
      return false
    }
  }
  if (constraints?.max !== undefined) {
    if (constraints.maxInclusive === false ? value >= constraints.max : value > constraints.max) {
      return false
    }
  }
  return true
}

function isValidInteger(
  constraints: Extract<IntrospectedNode, { kind: 'integer' }>['constraints'],
  value: unknown,
): boolean {
  return Number.isInteger(value) && isValidNumber(constraints, value)
}

function cloneRegex(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags)
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol.length > 0
  } catch {
    return false
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}:\d{2}(\.\d+)?$/
const IPV4_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const IPV6_RE = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
const EMOJI_RE = /\p{Extended_Pictographic}/u
