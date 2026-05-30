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
  options?: GenerateOptions<InferOutput<S>>,
): InferOutput<S>
/** Generate a single fixture from a TypeBox schema or other supported schema object. */
export function generate(schema: object, options?: GenerateOptions): unknown
export function generate(schema: object, options: GenerateOptions = {}): unknown {
  return generateInternal(schema, options)
}

function generateInternal(schema: object, options: GenerateOptions = {}): unknown {
  const node = introspect(schema)
  const prng = createPrng(options.seed)
  const value = generateValue(node, prng)
  if (options.overrides && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>), ...options.overrides }
  }
  return value
}

/** Generate an array of `count` fixtures, each with a distinct derived seed. */
export function generateMany<S extends StandardSchemaV1>(
  schema: S,
  count: number,
  options?: GenerateOptions<InferOutput<S>>,
): Array<InferOutput<S>>
/** Generate an array of `count` fixtures for a TypeBox schema or other supported schema object. */
export function generateMany(schema: object, count: number, options?: GenerateOptions): unknown[]
export function generateMany(schema: object, count: number, options: GenerateOptions = {}): unknown[] {
  return generateManyInternal(schema, count, options)
}

function generateManyInternal(schema: object, count: number, options: GenerateOptions = {}): unknown[] {
  const base = options.seed ?? 0
  return Array.from({ length: count }, (_, i) => generate(schema, { ...options, seed: base + i }))
}
