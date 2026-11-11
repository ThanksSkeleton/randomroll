import { generate } from '../Generator/generate';
import type { Sector } from '../BaseDTO/merged_schema';

export function createInitialSectors(seed = 'sector-one-seed'): Sector[] {
  return [generate({ seed })];
}
