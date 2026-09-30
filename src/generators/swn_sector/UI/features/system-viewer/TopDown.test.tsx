// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createInitialSectors } from '../../../Application/initialSectors';
import { projectSector } from '../../../Projector/sector_projection';
import { TopDown } from './TopDown';

afterEach(() => cleanup());

beforeAll(() => {
  class TestResizeObserver {
    observe() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;
});

function renderTopDown() {
  const sector = createInitialSectors()[0];
  const system = sector.Systems[0];
  const planet = system.Objects.find(
    (object) => object.Kind === 'Planet' && object.Orbit.ParentObjectId === null,
  );
  if (!planet || planet.Kind !== 'Planet') throw new Error('expected a direct-orbit planet');

  return { sector, system, planet };
}

function renderSystem(
  system: ReturnType<typeof renderTopDown>['system'],
  sector: ReturnType<typeof renderTopDown>['sector'],
  showPolityOverlay = false,
  preview: 'gm' | 'player' = 'gm',
) {
  const result = projectSector(sector, { preview, assetBaseUrl: '/' });
  if (!result.ok) throw new Error(`invalid test sector: ${result.path}`);
  render(
    <TopDown
      systemId={system.Id}
      display={result.value}
      selected={null}
      select={() => {}}
      preview={preview}
      showTemperatureOverlay={false}
      showPolityOverlay={showPolityOverlay}
    />,
  );
}

describe('TopDown', () => {
  it('draws each object claim as a vertical stack of polity flags', () => {
    const { sector, system, planet } = renderTopDown();
    planet.ClaimedByPolityIds = sector.Polities.slice(0, 2).map((polity) => polity.Id);

    renderSystem(system, sector, true);

    const planetButton = screen.getByRole('button', { name: planet.NiceName });
    const object = planetButton.closest('.td-object');
    const flags = object?.querySelectorAll('.topdown-polity-flags .polity-flag');
    expect(flags).toHaveLength(2);
    expect(object?.querySelector('.topdown-polity-flags')).toBeTruthy();
  });

  it('does not reveal overlay claims before Politics 1 is visible to the player', () => {
    const { sector, system, planet } = renderTopDown();
    planet.Visibility = {
      BasicScan: true,
      DetailedScan: false,
      PoliticsScan: false,
      DeepPoliticsScan: false,
    };

    renderSystem(system, sector, true, 'player');

    const planetButton = screen.getByRole('button', { name: planet.ProceduralName });
    expect(planetButton.closest('.td-object')?.querySelector('.topdown-polity-flags')).toBeNull();
  });

  it('uses a planet NiceName when it is available', () => {
    const { sector, system, planet } = renderTopDown();
    planet.NiceName = 'Named Planet';
    planet.ProceduralName = 'Procedural Planet';

    renderSystem(system, sector);
    expect(screen.getAllByText(planet.NiceName).length).toBeGreaterThan(0);
  });

  it('falls back to a planet ProceduralName when NiceName is blank', () => {
    const { sector, system, planet } = renderTopDown();
    planet.NiceName = '   ';
    planet.ProceduralName = 'Procedural Planet';

    cleanup();
    renderSystem(system, sector);

    expect(screen.getAllByText('Procedural Planet').length).toBeGreaterThan(0);
  });
});
