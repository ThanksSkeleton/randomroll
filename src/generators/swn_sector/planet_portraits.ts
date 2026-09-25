import mercurian from './portrait_review/manifests/mercurian.json';
import europanIce from './portrait_review/manifests/europan-ice.json';
import europanWater from './portrait_review/manifests/europan-water.json';
import type { Planet } from './merged_schema';
import { choose, randomFor } from './generation_random';
import { displayBulkComposition } from './planet_presentation';

export const planetPortraitManifests = {
  mercurian,
  'europan-ice': europanIce,
  'europan-water': europanWater,
} as const;

export type PlanetPortraitCategory = keyof typeof planetPortraitManifests;

export function planetPortraitCategory(
  template: string,
  temperature: Planet['Temperature'],
): PlanetPortraitCategory | undefined {
  if (template === 'Mercurian') return 'mercurian';
  if (template === 'Europan / Plutonic')
    return displayBulkComposition('Water', temperature) === 'Ice' ? 'europan-ice' : 'europan-water';
  return undefined;
}

export function assignPlanetPortraitId(
  seed: string,
  entityPath: string,
  category: PlanetPortraitCategory,
): string {
  const manifest = planetPortraitManifests[category];
  const ids = manifest.images.flatMap((image) => image.variants.map((variant) => variant.id));
  return choose(randomFor(seed, entityPath + ':portrait'), ids, category + ' portraits');
}

export type PlanetPortrait = {
  sourcePath: string;
  css: { filter?: string; transform?: string };
};

export function resolvePlanetPortrait(id: string): PlanetPortrait | undefined {
  for (const manifest of Object.values(planetPortraitManifests)) {
    for (const image of manifest.images) {
      const variant = image.variants.find((item) => item.id === id);
      if (variant) return { sourcePath: image.sourcePath, css: variant.css };
    }
  }
  return undefined;
}
