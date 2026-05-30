/**
 * fixture-gen — schema-agnostic, deterministic test fixtures for any
 * Standard Schema validator.
 *
 * Phase 1 ships the deterministic core: `generate()` over the Standard Schema
 * interface for primitives and flat objects. `generateMany` /
 * `generateRelational` and richer type/constraint coverage land in later phases.
 */

export { generate } from './generate'
export type { GenerateOptions } from './generate'
export type { InferOutput, StandardSchemaV1 } from './standard'

/** Package version marker. */
export const VERSION = '0.0.0'
