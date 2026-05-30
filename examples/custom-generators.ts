import { z } from 'zod'
import { generate } from '../src/index'

export const User = z.object({
  profile: z.object({
    name: z.string(),
    slug: z.string(),
  }),
  tag: z.string(),
})

export const user = generate(User, {
  seed: 42,
  generators: {
    'profile.slug': ({ prng }) => `slug-${prng.string(6)}`,
    'profile.name': ({ pathKey }) => `computed:${pathKey}`,
  },
  generator: ({ node, pathKey }) => {
    if (node.kind === 'string' && pathKey === 'tag') return 'schema-wide'
    return undefined
  },
})
