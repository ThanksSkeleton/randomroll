// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { generate } from '../Generator/generate';
import type { Planet, Sector, StarSystem } from '../BaseDTO/merged_schema';
import { objectEntries, routeSystems, findObject, objectDetails } from '../Shared/sector_selectors';
import { hasAnyScan } from '../Shared/scan_visibility';
import { hpoiVisible } from '../Projector/culture_projection';
import { isVisibleToPlayerDisplay } from './visibility_presentation';
import { DetailBar } from './features/object-inspector/DetailBar';
import { projectSector } from '../Projector/sector_projection';
import { HexMap } from './features/sector-map/HexMap';
import { SymbolicSystem } from './features/system-viewer/SymbolicSystem';

afterEach(cleanup);

function isVisibleToPlayer(sector: Sector, id: string): boolean {
  const found = findObject(sector, id);
  if (found?.kind === 'HabitablePointOfInterest')
    return hpoiVisible(sector, found.object, 'player');
  const visibility = objectDetails(sector, id)?.Visibility;
  return visibility ? hasAnyScan(visibility) : false;
}

function Inspector({
  sector,
  selectedId,
  preview,
}: {
  sector: Sector;
  selectedId: string;
  preview: 'gm' | 'player';
}) {
  const result = projectSector(sector, { preview, assetBaseUrl: '/' });
  if (!result.ok) throw new Error(`Projection failed at ${result.path}`);
  return <DetailBar display={result.value} selectedId={selectedId} preview={preview} />;
}

function ProjectedHexMap({
  sector,
  selected,
  select,
  preview,
  showPolityOverlay,
}: {
  sector: Sector;
  selected: string | null;
  select: (id: string | null) => void;
  preview: 'gm' | 'player';
  showPolityOverlay?: boolean;
}) {
  const result = projectSector(sector, { preview, assetBaseUrl: '/' });
  if (!result.ok) throw new Error(`Projection failed at ${result.path}`);
  return (
    <HexMap
      display={result.value}
      selected={selected}
      select={select}
      preview={preview}
      showPolityOverlay={showPolityOverlay}
    />
  );
}

function ProjectedSymbolicSystem({
  sector,
  system,
  preview,
}: {
  sector: Sector;
  system: StarSystem;
  selected: null;
  select: () => void;
  selectRoute: () => void;
  preview: 'gm' | 'player';
  defaultOpen: false;
}) {
  const result = projectSector(sector, { preview, assetBaseUrl: '/' });
  if (!result.ok) throw new Error(`Projection failed at ${result.path}`);
  return (
    <SymbolicSystem
      systemId={system.Id}
      display={result.value}
      selected={null}
      select={() => {}}
      selectRoute={() => {}}
      preview={preview}
      defaultOpen={false}
    />
  );
}

const renderDetail = (sector: Sector, selectedId: string) =>
  render(<Inspector sector={sector} selectedId={selectedId} preview="player" />);

function visiblePlanet(sector: Sector): Planet {
  const planet = sector.Systems.flatMap((system) => system.Objects).find(
    (object): object is Planet =>
      object.Kind === 'Planet' && object.InhabitedInfo !== false && !object.Orbit.ParentObjectId,
  );
  if (!planet) throw new Error('Expected a direct-orbit inhabited planet');
  planet.ProceduralName = 'PROCEDURAL WORLD';
  planet.NiceName = 'NICE WORLD';
  planet.Visibility = {
    BasicScan: true,
    DetailedScan: true,
    PoliticsScan: false,
    DeepPoliticsScan: false,
  };
  return planet;
}

describe('scan visibility presentation', () => {
  it('keeps projected player-preview visibility aligned with the existing presentation rule', () => {
    const sector = generate({ seed: 'VISIBILITY-PROJECTION-PARITY' });
    const result = projectSector(sector, { preview: 'player', assetBaseUrl: '/' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const { object } of objectEntries(sector))
      expect(isVisibleToPlayerDisplay(result.value, object.Id)).toBe(
        isVisibleToPlayer(sector, object.Id),
      );
  });
  it('uses Politics Scan for nice names and retains the procedural secondary name', () => {
    const sector = generate({ seed: 'VISIBILITY-NAMES' });
    const planet = visiblePlanet(sector);
    const view = renderDetail(sector, planet.Id);

    expect(view.container.querySelector('.object-name')?.getAttribute('aria-label')).toBe(
      'PROCEDURAL WORLD',
    );
    expect(view.container.querySelector('.object-procedural-name')).toBeNull();

    planet.Visibility.PoliticsScan = true;
    view.rerender(<Inspector sector={sector} selectedId={planet.Id} preview="player" />);

    expect(view.container.querySelector('.object-name')?.getAttribute('aria-label')).toBe(
      'NICE WORLD',
    );
    expect(view.container.querySelector('.object-procedural-name')?.textContent).toContain(
      'PROCEDURAL WORLD',
    );
  });

  it("uses the route's Politics Scan for endpoint names", () => {
    const sector = generate({ seed: 'VISIBILITY-ROUTE' });
    const route = sector.Routes[0]!;
    const endpoints = routeSystems(sector, route)!;
    endpoints.forEach((system, index) => {
      system.ProceduralName = `PROC ${index + 1}`;
      system.NiceName = `NICE ${index + 1}`;
    });
    route.Visibility = {
      BasicScan: true,
      DetailedScan: false,
      PoliticsScan: false,
      DeepPoliticsScan: false,
    };
    const view = renderDetail(sector, route.Id);
    expect(view.container.querySelector('.scan-basicscan')?.textContent).toContain(
      'PROC 1 <=> PROC 2',
    );

    route.Visibility.PoliticsScan = true;
    view.rerender(<Inspector sector={sector} selectedId={route.Id} preview="player" />);
    expect(view.container.querySelector('.scan-basicscan')?.textContent).toContain(
      'NICE 1 <=> NICE 2',
    );
  });

  it('gates symbolic population by Detailed and technology by Politics', () => {
    const sector = generate({ seed: 'VISIBILITY-RATINGS' });
    const planet = visiblePlanet(sector);
    const system = sector.Systems.find((candidate) => candidate.Objects.includes(planet))!;
    const view = render(
      <ProjectedSymbolicSystem
        system={system}
        sector={sector}
        selected={null}
        select={() => {}}
        selectRoute={() => {}}
        preview="player"
        defaultOpen={false}
      />,
    );

    expect(view.container.querySelector('.summary-rating-population')).not.toBeNull();
    expect(view.container.querySelector('.summary-rating-technology')).toBeNull();

    planet.Visibility.PoliticsScan = true;
    view.rerender(
      <ProjectedSymbolicSystem
        system={system}
        sector={sector}
        selected={null}
        select={() => {}}
        selectRoute={() => {}}
        preview="player"
        defaultOpen={false}
      />,
    );
    expect(view.container.querySelector('.summary-rating-technology')).not.toBeNull();
  });

  it('uses Politics Scan for system names on the sector map', () => {
    const sector = generate({ seed: 'VISIBILITY-MAP-NAMES' });
    const system = sector.Systems[0]!;
    system.ProceduralName = 'PROC SYSTEM';
    system.NiceName = 'NICE SYSTEM';
    system.Visibility = {
      BasicScan: true,
      DetailedScan: true,
      PoliticsScan: false,
      DeepPoliticsScan: false,
    };
    const view = render(
      <ProjectedHexMap sector={sector} selected={null} select={() => {}} preview="player" />,
    );
    expect(view.getByRole('button', { name: 'System PROC SYSTEM' })).toBeTruthy();

    system.Visibility.PoliticsScan = true;
    view.rerender(
      <ProjectedHexMap sector={sector} selected={null} select={() => {}} preview="player" />,
    );
    expect(view.getByRole('button', { name: 'System NICE SYSTEM' })).toBeTruthy();
  });

  it('tints a system hex with the sorted Politics 1 claimant union', () => {
    const sector = generate({ seed: 'VISIBILITY-MAP-POLITIES' });
    const system = sector.Systems[0]!;
    system.Visibility.BasicScan = true;
    system.Visibility.PoliticsScan = true;
    for (const object of system.Objects) object.ClaimedByPolityIds = [];
    const expected = sector.Polities.slice(0, 2).sort(
      (left, right) =>
        left.NiceName.localeCompare(right.NiceName) || left.Id.localeCompare(right.Id),
    );
    system.Objects[0]!.ClaimedByPolityIds = [expected[1]!.Id, expected[0]!.Id];

    const view = render(
      <ProjectedHexMap
        sector={sector}
        selected={null}
        select={() => {}}
        preview="player"
        showPolityOverlay
      />,
    );
    const tintedHex = view.container.querySelector(`[data-system-id="${system.Id}"]`);

    expect(tintedHex?.getAttribute('data-polities')).toBe(
      expected.map((polity) => polity.NiceName).join(', '),
    );
    expect(
      tintedHex?.querySelector<HTMLElement>('.hex-polity-tint')?.style.backgroundImage,
    ).toContain('repeating-linear-gradient');
    expect(tintedHex?.querySelector('.hex-polity-tint')?.tagName).toBe('DIV');

    system.Visibility.PoliticsScan = false;
    view.rerender(
      <ProjectedHexMap
        sector={sector}
        selected={null}
        select={() => {}}
        preview="player"
        showPolityOverlay
      />,
    );
    expect(
      view.container.querySelector(`[data-system-id="${system.Id}"]`)?.className,
    ).not.toContain('hex-polity-tinted');
  });
});
