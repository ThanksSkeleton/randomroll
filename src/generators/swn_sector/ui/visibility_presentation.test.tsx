// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { generate } from '../generate';
import type { Planet, Sector } from '../merged_schema';
import { routeSystems } from './domain/sector/selectors';
import { DetailBar } from './features/object-inspector/DetailBar';
import { HexMap } from './features/sector-map/HexMap';
import { SymbolicSystem } from './features/system-viewer/SymbolicSystem';

afterEach(cleanup);

const renderDetail = (sector: Sector, selectedId: string) =>
  render(
    <DetailBar
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
      <DetailBar
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
      <DetailBar
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
      <SymbolicSystem
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
      <SymbolicSystem
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
      <HexMap sector={sector} selected={null} select={() => {}} preview="player" />,
    );
    expect(view.getByRole('button', { name: 'System PROC SYSTEM' })).toBeTruthy();

    system.Visibility.PoliticsScan = true;
    view.rerender(<HexMap sector={sector} selected={null} select={() => {}} preview="player" />);
    expect(view.getByRole('button', { name: 'System NICE SYSTEM' })).toBeTruthy();
  });
});
