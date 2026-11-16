import type { Sector } from '../BaseDTO/merged_schema';
import { completeWorld } from './culture';
import { checkAllInvariants } from './generated_sector_invariants';

/** Realize every inhabited world without changing the input sector. */
export function realizeSector(sector: Sector): Sector {
  const inputViolations = checkAllInvariants(sector);
  if (inputViolations.length)
    throw new Error(`Cannot realize an invalid sector: ${inputViolations[0]!.Message}`);

  const worldIds = sector.Systems.flatMap((system) => system.Objects)
    .filter(
      (object) => object.Kind === 'Planet' && object.InhabitedInfo !== false && !object.Culture,
    )
    .map((world) => world.Id)
    .sort((left, right) => left.localeCompare(right));

  let completed = sector;
  for (const worldId of worldIds) completed = completeWorld(completed, worldId);

  const outputViolations = checkAllInvariants(completed);
  if (outputViolations.length)
    throw new Error(`Realized sector is invalid: ${outputViolations[0]!.Message}`);
  return completed;
}
