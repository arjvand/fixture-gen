/**
 * Zod introspection — reads Zod internals to recover schema structure.
 *
 * Supports both Zod 4 (`schema._zod.def`) and Zod 3 (`schema._def`). Zod is a
 * *devDependency only*; we touch its internals through `unknown` rather than
 * importing it, so the library keeps zero runtime dependencies.
 */

import type { IntrospectedNode } from './index'

/** Loose view of a Zod 4 internal def. */
interface ZodV4 {
  _zod: { def: { type: string; shape?: Record<string, unknown>; checks?: unknown[] } }
}

/** Loose view of a Zod 3 internal def. */
interface ZodV3 {
  _def: {
    typeName: string
    shape?: Record<string, unknown> | (() => Record<string, unknown>)
    checks?: Array<{ kind?: string }>
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isZodV4 = (schema: unknown): schema is ZodV4 =>
  isObject(schema) && isObject((schema as Record<string, unknown>)._zod)

const isZodV3 = (schema: unknown): schema is ZodV3 =>
  isObject(schema) && isObject((schema as Record<string, unknown>)._def)

/** Walk a Zod schema into an {@link IntrospectedNode}. */
export function introspectZod(schema: unknown): IntrospectedNode {
  if (isZodV4(schema)) return fromV4(schema)
  if (isZodV3(schema)) return fromV3(schema)
  return { kind: 'unknown' }
}

function fromV4(schema: ZodV4): IntrospectedNode {
  const { def } = schema._zod
  switch (def.type) {
    case 'string':
      return { kind: 'string' }
    case 'number':
      return isIntegerV4(def.checks) ? { kind: 'integer' } : { kind: 'number' }
    case 'boolean':
      return { kind: 'boolean' }
    case 'date':
      return { kind: 'date' }
    case 'object':
      return objectNode(def.shape)
    default:
      return { kind: 'unknown' }
  }
}

function fromV3(schema: ZodV3): IntrospectedNode {
  const def = schema._def
  switch (def.typeName) {
    case 'ZodString':
      return { kind: 'string' }
    case 'ZodNumber':
      return def.checks?.some((c) => c.kind === 'int') ? { kind: 'integer' } : { kind: 'number' }
    case 'ZodBoolean':
      return { kind: 'boolean' }
    case 'ZodDate':
      return { kind: 'date' }
    case 'ZodObject': {
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape
      return objectNode(shape)
    }
    default:
      return { kind: 'unknown' }
  }
}

/** A Zod 4 number is an integer when a `number_format` check uses an int format. */
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

function objectNode(shape: Record<string, unknown> | undefined): IntrospectedNode {
  const entries: Record<string, IntrospectedNode> = {}
  for (const key of Object.keys(shape ?? {})) {
    entries[key] = introspectZod(shape?.[key])
  }
  return { kind: 'object', entries }
}
