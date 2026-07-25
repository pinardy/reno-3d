// Shared coercers for free-form item params (Record<string, number|string|boolean>).

export const num = (v: unknown, d: number): number =>
  typeof v === 'number' ? v : d

export const bool = (v: unknown, d: boolean): boolean =>
  typeof v === 'boolean' ? v : d
