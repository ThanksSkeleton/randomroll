import seedrandom from 'seedrandom';

/** A random stream isolated to one semantic part of a generated sector. */
export type RandomSource = seedrandom.PRNG;

export function randomFor(seed: string, entityPath: string): RandomSource {
  return seedrandom(`${seed}:${entityPath}`);
}

export function rollDie(random: RandomSource, sides: number): number {
  if (!Number.isInteger(sides) || sides < 1) throw new Error(`Invalid die size: ${sides}`);
  return Math.floor(random() * sides) + 1;
}

export function choose<T>(random: RandomSource, values: readonly T[], context = 'values'): T {
  if (values.length === 0) throw new Error(`Cannot choose from empty ${context}`);
  return values[rollDie(random, values.length) - 1]!;
}

export function chooseWeighted<T extends { Weight: number }>(
  random: RandomSource,
  values: readonly T[],
  context = 'weighted values',
): T {
  const totalWeight = values.reduce((total, value) => total + value.Weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0)
    throw new Error(`Cannot choose from empty or zero-weight ${context}`);
  let remaining = random() * totalWeight;
  for (const value of values) {
    remaining -= value.Weight;
    if (remaining < 0) return value;
  }
  return values[values.length - 1]!;
}

export function shuffled<T>(random: RandomSource, values: readonly T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = rollDie(random, index + 1) - 1;
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

export function angleDegrees(random: RandomSource): number {
  return random() * 360;
}

function fnv1a(value: string, offset: number): number {
  let hash = offset >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** A stable opaque UUID-shaped identifier derived from a seed and semantic path. */
export function deterministicId(seed: string, entityPath: string): string {
  const input = `${seed}\u0000${entityPath}`;
  const words = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b].map((offset) =>
    fnv1a(input, offset),
  );
  const hex = words.map((word) => word.toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${((Number.parseInt(hex[16]!, 16) & 3) | 8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20)}`;
}
