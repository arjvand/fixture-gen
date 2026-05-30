import * as v from 'valibot'
import { generate } from '../src/index'

export const User = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.string(),
  age: v.pipe(v.number(), v.integer(), v.minValue(18), v.maxValue(99)),
})

export const user = generate(User, { seed: 42 })
