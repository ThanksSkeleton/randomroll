import type { Sector } from '../BaseDTO/merged_schema';
import { cultureRealizationTiers } from '../Shared/culture_realization_tiers';
import { completeWorld } from './culture';

/** Retained starting-area completion path; ordinary generation uses global realization. */
export function realizeStartingArea(sector: Sector): Sector {
  const realizationTiers = cultureRealizationTiers(sector);
  let completed = sector;
  for (const system of sector.Systems) {
    if (!realizationTiers.has(system.Id)) continue;
    for (const object of system.Objects)
      if (object.Kind === 'Planet' && object.InhabitedInfo !== false)
        completed = completeWorld(completed, object.Id);
  }
  return completed;
}
