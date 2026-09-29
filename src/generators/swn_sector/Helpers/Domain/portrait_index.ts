/** Every portrait category offers three sources with six variants each. */
export const PORTRAIT_VARIANT_COUNT = 18;

export function isPortraitIndex(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < PORTRAIT_VARIANT_COUNT
  );
}
