// @vitest-environment jsdom

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import mergedTuning from '../Data/Projection/portrait_variants.json';
import { generate } from './generate';
import { assignPortraitIndex } from './portrait_selection';
import { choose, randomFor } from './generation_random';
import { projectPortrait } from '../Projector/portrait_projection';
import { checkAllInvariants } from './generated_sector_invariants';
import {
  portraitCategoryKeys,
  portraitManifest,
  portraitAt,
  portraitIdsFor,
} from '../Data/Projection/portrait_assets';
import { DetailBar } from '../UI/features/object-inspector/DetailBar';
import { projectSector } from '../Projector/sector_projection';
import type { Sector } from '../BaseDTO/merged_schema';

function Inspector({
  sector: source,
  selectedId,
  preview,
}: {
  sector: Sector;
  selectedId: string;
  preview: 'gm' | 'player';
  locked: boolean;
  draft: null;
  setDraft: () => void;
}) {
  const result = projectSector(source, { preview, assetBaseUrl: '/' });
  if (!result.ok) throw new Error(`Projection failed at ${result.path}`);
  return (
    <DetailBar
      display={result.value}
      selectedId={selectedId}
      preview={preview}
      locked={true}
      draft={null}
      setDraft={() => {}}
    />
  );
}

const sector = generate('PORTRAIT-CHECK');
const system = sector.Systems.find((candidate) => candidate.Star.PortraitIndex !== undefined)!;
const planet = sector.Systems.flatMap((candidate) => candidate.Objects).find(
  (object) => object.Kind === 'Planet' && object.InhabitedInfo === false,
);
if (!planet || planet.Kind !== 'Planet' || planet.PortraitIndex === undefined)
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
      expect(Number.isInteger(entity.PortraitIndex)).toBe(true);
      expect(entity.PortraitIndex).toBeGreaterThanOrEqual(0);
      expect(entity.PortraitIndex).toBeLessThan(18);
      expect(projectPortrait(sector, entity.Id, 'gm', '/')).toBeDefined();
    }
    expect(checkAllInvariants(sector)).toEqual([]);
    expect(sector.PlayerShip.PortraitIndex).toBeUndefined();
    expect(
      sector.Systems.flatMap((item) => item.Objects)
        .filter((object) => object.Kind === 'Planet' && object.InhabitedInfo !== false)
        .every((object) => object.PortraitIndex === undefined),
    ).toBe(true);

    const restored = JSON.parse(JSON.stringify(sector));
    expect(
      restored.Systems.find((item: typeof system) => item.Id === system.Id).Star.PortraitIndex,
    ).toBe(system.Star.PortraitIndex);
    expect(restored.Routes.find((item: typeof route) => item.Id === route.Id).PortraitIndex).toBe(
      route.PortraitIndex,
    );
    expect(generate('PORTRAIT-CHECK').Routes[0]?.PortraitIndex).toBe(route.PortraitIndex);
  });

  it.each([-1, 18, 1.5])('rejects invalid portrait index %s', (index) => {
    const invalidSector = JSON.parse(JSON.stringify(sector));
    invalidSector.Systems[0].Star.PortraitIndex = index;
    expect(
      checkAllInvariants(invalidSector).some((violation) => violation.RuleId === 'PORTRAIT'),
    ).toBe(true);
    expect(
      projectPortrait(invalidSector, invalidSector.Systems[0].Star.Id, 'gm', '/'),
    ).toBeUndefined();
  });

  it('preserves the old seeded variant selection as an index', () => {
    for (const category of portraitCategoryKeys) {
      const seed = 'PORTRAIT-CHECK';
      const id = 'stable-entity';
      const oldChoice = choose(randomFor(seed, `${id}:portrait`), portraitIdsFor(category));
      expect(portraitAt(category, assignPortraitIndex(seed, id))?.variantId).toBe(oldChoice);
    }
  });

  it('projects index zero without changing canonical state', () => {
    const selected = structuredClone(sector);
    const selectedPlanet = selected.Systems.flatMap((item) => item.Objects).find(
      (object) => object.Id === planet.Id,
    )!;
    selectedPlanet.PortraitIndex = 0;
    const before = structuredClone(selected);
    const first = projectPortrait(selected, planet.Id, 'gm', '/assets/');
    expect(first?.portraitIndex).toBe(0);
    expect(first?.url).toMatch(/^\/assets\/swn_sector\/portraits\/sources\//);
    expect(projectPortrait(selected, planet.Id, 'gm', '/assets/')).toEqual(first);
    expect(selected).toEqual(before);
    const { container } = render(
      <Inspector
        sector={selected}
        selectedId={planet.Id}
        preview="gm"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    expect(container.querySelector('.object-art img')).not.toBeNull();
  });

  it('uses a source image with CSS variants in the inspector', () => {
    const portrait = projectPortrait(sector, planet.Id, 'gm', '/')!;
    const { container } = render(
      <Inspector
        sector={sector}
        selectedId={planet.Id}
        preview="gm"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    const image = container.querySelector('.object-art img') as HTMLImageElement;
    expect(image.alt).toContain(`Portrait of ${planet.NiceName}`);
    expect(image.getAttribute('src')).toContain(portrait.url);
    expect(image.style.filter).toBe(portrait.style.filter ?? '');
    expect(image.style.transform).toBe(portrait.style.transform ?? '');
    expect(container.querySelector('.object-art')).toBeTruthy();
    expect(container.querySelector('.object-art-glyph')).toBeNull();
  });

  it('shows the selected system’s star portrait', () => {
    const { container } = render(
      <Inspector
        sector={sector}
        selectedId={system.Id}
        preview="gm"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    const image = container.querySelector('.object-art img') as HTMLImageElement;
    expect(image.getAttribute('src')).toContain(projectPortrait(sector, system.Id, 'gm', '/')!.url);
    expect(image.alt).toContain(`${system.Star.StarType} star`);
  });

  it('replaces the image element when the selected portrait changes', () => {
    const { container, rerender } = render(
      <Inspector
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
      <Inspector
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
      projectPortrait(sector, route.Id, 'gm', '/')!.url,
    );
  });

  it('shows centered NO DATA for the ship and visible inhabited worlds', () => {
    const inhabitedPlanet = sector.Systems.flatMap((item) => item.Objects).find(
      (object) => object.Kind === 'Planet' && object.InhabitedInfo !== false,
    );
    if (!inhabitedPlanet) throw new Error('Expected an inhabited planet in the test sector');
    const { container, rerender } = render(
      <Inspector
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
      <Inspector
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
    const routePortal = sector.RoutePortals.find((portal) => route.PortalIds.includes(portal.Id))!;
    const visibleSector = {
      ...sector,
      Routes: sector.Routes.map((item) =>
        item.Id === route.Id
          ? { ...item, Visibility: { ...item.Visibility, BasicScan: true } }
          : item,
      ),
      RoutePortals: sector.RoutePortals.map((item) =>
        item.Id === routePortal.Id
          ? { ...item, Visibility: { ...item.Visibility, BasicScan: true } }
          : item,
      ),
    };
    const { container, rerender } = render(
      <Inspector
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
      <Inspector
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
      <Inspector
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
