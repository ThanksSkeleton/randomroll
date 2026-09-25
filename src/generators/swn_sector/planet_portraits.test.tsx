// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { generate } from './generate';
import { checkAllInvariants } from './invariants';
import { planetPortraitManifests, resolvePlanetPortrait } from './planet_portraits';
import { BANK_SIZE, categories, manifestIssues } from './portrait_review/catalog';
import { DetailBar } from './ui/features/object-inspector/DetailBar';

const sector = generate('PORTRAIT-CHECK');
const planet = sector.Systems.flatMap((system) => system.Objects).find(
  (object) => object.Kind === 'Planet' && object.PortraitAssetId,
);
if (!planet || planet.Kind !== 'Planet' || !planet.PortraitAssetId)
  throw new Error('Expected an assigned uninhabited planet');
const portraitId = planet.PortraitAssetId;

describe('planet portrait consumption', () => {
  it('includes every mandatory variant in each of the three manifests', () => {
    for (const category of categories) {
      const manifest = planetPortraitManifests[category.key];
      expect(manifestIssues(category, manifest)).toEqual([]);
      expect(manifest.images.flatMap((image) => image.variants)).toHaveLength(BANK_SIZE);
    }
  });
  it('assigns a stable valid variant and preserves it through JSON', () => {
    expect(
      generate('PORTRAIT-CHECK')
        .Systems.flatMap((system) => system.Objects)
        .find((object) => object.Id === planet.Id && object.Kind === 'Planet'),
    ).toHaveProperty('PortraitAssetId', portraitId);
    expect(resolvePlanetPortrait(portraitId)).toBeDefined();
    expect(checkAllInvariants(sector)).toEqual([]);
    const restored = JSON.parse(JSON.stringify(sector));
    expect(
      restored.Systems.flatMap((system: (typeof sector.Systems)[number]) => system.Objects).find(
        (object: typeof planet) => object.Id === planet.Id,
      ).PortraitAssetId,
    ).toBe(portraitId);
  });

  it('uses the single base image with variant CSS at inspector size', () => {
    const portrait = resolvePlanetPortrait(portraitId)!;
    const { container } = render(
      <DetailBar
        sector={sector}
        selectedId={planet.Id}
        preview="gm"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    const image = screen.getByRole('img', {
      name: new RegExp('Portrait of ' + planet.NiceName),
    }) as HTMLImageElement;
    expect(image.getAttribute('src')).toContain(portrait.sourcePath);
    expect(image.style.filter).toBe(portrait.css.filter ?? '');
    expect(image.style.transform).toBe(portrait.css.transform ?? '');
    expect(container.querySelector('.object-art')).toBeTruthy();
  });

  it('does not show an undisclosed portrait in player preview', () => {
    const { container } = render(
      <DetailBar
        sector={sector}
        selectedId={planet.Id}
        preview="player"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    expect(container.querySelector('.object-art img')).toBeNull();
  });
});
