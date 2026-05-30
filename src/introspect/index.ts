/**
 * Vendor-keyed schema introspection.
 *
 * The Standard Schema `~standard` property exposes no runtime structure, so we
 * recover it from each validator's internals — dispatched on `~standard.vendor`
 * so the public API stays schema-agnostic and consumers write no adapters.
 * Unknown vendors / node types fall back to `{ kind: 'unknown' }`, which the
 * generator resolves via a constraint-satisfying placeholder.
 */

import type { StandardSchemaV1 } from '../standard'
import { introspectZod } from './zod'

/** A resolved schema node (Phase 1 kinds only). */
export type IntrospectedNode =
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'integer' }
  | { kind: 'boolean' }
  | { kind: 'date' }
  | { kind: 'object'; entries: Record<string, IntrospectedNode> }
  | { kind: 'unknown' }

/** Resolve a Standard Schema into an {@link IntrospectedNode} tree. */
export function introspect(schema: StandardSchemaV1): IntrospectedNode {
  const vendor = schema['~standard']?.vendor
  switch (vendor) {
    case 'zod':
      return introspectZod(schema)
    default:
      return { kind: 'unknown' }
  }
}
