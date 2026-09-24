// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createInitialSectors } from '../../data';
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
) {
  render(
    <TopDown
      system={system}
      sector={sector}
      selected={null}
      select={() => {}}
      preview="gm"
      showTemperatureOverlay={false}
    />,
  );
}

describe('TopDown', () => {
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
