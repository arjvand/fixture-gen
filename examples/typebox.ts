import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { generate } from '../src/index'

export const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
  age: Type.Integer({ minimum: 18, maximum: 99 }),
})

export const user = generate(User, { seed: 42 })

export const isValid = Value.Check(User, user)
