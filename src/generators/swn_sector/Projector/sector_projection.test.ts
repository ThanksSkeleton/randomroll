import { describe, expect, it } from 'vitest';
import { createInitialSectors } from '../Application/initialSectors';
import { PrototypeApplication } from '../Application/prototypeApplication';
import { projectSector } from './sector_projection';

const options = { preview: 'gm', assetBaseUrl: '/' } as const;

describe('shared sector projection', () => {
  it('assembles a stable, detached display graph in canonical order', () => {
    const sector = createInitialSectors()[0];
    const before = structuredClone(sector);
    const first = projectSector(sector, options);
    const second = projectSector(sector, options);
    expect(first).toEqual(second);
    expect(sector).toEqual(before);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(first.value.systems.map((system) => system.id)).toEqual(
      sector.Systems.map((system) => system.Id),
    );
    expect(first.value.routeIds).toEqual(sector.Routes.map((route) => route.Id));
    expect(first.value.playerShipSystemId).toBe(
      first.value.entities[sector.PlayerShip.CurrentLocationId].containingSystemId,
    );
    expect(first.value.culture.worlds.length).toBeGreaterThan(0);
    const system = sector.Systems[0];
    expect(first.value.entities[system.Id].systemSpatial).toEqual(first.value.systems[0].spatial);
    expect(first.value.entities[system.Objects[0].Id].spatial).toBeDefined();
    first.value.entities[system.Id].niceName = 'Changed display';
    first.value.entities[system.Id].visibility.BasicScan = false;
    expect(sector).toEqual(before);
  });

  it('reports broken references rather than presenting an incomplete graph', () => {
    const sector = createInitialSectors()[0];
    sector.PlayerShip.CurrentLocationId = 'missing-location';
    expect(projectSector(sector, options)).toEqual({
      ok: false,
      reason: 'invalid-reference',
      path: 'PlayerShip.CurrentLocationId',
    });
  });

  it('is exposed through the application read boundary', () => {
    const application = new PrototypeApplication(createInitialSectors());
    const first = application.readSector(0, options);
    expect(first.ok).toBe(true);
    expect(application.readSectors(options)).toHaveLength(2);
    expect(application.readSector(-1, options)).toEqual({ ok: false, reason: 'invalid-index' });
    if (!first.ok) return;
    first.value.name = 'Changed outside the application';
    const again = application.readSector(0, options);
    expect(again.ok && again.value.name).toBe('Sector sector-one-seed');
  });
});
