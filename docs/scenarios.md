# Scenarios

Pass `scenario` to any generation entry point to get named, intent-bearing test data instead of anonymous random values.

```ts
import { generate, generateMany, generateRelational, defineScenario } from 'fixture-gen'

const fixture = generate(userSchema, { scenario: 'empty-state' })
const batch   = generateMany(userSchema, 10, { scenario: 'boundary-min' })
```

---

## Built-in scenarios

### `'happy-path'`

Valid, representative data. Every field is populated — optionals included — and all values
are within their stated constraints. This is the same as calling `generate` without a scenario.

```ts
const user = generate(UserSchema, { scenario: 'happy-path' })
// { id: '3a8f…', name: 'abcd', age: 42, bio: 'efgh' }
```

**Use for:** positive-path unit tests, Storybook fixtures, API contract checks.

---

### `'empty-state'`

- Optional fields → `undefined` (absent)
- Nullable fields → `null`
- Arrays → `[]`
- Records → `{}`
- All other required fields generated normally

```ts
const user = generate(UserSchema, { scenario: 'empty-state' })
// { id: '3a8f…', name: 'abcd', tags: [], bio: undefined }
```

**Use for:** testing empty-list renders, "no data yet" UI states, nullable-field null-handling.

---

### `'boundary-min'`

Every numeric and length constraint is set to its **minimum** value.

- Numbers/integers → `min` constraint (or `0` if none)
- Strings → exactly `minLength` characters (or `''` if none); format/pattern still applied
- Arrays → exactly `minLength` elements (or `[]` if none)
- Optional fields are **included** (boundary tests should validate)

```ts
const user = generate(UserSchema, { scenario: 'boundary-min' })
// { age: 18, name: 'a', tags: [] }  — assuming min(18), min(1), min(0)
```

**Use for:** off-by-one tests, minimum-value edge cases, lower-bound validation.

---

### `'boundary-max'`

Every numeric and length constraint is set to its **maximum** value.

- Numbers/integers → `max` constraint (or `min + 1000` if none)
- Strings → exactly `maxLength` characters (or `12` if none); format/pattern still applied
- Arrays → exactly `maxLength` elements (or `3` if none)

```ts
const user = generate(UserSchema, { scenario: 'boundary-max' })
// { age: 120, name: 'abcdefghijklm', tags: ['a', 'b', 'c'] }
```

**Use for:** overflow tests, maximum-length UI truncation, upper-bound validation.

---

### `'invalid'`

Returns a value of the **wrong type** for the root schema node — guaranteed to fail validation.

- Object schema → `null`
- String schema → `42`
- Number / integer schema → `'not-a-number'`
- Boolean schema → `'not-a-boolean'`
- Array schema → `null`

```ts
const bad = generate(UserSchema, { scenario: 'invalid' })
const result = UserSchema['~standard'].validate(bad)
// result.issues is defined — the value is intentionally invalid
```

**Use for:** error-path tests, validation-error message checks, middleware that rejects malformed input.

---

### `'missing-subtree'`

All **nested** required object fields are replaced with `null`. The root object is still generated.

```ts
const schema = z.object({
  id: z.string(),
  address: z.object({ street: z.string(), city: z.string() }),
})
const result = generate(schema, { scenario: 'missing-subtree' })
// { id: 'abc…', address: null }
```

**Use for:** testing graceful handling of missing nested data, null-pointer guard coverage,
optional-chaining code paths.

---

## User-defined scenarios

Use `defineScenario` to register project-specific named cases.

### Overrides object

```ts
defineScenario('admin-user', { role: 'admin', active: true })

const user = generate(UserSchema, { scenario: 'admin-user' })
// role and active are pinned; all other fields generated normally
```

### Factory function

```ts
defineScenario<User>('premium-user', (value) => ({
  ...value,
  plan: 'premium',
  expiresAt: new Date('2099-12-31'),
}))
```

### Inheritance with `extends`

Base from a built-in or another user-defined scenario, then patch:

```ts
defineScenario('empty-admin', { extends: 'empty-state', role: 'admin' })

const user = generate(UserSchema, { scenario: 'empty-admin' })
// tags:[], bio: undefined (from empty-state) + role: 'admin' (from override)
```

### Cleanup in tests

```ts
import { clearScenarios } from 'fixture-gen'
afterEach(() => clearScenarios())
```

---

## Propagation

`scenario` propagates automatically through `generateMany` and `generateRelational`:

```ts
const users = generateMany(UserSchema, 10, { scenario: 'empty-state' })

const { users, posts } = generateRelational(
  { users: UserSchema, posts: PostSchema },
  { counts: { users: 5, posts: 20 }, scenario: 'boundary-min' },
)
```
