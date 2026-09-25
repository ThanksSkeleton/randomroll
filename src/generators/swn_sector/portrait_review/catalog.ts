import mercurian from './manifests/mercurian.json';
import europanIce from './manifests/europan-ice.json';
import europanWater from './manifests/europan-water.json';

export const SOURCE_WIDTH = 1500;
export const SOURCE_HEIGHT = 850;
export const PREVIEW_WIDTH = 300;
export const PREVIEW_HEIGHT = 170;
export const VARIANTS_PER_SOURCE = 6;
export const SOURCES_PER_CATEGORY = 3;
export const BANK_SIZE = SOURCES_PER_CATEGORY * VARIANTS_PER_SOURCE;

function pendingSources(): { images: { sourceId: string; tuningA: Tuning; tuningB: Tuning }[] } {
  return {
    images: ['01', '02', '03'].map((sourceId) => ({
      sourceId,
      tuningA: { h: 0, s: 100, v: 100 },
      tuningB: { h: 0, s: 100, v: 100 },
    })),
  };
}

export const categories = [
  { key: 'mercurian', label: 'Mercurian', initial: mercurian },
  { key: 'europan-ice', label: 'Europan / Plutonic · Ice', initial: europanIce },
  { key: 'europan-water', label: 'Europan / Plutonic · Water world', initial: europanWater },
  { key: 'lunar', label: 'Lunar', initial: pendingSources() },
  { key: 'ioan', label: 'Ioan', initial: pendingSources() },
  { key: 'titanian', label: 'Titanian', initial: pendingSources() },
  { key: 'martian', label: 'Martian', initial: pendingSources() },
  { key: 'venusian', label: 'Venusian', initial: pendingSources() },
  { key: 'jovian', label: 'Jovian', initial: pendingSources() },
  { key: 'neptunian', label: 'Neptunian', initial: pendingSources() },
  { key: 'star-a', label: 'A-type star', initial: pendingSources() },
  { key: 'star-f', label: 'F-type star', initial: pendingSources() },
  { key: 'star-g', label: 'G-type star', initial: pendingSources() },
  { key: 'star-k', label: 'K-type star', initial: pendingSources() },
  { key: 'star-m', label: 'M-type star', initial: pendingSources() },
  { key: 'star-giant', label: 'Giant star', initial: pendingSources() },
  { key: 'star-white-dwarf', label: 'White dwarf', initial: pendingSources() },
  { key: 'star-neutron-star', label: 'Neutron star', initial: pendingSources() },
  { key: 'star-black-hole', label: 'Stellar-mass black hole', initial: pendingSources() },
  { key: 'asteroid-belt', label: 'Asteroid belt', initial: pendingSources() },
  { key: 'kuiper-belt', label: 'Kuiper belt', initial: pendingSources() },
  { key: 'gas-cloud', label: 'Gas cloud', initial: pendingSources() },
] as const;

export type Category = (typeof categories)[number];
export type Tuning = { h: number; s: number; v: number };
export type Tunings = { a: Tuning; b: Tuning };
export type ReviewState = Record<string, Tunings>;
export type StyleBlock = { filter?: string; transform?: string };
export type Variant = { id: string; css: StyleBlock };
export type ManifestImage = {
  sourceId: string;
  sourcePath: string;
  tuningA: Tuning;
  tuningB: Tuning;
  variants: Variant[];
};
export type Manifest = {
  categoryKey: string;
  width: number;
  height: number;
  images: ManifestImage[];
};

export function sourcePath(category: Category, sourceId: string): string {
  return 'swn_sector/portraits/sources/' + category.key + '/' + sourceId + '.png';
}

export function sourceUrl(category: Category, sourceId: string): string {
  return import.meta.env.BASE_URL + sourcePath(category, sourceId);
}

export function defaultState(category: Category): ReviewState {
  return Object.fromEntries(
    category.initial.images.map((image) => [
      image.sourceId,
      { a: { ...image.tuningA }, b: { ...image.tuningB } },
    ]),
  );
}

export function styleFor(tuning: Tuning): string {
  return (
    'hue-rotate(' + tuning.h + 'deg) saturate(' + tuning.s + '%) brightness(' + tuning.v + '%)'
  );
}

export function variantsFor(category: Category, sourceId: string, tunings: Tunings): Variant[] {
  const stem = category.key + '-' + sourceId;
  const a = styleFor(tunings.a);
  const b = styleFor(tunings.b);
  return [
    { id: stem + '-base', css: {} },
    { id: stem + '-flip', css: { transform: 'scaleX(-1)' } },
    { id: stem + '-a', css: { filter: a } },
    { id: stem + '-a-flip', css: { filter: a, transform: 'scaleX(-1)' } },
    { id: stem + '-b', css: { filter: b } },
    { id: stem + '-b-flip', css: { filter: b, transform: 'scaleX(-1)' } },
  ];
}

export function buildManifest(category: Category, state: ReviewState): Manifest {
  return {
    categoryKey: category.key,
    width: SOURCE_WIDTH,
    height: SOURCE_HEIGHT,
    images: category.initial.images.map((image) => ({
      sourceId: image.sourceId,
      sourcePath: sourcePath(category, image.sourceId),
      tuningA: state[image.sourceId]!.a,
      tuningB: state[image.sourceId]!.b,
      variants: variantsFor(category, image.sourceId, state[image.sourceId]!),
    })),
  };
}

export function manifestIssues(category: Category, manifest: Manifest): string[] {
  const problems: string[] = [];
  if (!manifest || !Array.isArray(manifest.images)) return ['Missing images array'];
  if (manifest.images.some((image) => !image || !Array.isArray(image.variants)))
    return ['Missing variant list'];
  if (
    manifest.images.some(
      (image) =>
        !image.tuningA ||
        !image.tuningB ||
        [...Object.values(image.tuningA), ...Object.values(image.tuningB)].some(
          (value) => !Number.isFinite(value),
        ),
    )
  )
    return ['Missing or invalid HSV tuning'];
  if (manifest.categoryKey !== category.key) problems.push('Incorrect category key');
  if (manifest.width !== SOURCE_WIDTH || manifest.height !== SOURCE_HEIGHT)
    problems.push('Incorrect source dimensions');
  if (manifest.images.length !== SOURCES_PER_CATEGORY)
    problems.push('Expected exactly three base images');
  const sourceIds = manifest.images.map((image) => image.sourceId);
  if (new Set(sourceIds).size !== sourceIds.length) problems.push('Duplicate source IDs');
  const allIds = manifest.images.flatMap((image) => image.variants.map((variant) => variant.id));
  if (allIds.length !== BANK_SIZE) problems.push('Incorrect final bank count: ' + allIds.length);
  if (new Set(allIds).size !== allIds.length) problems.push('Duplicate variant IDs');
  for (const image of manifest.images) {
    if (image.sourcePath !== sourcePath(category, image.sourceId))
      problems.push('Incorrect source path for ' + image.sourceId);
    const expected = variantsFor(category, image.sourceId, {
      a: image.tuningA,
      b: image.tuningB,
    });
    if (JSON.stringify(image.variants) !== JSON.stringify(expected))
      problems.push('Missing or incorrect variants for ' + image.sourceId);
  }
  return problems;
}
