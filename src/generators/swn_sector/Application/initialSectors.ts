import { generate } from '../Generator/generate';
import type { Sector } from '../BaseDTO/merged_schema';

export function createInitialSectors(): Sector[] {
  return [generate({ seed: 'sector-one-seed' }), generate({ seed: 'sector-two-seed' })];
}
