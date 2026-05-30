import { type } from 'arktype'
import { generate } from '../src/index'

export const User = type({
  id: 'string.uuid',
  name: 'string',
  age: 'number',
})

export const user = generate(User, { seed: 42 })
