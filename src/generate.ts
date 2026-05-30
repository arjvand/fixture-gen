/**
 * Public entry point: `generate(schema, options?)`.
 *
 * Reads a Standard Schema through the vendor-keyed introspection layer and
 * produces deterministic, validating mock data. Identical `seed` ⇒ identical
 * output, across runs and machines.
 */

import { generateValue } from './generators'
import { introspect } from './introspect'
import { createPrng } from './prng'
import type { InferOutput, StandardSchemaV1 } from './standard'

export interface GenerateOptions {
  /** Seed for deterministic output. Same seed → same data. Defaults to `0`. */
  seed?: number
}

/** Generate a single fixture from a Standard Schema. */
export function generate<S extends StandardSchemaV1>(
  schema: S,
  options: GenerateOptions = {},
): InferOutput<S> {
  const node = introspect(schema)
  const prng = createPrng(options.seed)
  return generateValue(node, prng) as InferOutput<S>
}
