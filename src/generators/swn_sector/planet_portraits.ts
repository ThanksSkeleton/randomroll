import type { GeneratedPlanet as Planet } from './generation_model';
import type { Temperature } from './merged_schema';
import { assignPortraitId, portraitIdInCategory, type PortraitCategory } from './portrait_assets';
import { displayBulkComposition } from './planet_presentation';

export type PlanetPortraitCategory = Exclude<
  PortraitCategory,
  | 'star-a'
  | 'star-f'
  | 'star-g'
  | 'star-k'
  | 'star-m'
  | 'star-giant'
  | 'star-white-dwarf'
  | 'star-neutron-star'
  | 'star-black-hole'
  | 'asteroid-belt'
  | 'kuiper-belt'
  | 'gas-cloud'
  | 'independent-station'
  | 'deep-space-station'
  | 'asteroid-base'
  | 'remote-moon-base'
  | 'ancient-orbital-ruin'
  | 'research-base'
  | 'asteroid-belt-poi'
  | 'comet-base'
  | 'comet-belt-poi'
  | 'gas-mine'
  | 'refueling-station'
  | 'Route'
>;

const templateCategories: Record<string, PlanetPortraitCategory> = {
  Mercurian: 'mercurian',
  'Europan / Plutonic': 'europan-ice',
  Lunar: 'lunar',
  Ioan: 'ioan',
  Titanian: 'titanian',
  Martian: 'martian',
  Venusian: 'venusian',
  Jovian: 'jovian',
  Neptunian: 'neptunian',
};

export function planetPortraitCategory(
  template: string,
  temperature: Temperature,
): PlanetPortraitCategory | undefined {
  if (template === 'Europan / Plutonic')
    return displayBulkComposition('Water', temperature) === 'Ice' ? 'europan-ice' : 'europan-water';
  return templateCategories[template];
}

export function assignPlanetPortraitId(
  seed: string,
  entityPath: string,
  category: PlanetPortraitCategory,
): string {
  return assignPortraitId(seed, entityPath, category);
}

export function matchWaterWorldPortraitToTemperature(planet: Planet): Planet {
  if (
    planet.Kind !== 'Planet' ||
    planet.InhabitedInfo !== false ||
    planet.BulkComposition !== 'Water'
  )
    return planet;

  const category = planetPortraitCategory('Europan / Plutonic', planet.Temperature);
  if (!category || !planet.PortraitAssetId) return planet;

  const portraitAssetId = portraitIdInCategory(planet.PortraitAssetId, category);
  if (!portraitAssetId)
    throw new Error(`Cannot map water-world portrait ${planet.PortraitAssetId} to ${category}.`);
  return portraitAssetId === planet.PortraitAssetId
    ? planet
    : { ...planet, PortraitAssetId: portraitAssetId };
}
