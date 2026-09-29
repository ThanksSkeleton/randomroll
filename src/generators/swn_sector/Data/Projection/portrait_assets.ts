import tunedSources from './portrait_variants.json';
import type {
  OtherCelestialObjectType,
  PointOfInterestType,
  StarType,
} from '../../BaseDTO/merged_schema';
import { isPortraitIndex, PORTRAIT_VARIANT_COUNT } from '../../Helpers/Domain/portrait_index';

export const portraitCategoryKeys = [
  'mercurian',
  'europan-ice',
  'europan-water',
  'lunar',
  'ioan',
  'titanian',
  'martian',
  'venusian',
  'jovian',
  'neptunian',
  'star-a',
  'star-f',
  'star-g',
  'star-k',
  'star-m',
  'star-giant',
  'star-white-dwarf',
  'star-neutron-star',
  'star-black-hole',
  'asteroid-belt',
  'kuiper-belt',
  'gas-cloud',
  'independent-station',
  'deep-space-station',
  'asteroid-base',
  'remote-moon-base',
  'ancient-orbital-ruin',
  'research-base',
  'asteroid-belt-poi',
  'comet-base',
  'comet-belt-poi',
  'gas-mine',
  'refueling-station',
  'Route',
] as const;

export type PortraitCategory = (typeof portraitCategoryKeys)[number];
export type PortraitStyle = { filter?: string; transform?: string };
export type ResolvedPortrait = {
  sourcePath: string;
  css: PortraitStyle;
  category: PortraitCategory;
};
type Tuning = { h: number; s: number; v: number };
type TunedSource = { a: Tuning; b: Tuning };
type PortraitVariant = { id: string; css: PortraitStyle };
type PortraitImage = { sourcePath: string; variants: PortraitVariant[] };

const starCategory: Record<StarType, PortraitCategory> = {
  'A-type': 'star-a',
  'F-type': 'star-f',
  'G-type': 'star-g',
  'K-type': 'star-k',
  'M-type': 'star-m',
  Giant: 'star-giant',
  'White dwarf': 'star-white-dwarf',
  'Neutron star': 'star-neutron-star',
  'Stellar-mass black hole': 'star-black-hole',
};

const objectCategory: Record<OtherCelestialObjectType, PortraitCategory> = {
  AsteroidBelt: 'asteroid-belt',
  KuiperBelt: 'kuiper-belt',
  GasCloud: 'gas-cloud',
  IndependentStation: 'independent-station',
};

const poiCategory: Record<PointOfInterestType, PortraitCategory> = {
  'Deep-space station': 'deep-space-station',
  'Asteroid base': 'asteroid-base',
  'Remote moon base': 'remote-moon-base',
  'Ancient orbital ruin': 'ancient-orbital-ruin',
  'Research base': 'research-base',
  'Asteroid belt': 'asteroid-belt-poi',
  'Comet base': 'comet-base',
  'Comet belt': 'comet-belt-poi',
  'Gas Mine': 'gas-mine',
  'Refueling station': 'refueling-station',
};

const categoryImages = Object.fromEntries(
  portraitCategoryKeys.map((key) => [key, [] as PortraitImage[]]),
) as Record<PortraitCategory, PortraitImage[]>;
const categorySourceIds = Object.fromEntries(
  portraitCategoryKeys.map((key) => [key, new Set<string>()]),
) as Record<PortraitCategory, Set<string>>;
const portraitById = new Map<string, ResolvedPortrait>();

function assertTuning(value: unknown, path: string): asserts value is Tuning {
  if (!value || typeof value !== 'object') throw new Error(`Invalid portrait tuning at ${path}`);
  const tuning = value as Partial<Tuning>;
  if (
    !Number.isInteger(tuning.h) ||
    tuning.h! < -180 ||
    tuning.h! > 180 ||
    !Number.isInteger(tuning.s) ||
    tuning.s! < 0 ||
    tuning.s! > 200 ||
    !Number.isInteger(tuning.v) ||
    tuning.v! < 50 ||
    tuning.v! > 150
  )
    throw new Error(`Invalid portrait HSV values at ${path}`);
}

function cssFilter(tuning: Tuning): string {
  return `hue-rotate(${tuning.h}deg) saturate(${tuning.s}%) brightness(${tuning.v}%)`;
}

for (const [sourcePath, rawTuning] of Object.entries(tunedSources as Record<string, TunedSource>)) {
  const match = /^swn_sector\/portraits\/sources\/([^/]+)\/(\d{2})\.png$/.exec(sourcePath);
  if (!match || !portraitCategoryKeys.includes(match[1] as PortraitCategory))
    throw new Error(`Portrait source path is outside the known category inventory: ${sourcePath}`);
  const category = match[1] as PortraitCategory;
  const sourceId = match[2]!;
  if (categorySourceIds[category].has(sourceId))
    throw new Error(`Duplicate portrait source ${category}/${sourceId}`);
  assertTuning(rawTuning.a, `${sourcePath}.a`);
  assertTuning(rawTuning.b, `${sourcePath}.b`);
  categorySourceIds[category].add(sourceId);

  const aFilter = cssFilter(rawTuning.a);
  const bFilter = cssFilter(rawTuning.b);
  const stem = `${category}-${sourceId}`;
  const variants: PortraitVariant[] = [
    { id: `${stem}-base`, css: {} },
    { id: `${stem}-flip`, css: { transform: 'scaleX(-1)' } },
    { id: `${stem}-a`, css: { filter: aFilter } },
    { id: `${stem}-a-flip`, css: { filter: aFilter, transform: 'scaleX(-1)' } },
    { id: `${stem}-b`, css: { filter: bFilter } },
    { id: `${stem}-b-flip`, css: { filter: bFilter, transform: 'scaleX(-1)' } },
  ];
  const image: PortraitImage = { sourcePath, variants };
  categoryImages[category].push(image);
  for (const variant of variants) {
    if (portraitById.has(variant.id))
      throw new Error(`Duplicate portrait variant ID ${variant.id}`);
    portraitById.set(variant.id, { sourcePath, css: variant.css, category });
  }
}

for (const category of portraitCategoryKeys) {
  const sourceIds = [...categorySourceIds[category]].sort();
  if (sourceIds.join(',') !== '01,02,03')
    throw new Error(
      `Portrait category ${category} must contain sources 01, 02, and 03; found ${sourceIds.join(', ') || 'none'}`,
    );
  categoryImages[category].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  if (categoryImages[category].flatMap((image) => image.variants).length !== PORTRAIT_VARIANT_COUNT)
    throw new Error(`Portrait category ${category} must have ${PORTRAIT_VARIANT_COUNT} variants.`);
}

export const portraitManifest = categoryImages;

export function portraitIdsFor(category: PortraitCategory): string[] {
  return categoryImages[category].flatMap((image) => image.variants.map((variant) => variant.id));
}

export function resolvePortrait(id: string): ResolvedPortrait | undefined {
  return portraitById.get(id);
}

export function portraitAt(
  category: PortraitCategory,
  index: number,
): (ResolvedPortrait & { variantId: string }) | undefined {
  if (!isPortraitIndex(index)) return undefined;
  const variantId = portraitIdsFor(category)[index];
  const portrait = variantId && resolvePortrait(variantId);
  return portrait ? { ...portrait, css: { ...portrait.css }, variantId } : undefined;
}

export function categoryForStar(type: StarType): PortraitCategory {
  return starCategory[type];
}

export function categoryForOtherObject(type: OtherCelestialObjectType): PortraitCategory {
  return objectCategory[type];
}

export function categoryForPoi(type: PointOfInterestType): PortraitCategory {
  return poiCategory[type];
}
