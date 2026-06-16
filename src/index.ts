export { generate, generateMany } from './generate'
export { generateRelational } from './relational'
export type { GenerateOptions } from './generate'
export type { RefineHook } from './generate'
export type { BusinessRuleHook } from './relational'
export type { CustomGenerator, GenerateContext } from './custom'
export type { IntrospectedNode } from './introspect'
export type { RelationalOptions, RelationalResult } from './relational'
export type { InferOutput, StandardSchemaV1 } from './standard'
export type { Prng } from './prng'
export { defineScenario, clearScenarios } from './scenario'
export type { BuiltinScenario, ScenarioName } from './scenario'

// Phase 10 — JSON Schema & OpenAPI bridge
export { generateFromJsonSchema } from './json-schema'
export { generateFromOpenApi } from './openapi'
export { toJsonSchema } from './to-json-schema'
export type { JSONSchema } from './introspect/json-schema'
export type { OpenAPIObject } from './openapi'

/** Package version marker. */
export const VERSION = '1.3.2'
