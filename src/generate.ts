import { generateValue } from './generators'
import { introspect } from './introspect'
import { createPrng } from './prng'
import type { InferOutput, StandardSchemaV1 } from './standard'

export interface GenerateOptions<T = unknown> {
  /** Seed for deterministic output. Same seed → same data. Defaults to `0`. */
  seed?: number
  /** Pin specific field values, bypassing generation. */
  overrides?: Partial<T>
}

/** Generate a single fixture from a Standard Schema. */
export function generate<S extends StandardSchemaV1>(
  schema: S,
  options: GenerateOptions<InferOutput<S>> = {},
): InferOutput<S> {
  const node = introspect(schema)
  const prng = createPrng(options.seed)
  const value = generateValue(node, prng)
  if (options.overrides && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>), ...options.overrides } as InferOutput<S>
  }
  return value as InferOutput<S>
}

/** Generate an array of `count` fixtures, each with a distinct derived seed. */
export function generateMany<S extends StandardSchemaV1>(
  schema: S,
  count: number,
  options: GenerateOptions<InferOutput<S>> = {},
): Array<InferOutput<S>> {
  const base = options.seed ?? 0
  return Array.from({ length: count }, (_, i) => generate(schema, { ...options, seed: base + i }))
}
