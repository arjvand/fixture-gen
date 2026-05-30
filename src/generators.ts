/**
 * Value generators — turn an introspected node into a concrete value using the
 * seeded PRNG. Phase 1 covers primitives and flat objects; constraints, formats,
 * and composites arrive in Phase 2.
 */

import type { IntrospectedNode } from './introspect'
import type { Prng } from './prng'

/** Epoch (ms) anchoring generated dates: 2000-01-01T00:00:00Z. */
const DATE_ANCHOR = 946684800000
/** ~10 years of millisecond range for date generation. */
const DATE_SPREAD = 315360000000

/** Generate a value for an introspected node. Never throws on unknown nodes. */
export function generateValue(node: IntrospectedNode, prng: Prng): unknown {
  switch (node.kind) {
    case 'string':
      return prng.string(prng.int(4, 12))
    // An integer satisfies both `number` and `number().int()`, so Phase 1
    // produces integers for both kinds (no constraint logic yet).
    case 'number':
    case 'integer':
      return prng.int(0, 1000)
    case 'boolean':
      return prng.bool()
    case 'date':
      return new Date(DATE_ANCHOR + prng.int(0, DATE_SPREAD))
    case 'object': {
      const result: Record<string, unknown> = {}
      for (const key of Object.keys(node.entries)) {
        const child = node.entries[key]
        if (child) result[key] = generateValue(child, prng)
      }
      return result
    }
    default:
      // Unknown / opaque node — constraint-satisfying placeholder, never throw.
      return undefined
  }
}
