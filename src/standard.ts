/**
 * Minimal internal re-declaration of the Standard Schema interface
 * (https://standardschema.dev). Hand-declared so the library keeps **zero
 * runtime dependencies** — we never import a validator or the spec package.
 *
 * Note: `~standard` carries no schema *structure* at runtime (only
 * `vendor`/`validate`/type-level `types`). Structure is recovered by the
 * vendor-keyed introspection layer; `validate` is used to round-trip output.
 */

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>
}

export namespace StandardSchemaV1 {
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1
    readonly vendor: string
    readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>
    readonly types?: Types<Input, Output> | undefined
  }

  export type Result<Output> = SuccessResult<Output> | FailureResult

  export interface SuccessResult<Output> {
    readonly value: Output
    readonly issues?: undefined
  }

  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>
  }

  export interface Issue {
    readonly message: string
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined
  }

  export interface PathSegment {
    readonly key: PropertyKey
  }

  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input
    readonly output: Output
  }
}

/** Infer the validated output type of a Standard Schema. */
export type InferOutput<S extends StandardSchemaV1> = NonNullable<S['~standard']['types']>['output']
