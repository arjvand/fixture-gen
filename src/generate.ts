import {
  type CustomGenerator,
  createContext,
  isValidCustomValue,
  resolveCustomGenerator,
} from './custom'
import { generateBuiltinValue } from './generators'
import { introspect } from './introspect'
import type { InferOutput, StandardSchemaV1 } from './standard'

export interface GenerateOptions<T = unknown> {
  /** Seed for deterministic output. Same seed → same data. Defaults to `0`. */
  seed?: number
  /** Pin specific field values, bypassing generation. */
  overrides?: Partial<T>
  /** Field-path keyed custom generators. `*` matches a single path segment. */
  generators?: Record<string, CustomGenerator>
  /** Schema-wide custom generator hook that can override any node. */
  generator?: CustomGenerator
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
  const seed = options.seed ?? 0
  const value = generateNode(node, seed, [], options)
  if (options.overrides && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>), ...options.overrides }
  }
  return value
}

function generateNode(
  node: Parameters<typeof generateBuiltinValue>[0],
  seed: number,
  path: readonly string[],
  options: GenerateOptions,
): unknown {
  const context = createContext(seed, path, node)
  const fieldGenerator = resolveCustomGenerator(path, options.generators)
  if (fieldGenerator) {
    const custom = fieldGenerator(context)
    if (isValidCustomValue(node, custom)) return custom
  }
  if (options.generator) {
    const custom = options.generator(context)
    if (isValidCustomValue(node, custom)) return custom
  }

  return generateBuiltinValue(node, seed, path, (child, childPath) =>
    generateNode(child, seed, childPath, options),
  )
}

/** Generate an array of `count` fixtures, each with a distinct derived seed. */
export function generateMany<S extends StandardSchemaV1>(
  schema: S,
  count: number,
  options?: GenerateOptions<InferOutput<S>>,
): Array<InferOutput<S>>
/** Generate an array of `count` fixtures for a TypeBox schema or other supported schema object. */
export function generateMany(schema: object, count: number, options?: GenerateOptions): unknown[]
export function generateMany(
  schema: object,
  count: number,
  options: GenerateOptions = {},
): unknown[] {
  return generateManyInternal(schema, count, options)
}

function generateManyInternal(
  schema: object,
  count: number,
  options: GenerateOptions = {},
): unknown[] {
  const base = options.seed ?? 0
  return Array.from({ length: count }, (_, i) => generate(schema, { ...options, seed: base + i }))
}
