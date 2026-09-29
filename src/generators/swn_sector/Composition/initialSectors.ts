import { generate } from '../Generator/generate';
import type { Sector } from '../BaseDTO/merged_schema';

export function createInitialSectors(): Sector[] {
  return [generate('sector-one-seed'), generate('sector-two-seed')];
}
