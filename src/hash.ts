const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

export function hashString(input: string): number {
  let hash = FNV_OFFSET
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i) ?? 0
    hash = Math.imul(hash, FNV_PRIME)
  }
  return hash >>> 0
}

export function deriveSeed(seed: number, label: string): number {
  return (hashString(`${seed >>> 0}:${label}`) ^ (seed >>> 0)) >>> 0
}
