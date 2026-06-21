export function mergeOverrides<T extends Record<string, unknown>>(
  base: T | undefined,
  call: T | undefined,
): T | undefined {
  if (call === undefined) return base
  if (!base) return call
  return { ...base, ...call }
}
