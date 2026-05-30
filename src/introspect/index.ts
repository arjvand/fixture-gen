import { introspectZod } from './zod'
import { introspectValibot } from './valibot'
import { introspectArkType } from './arktype'
import { introspectTypeBox } from './typebox'

export interface StringConstraints {
  format?: string
  minLength?: number
  maxLength?: number
  pattern?: RegExp
}

export interface NumberConstraints {
  min?: number
  max?: number
  minInclusive?: boolean
  maxInclusive?: boolean
}

export interface ArrayConstraints {
  minLength?: number
  maxLength?: number
}

export type IntrospectedNode =
  | { kind: 'string'; constraints?: StringConstraints }
  | { kind: 'number'; constraints?: NumberConstraints }
  | { kind: 'integer'; constraints?: NumberConstraints }
  | { kind: 'boolean' }
  | { kind: 'date' }
  | { kind: 'object'; entries: Record<string, IntrospectedNode> }
  | { kind: 'array'; element: IntrospectedNode; constraints?: ArrayConstraints }
  | { kind: 'tuple'; elements: IntrospectedNode[]; rest?: IntrospectedNode }
  | { kind: 'record'; key: IntrospectedNode; value: IntrospectedNode }
  | { kind: 'optional'; inner: IntrospectedNode }
  | { kind: 'nullable'; inner: IntrospectedNode }
  | { kind: 'default'; inner: IntrospectedNode }
  | { kind: 'catch'; inner: IntrospectedNode }
  | { kind: 'union'; members: IntrospectedNode[] }
  | { kind: 'enum'; values: Array<string | number | boolean> }
  | { kind: 'literal'; value: unknown }
  | { kind: 'unknown' }

const isObject = (value: unknown): value is Record<string, unknown> | Function =>
  (typeof value === 'object' || typeof value === 'function') && value !== null

const isTypeBoxSchema = (value: unknown): boolean =>
  isObject(value) &&
  Object.getOwnPropertySymbols(value).some((symbol) => symbol.toString() === 'Symbol(TypeBox.Kind)')

export function introspect(schema: unknown): IntrospectedNode {
  const standard =
    isObject(schema) ? ((schema as any)['~standard'] as { vendor?: string } | undefined) : undefined
  const vendor = standard?.vendor
  switch (vendor) {
    case 'zod':
      return introspectZod(schema)
    case 'valibot':
      return introspectValibot(schema)
    case 'arktype':
      return introspectArkType(schema)
    default:
      return isTypeBoxSchema(schema) ? introspectTypeBox(schema) : { kind: 'unknown' }
  }
}
