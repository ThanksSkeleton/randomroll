import { describe, expect, it } from 'vitest';
import { generate } from '../Generator/generate';
import { createInitialSectors } from '../Application/initialSectors';
import {
  findContainingSystem,
  findObject,
  getAllSelectableIds,
  objectEntries,
  routePortals,
} from '../Shared/sector_selectors';
import { checkAllInvariants } from '../Generator/generated_sector_invariants';
import { updateObjectScanVisibility } from '../Application/sector_operations';

describe('canonical sector data', () => {
  it('creates deterministic generator-backed initial sectors', () => {
    const first = createInitialSectors();
    expect(first).toEqual(createInitialSectors());
    for (const sector of first) {
      expect(sector.SchemaVersion).toBe('merged-v9');
      expect(sector.Systems.length).toBeGreaterThanOrEqual(20);
      expect(sector.Systems.length).toBeLessThanOrEqual(30);
      expect(new Set(getAllSelectableIds(sector)).size).toBe(getAllSelectableIds(sector).length);
      expect(sector.RoutePortals.length).toBeGreaterThan(0);
      expect(checkAllInvariants(sector)).toEqual([]);
    }
  });

  it('preserves richer generator fields', () => {
    const sector = generate({ seed: 'UI-CANONICAL-DATA' });
    const object = sector.Systems.flatMap((system) => system.Objects)[0];
    expect(object).not.toHaveProperty('Temperature');
    expect(object).toHaveProperty('Orbit');
    expect(sector.Systems.some((system) => system.PointsOfInterest.length > 0)).toBe(true);
  });

  it('supports canonical lookup and visibility updates', () => {
    const sector = generate({ seed: 'UI-LOOKUP-DATA' });
    const system = sector.Systems[0];
    const object = system.Objects[0];
    expect(findObject(sector, object.Id)?.object).toBe(object);
    expect(findContainingSystem(sector, object.Id)).toBe(system);
    const result = updateObjectScanVisibility(sector, object.Id, 'BasicScan', true);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(findObject(result.value, object.Id)?.object.Visibility.BasicScan).toBe(true);
    expect(checkAllInvariants(result.value)).toEqual([]);
  });

  it('indexes systems, stars, objects, POIs, route portals, routes, and the ship', () => {
    const sector = generate({ seed: 'UI-SELECTABLE-GRAPH' });
    const entries = objectEntries(sector);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'System' }),
        expect.objectContaining({ kind: 'Star' }),
        expect.objectContaining({ kind: 'RoutePortal' }),
        expect.objectContaining({ kind: 'Route' }),
        expect.objectContaining({ kind: 'PlayerShip' }),
      ]),
    );
    for (const portal of sector.RoutePortals)
      expect(findContainingSystem(sector, portal.Id)?.Id).toBe(portal.SystemId);
    for (const route of sector.Routes) expect(routePortals(sector, route)).toBeDefined();
  });
});
