// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  locked: boolean;
  draft: null;
  setDraft: () => void;
}) {
  const result = projectSector(sector, { preview, assetBaseUrl: '/' });
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
  render(
    <Inspector
      sector={sector}
      selectedId={selectedId}
      preview="player"
      locked={true}
      draft={null}
      setDraft={() => {}}
    />,
  );

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
  it('shows atmosphere as a closed Basic Scan drawer with only gas percentages inside', () => {
    const sector = generate('VISIBILITY-ATMOSPHERE-DRAWER');
    const planet = visiblePlanet(sector);
    planet.Atmosphere = { Category: 'Breathable', SelectedGas: 'N2' };
    const view = renderDetail(sector, planet.Id);

    const basic = view.container.querySelector('.scan-basicscan');
    const simple = [...(basic?.querySelectorAll('.basic-scan-simple') ?? [])].map(
      (element) => element.textContent,
    );
    expect(simple).toHaveLength(2);
    expect(simple.every((line) => line && !line.includes('Atmosphere'))).toBe(true);

    const drawer = basic?.querySelector('.basic-scan-drawer') as HTMLDetailsElement;
    expect(drawer.open).toBe(false);
    expect(drawer.querySelector('summary')?.textContent).toBe('Type - Breathable');
    expect(
      [...drawer.querySelectorAll('.basic-scan-drawer-content > div')].map(
        (element) => element.textContent,
      ),
    ).toEqual(['N₂ 79%', 'O₂ 20%']);
    fireEvent.click(drawer.querySelector('summary')!);
    expect(drawer.open).toBe(true);
  });

  it('shows Vacuum as a simple Basic Scan line without a drawer', () => {
    const sector = generate('VISIBILITY-VACUUM-SIMPLE');
    const planet = visiblePlanet(sector);
    planet.Atmosphere = { Category: 'Vacuum' };
    const view = renderDetail(sector, planet.Id);
    const basic = view.container.querySelector('.scan-basicscan');

    expect(
      [...(basic?.querySelectorAll('.basic-scan-simple') ?? [])].map(
        (element) => element.textContent,
      ),
    ).toContain('Type - Vacuum');
    expect(basic?.querySelector('.basic-scan-drawer')).toBeNull();
  });

  it('keeps projected player-preview visibility aligned with the existing presentation rule', () => {
    const sector = generate('VISIBILITY-PROJECTION-PARITY');
    const result = projectSector(sector, { preview: 'player', assetBaseUrl: '/' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const { object } of objectEntries(sector))
      expect(isVisibleToPlayerDisplay(result.value, object.Id)).toBe(
        isVisibleToPlayer(sector, object.Id),
      );
  });
  it('lists the union of object claimants in system Politics 1 with their flags', () => {
    const sector = generate('VISIBILITY-SYSTEM-POLITICS');
    const system = sector.Systems[0]!;
    system.Visibility = {
      BasicScan: true,
      DetailedScan: false,
      PoliticsScan: true,
      DeepPoliticsScan: false,
    };
    for (const object of system.Objects) object.ClaimedByPolityIds = [];
    system.Objects[0]!.ClaimedByPolityIds = [sector.Polities[0]!.Id];
    system.Objects[1]!.ClaimedByPolityIds = [sector.Polities[1]!.Id, sector.Polities[0]!.Id];
    const claimIds = [
      ...new Set(system.Objects.flatMap((object) => object.ClaimedByPolityIds)),
    ].sort((left, right) => {
      const leftName = sector.Polities.find((polity) => polity.Id === left)!.NiceName;
      const rightName = sector.Polities.find((polity) => polity.Id === right)!.NiceName;
      return leftName.localeCompare(rightName) || left.localeCompare(right);
    });
    const names = claimIds.map(
      (id) => sector.Polities.find((polity) => polity.Id === id)!.NiceName,
    );

    const view = renderDetail(sector, system.Id);

    expect(
      view.container.querySelector('.scan-politicsscan .detail-stock-content')?.textContent,
    ).toBe(`ClaimedBy: ${names.join(', ')}`);
    for (const name of names)
      expect(screen.getByRole('img', { name: `${name} polity flag` })).toBeTruthy();
  });

  it('uses Politics Scan for nice names and retains the procedural secondary name', () => {
    const sector = generate('VISIBILITY-NAMES');
    const planet = visiblePlanet(sector);
    const view = renderDetail(sector, planet.Id);

    expect(view.container.querySelector('.object-name')?.getAttribute('aria-label')).toBe(
      'PROCEDURAL WORLD',
    );
    expect(view.container.querySelector('.object-procedural-name')).toBeNull();

    planet.Visibility.PoliticsScan = true;
    view.rerender(
      <Inspector
        sector={sector}
        selectedId={planet.Id}
        preview="player"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );

    expect(view.container.querySelector('.object-name')?.getAttribute('aria-label')).toBe(
      'NICE WORLD',
    );
    expect(view.container.querySelector('.object-procedural-name')?.textContent).toContain(
      'PROCEDURAL WORLD',
    );
  });

  it('places planet facts in Detailed and Politics stock while Deep stock is empty', () => {
    const sector = generate('VISIBILITY-STOCK');
    const planet = visiblePlanet(sector);
    planet.Visibility.PoliticsScan = true;
    planet.Visibility.DeepPoliticsScan = true;
    const view = renderDetail(sector, planet.Id);

    const detailed = view.container.querySelector('.scan-detailedscan .detail-stock-content');
    const politics = view.container.querySelector('.scan-politicsscan .detail-stock-content');
    const deep = view.container.querySelector('.scan-deeppoliticsscan .detail-stock-content');
    expect(detailed?.textContent).toContain('Life, Native:');
    expect(detailed?.textContent).toContain('Life, Terran:');
    expect(detailed?.textContent).toContain('Population:');
    expect(detailed?.textContent).not.toContain('Tech Level:');
    expect(politics?.textContent).toContain('Tech Level:');
    expect(deep?.textContent).toBe('-');
  });

  it('places signal counts in Detailed stock and uses a dash for empty Deep stock', () => {
    const sector = generate('VISIBILITY-SIGNALS');
    const object = sector.Systems.flatMap((system) => system.Objects).find(
      (candidate) =>
        candidate.Kind === 'OtherCelestialObject' ||
        (candidate.Kind === 'Planet' && candidate.InhabitedInfo === false),
    );
    if (!object) throw new Error('Expected an uninhabited planet or other celestial object');
    object.Visibility = {
      BasicScan: true,
      DetailedScan: true,
      PoliticsScan: true,
      DeepPoliticsScan: true,
    };
    const view = renderDetail(sector, object.Id);

    expect(
      view.container.querySelector('.scan-detailedscan .detail-stock-content')?.textContent,
    ).toMatch(/^Signals Detected: \d+$/);
    expect(
      view.container.querySelector('.scan-deeppoliticsscan .detail-stock-content')?.textContent,
    ).toBe('-');
    const names = object.ClaimedByPolityIds.map(
      (id) => sector.Polities.find((polity) => polity.Id === id)!.NiceName,
    );
    expect(
      view.container.querySelector('.scan-politicsscan .detail-stock-content')?.textContent,
    ).toBe(`ClaimedBy: ${names.length === 0 ? 'None' : names.join(', ')}`);

    object.ClaimedByPolityIds = sector.Polities.slice(0, 2).map((polity) => polity.Id);
    view.rerender(
      <Inspector
        sector={sector}
        selectedId={object.Id}
        preview="player"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    expect(
      view.container.querySelector('.scan-politicsscan .detail-stock-content')?.textContent,
    ).toBe(`ClaimedBy: ${sector.Polities[0]!.NiceName}, ${sector.Polities[1]!.NiceName}`);

    object.ClaimedByPolityIds = [];
    view.rerender(
      <Inspector
        sector={sector}
        selectedId={object.Id}
        preview="player"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    expect(
      view.container.querySelector('.scan-politicsscan .detail-stock-content')?.textContent,
    ).toBe('ClaimedBy: None');
  });

  it("uses the route's Politics Scan for endpoint names", () => {
    const sector = generate('VISIBILITY-ROUTE');
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
    view.rerender(
      <Inspector
        sector={sector}
        selectedId={route.Id}
        preview="player"
        locked={true}
        draft={null}
        setDraft={() => {}}
      />,
    );
    expect(view.container.querySelector('.scan-basicscan')?.textContent).toContain(
      'NICE 1 <=> NICE 2',
    );
  });

  it('gates symbolic population by Detailed and technology by Politics', () => {
    const sector = generate('VISIBILITY-RATINGS');
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
    const sector = generate('VISIBILITY-MAP-NAMES');
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
    const sector = generate('VISIBILITY-MAP-POLITIES');
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
