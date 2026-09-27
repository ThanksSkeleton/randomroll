// @vitest-environment jsdom

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import mergedTuning from '../../../swn_sector/portraits/portrait_variants.json';
import { generate } from './generate';
import { checkAllInvariants } from './invariants';
import { portraitCategoryKeys, portraitManifest, resolvePortrait } from './portrait_assets';
import { DetailBar } from './ui/features/object-inspector/DetailBar';

const sector = generate('PORTRAIT-CHECK');
const system = sector.Systems.find((candidate) => candidate.Star.PortraitAssetId)!;
const planet = sector.Systems.flatMap((candidate) => candidate.Objects).find(
  (object) => object.Kind === 'Planet' && object.InhabitedInfo === false,
);
if (!planet || planet.Kind !== 'Planet' || !planet.PortraitAssetId)
  throw new Error('Expected an assigned uninhabited planet');
const route = sector.Routes[0]!;

function allPortraitBearingEntities() {
  return [
    ...sector.Systems.flatMap((item) => [
      item.Star,
      ...item.Objects.filter(
        (object) => object.Kind === 'OtherCelestialObject' || object.InhabitedInfo === false,
      ),
      ...item.PointsOfInterest,
    ]),
    ...sector.Routes,
  ];
}

describe('sector portrait assets', () => {
  it('has tuning data for every portrait source', () => {
    const sourcePaths = Object.values(portraitManifest).flatMap((images) =>
      images.map((image) => image.sourcePath),
    );
    expect(Object.keys(mergedTuning).sort()).toEqual(sourcePaths.sort());
    for (const tuning of Object.values(mergedTuning)) {
      expect(tuning.a).toBeDefined();
      expect(tuning.b).toBeDefined();
    }
  });

  it('contains a complete 18-variant bank for every category and existing source file', () => {
    expect(Object.keys(portraitManifest).sort()).toEqual([...portraitCategoryKeys].sort());
    for (const category of portraitCategoryKeys) {
      expect(portraitManifest[category]).toHaveLength(3);
      for (const image of portraitManifest[category]) {
        expect(image.variants).toHaveLength(6);
        const assetPath = resolve(process.cwd(), 'public', image.sourcePath);
        if (!existsSync(assetPath))
          throw new Error(`Portrait source asset missing: ${image.sourcePath}`);
        const pngHeader = readFileSync(assetPath).subarray(0, 24);
        expect([pngHeader.readUInt32BE(16), pngHeader.readUInt32BE(20)]).toEqual([1500, 850]);
      }
    }
  });

  it('assigns every required generated entity a stable, resolvable portrait reference', () => {
    for (const entity of allPortraitBearingEntities()) {
      expect(entity.PortraitAssetId).toBeTruthy();
      expect(resolvePortrait(entity.PortraitAssetId!)).toBeDefined();
    }
    expect(checkAllInvariants(sector)).toEqual([]);
    expect(sector.PlayerShip.PortraitAssetId).toBeUndefined();
    expect(
      sector.Systems.flatMap((item) => item.Objects)
        .filter((object) => object.Kind === 'Planet' && object.InhabitedInfo !== false)
        .every((object) => object.PortraitAssetId === undefined),
    ).toBe(true);

    const restored = JSON.parse(JSON.stringify(sector));
    expect(
      restored.Systems.find((item: typeof system) => item.Id === system.Id).Star.PortraitAssetId,
    ).toBe(system.Star.PortraitAssetId);
    expect(restored.Routes.find((item: typeof route) => item.Id === route.Id).PortraitAssetId).toBe(
      route.PortraitAssetId,
    );
    expect(generate('PORTRAIT-CHECK').Routes[0]?.PortraitAssetId).toBe(route.PortraitAssetId);
  });

  it('reports portrait IDs that do not resolve in the merged manifest', () => {
    const invalidSector = JSON.parse(JSON.stringify(sector));
    invalidSector.Systems[0].Star.PortraitAssetId = 'missing-portrait-variant';
    expect(
      checkAllInvariants(invalidSector).some(
        (violation) =>
          violation.RuleId === 'PORTRAIT' && violation.Message.includes('missing-portrait-variant'),
      ),
    ).toBe(true);
  });

  it('uses a source image with CSS variants in the inspector', () => {
    const portrait = resolvePortrait(planet.PortraitAssetId!)!;
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
    expect(container.querySelector('.object-art-glyph')).toBeNull();
  });

  it('shows the selected system’s star portrait', () => {
    const { container } = render(
      <DetailBar
        sector={sector}
        selectedId={system.Id}
        preview="gm"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    const image = container.querySelector('.object-art img') as HTMLImageElement;
    expect(image.getAttribute('src')).toContain(
      resolvePortrait(system.Star.PortraitAssetId!)!.sourcePath,
    );
    expect(image.alt).toContain(`${system.Star.StarType} star`);
  });

  it('replaces the image element when the selected portrait changes', () => {
    const { container, rerender } = render(
      <DetailBar
        sector={sector}
        selectedId={planet.Id}
        preview="gm"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    const firstImage = container.querySelector('.object-art img');
    rerender(
      <DetailBar
        sector={sector}
        selectedId={route.Id}
        preview="gm"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    const nextImage = container.querySelector('.object-art img');
    expect(nextImage).not.toBe(firstImage);
    expect(nextImage?.getAttribute('src')).toContain(
      resolvePortrait(route.PortraitAssetId!)!.sourcePath,
    );
  });

  it('shows centered NO DATA for the ship and visible inhabited worlds', () => {
    const inhabitedPlanet = sector.Systems.flatMap((item) => item.Objects).find(
      (object) => object.Kind === 'Planet' && object.InhabitedInfo !== false,
    );
    if (!inhabitedPlanet) throw new Error('Expected an inhabited planet in the test sector');
    const { container, rerender } = render(
      <DetailBar
        sector={sector}
        selectedId={sector.PlayerShip.Id}
        preview="gm"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    expect(container.querySelector('.portrait-no-data')?.textContent).toBe('NO DATA');
    expect(container.querySelector('.object-art-glyph')).toBeNull();
    rerender(
      <DetailBar
        sector={sector}
        selectedId={inhabitedPlanet.Id}
        preview="gm"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    expect(container.querySelector('.portrait-no-data')?.textContent).toBe('NO DATA');
  });

  it('shows a route portrait when inspecting either its route or portal at basic visibility', () => {
    const routePortal = sector.RoutePortals.find((portal) => portal.RouteId === route.Id)!;
    const visibleSector = {
      ...sector,
      Routes: sector.Routes.map((item) =>
        item.Id === route.Id ? { ...item, Visibility: { ...item.Visibility, BasicScan: true } } : item,
      ),
      RoutePortals: sector.RoutePortals.map((item) =>
        item.Id === routePortal.Id ? { ...item, Visibility: { ...item.Visibility, BasicScan: true } } : item,
      ),
    };
    const { container, rerender } = render(
      <DetailBar
        sector={visibleSector}
        selectedId={route.Id}
        preview="player"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    expect(container.querySelector('.object-art img')?.getAttribute('alt')).toMatch(
      /Portrait of Route 1, route/i,
    );
    rerender(
      <DetailBar
        sector={visibleSector}
        selectedId={routePortal.Id}
        preview="player"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    expect(container.querySelector('.object-art img')?.getAttribute('alt')).toMatch(
      /Portrait of Portal/i,
    );
  });

  it('does not show a portrait before basic visibility', () => {
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
