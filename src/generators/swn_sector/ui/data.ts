import { generate } from '../generate';
import { cloneSectorWithFreshIds } from './domain/sector/operations';
import type { Sector } from './domain/sector/model';

export {
  areAdjacentHexes,
  findContainingSystem,
  findObject,
  getAllSelectableIds,
} from './domain/sector/selectors';
export { validateSector } from './domain/sector/validation';
export type { Sector } from './domain/sector/model';

export function createInitialSectors(): Sector[] {
  return [generate('sector-one-seed'), generate('sector-two-seed')];
}

export function cloneSectorTemplate(template: Sector, seed: string, index: number): Sector {
  return cloneSectorWithFreshIds(template, seed, index, () => crypto.randomUUID());
}

export { generate };
