import type { BulkComposition, Temperature } from '../BaseDTO/merged_schema';

export const COLD_TEMPERATURES: ReadonlySet<Temperature> = new Set([
  'Cryogenic',
  'Deepfrozen',
  'Polar',
  'Subarctic',
]);

/** Water remains the canonical composition; cold worlds display it as ice. */
export function displayBulkComposition(
  composition: BulkComposition,
  temperature: Temperature,
): BulkComposition | 'Ice' {
  return composition === 'Water' && COLD_TEMPERATURES.has(temperature) ? 'Ice' : composition;
}
