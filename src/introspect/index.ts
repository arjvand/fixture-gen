import type { StandardSchemaV1 } from '../standard'
import { introspectZod } from './zod'

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

export function introspect(schema: StandardSchemaV1): IntrospectedNode {
  const vendor = schema['~standard']?.vendor
  switch (vendor) {
    case 'zod':
      return introspectZod(schema)
    default:
      return { kind: 'unknown' }
  }
}
