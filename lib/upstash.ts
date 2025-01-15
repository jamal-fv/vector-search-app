import { Index } from '@upstash/vector'

export const createVectorIndex = (url: string, token: string) => {
  return new Index({
    url,
    token,
  })
} 