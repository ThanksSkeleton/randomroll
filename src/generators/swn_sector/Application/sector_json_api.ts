import { generate } from '../Generator/generate';

/** Return the complete, default-generated sector for a seed as JSON. */
export function sectorJsonForSeed(seed: string): string {
  return JSON.stringify(generate({ seed }), null, 2);
}
