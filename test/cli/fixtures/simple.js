import { z } from 'zod'
export default z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().int().min(0).max(120),
})
