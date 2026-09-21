import { describe, expect, it } from 'vitest';
import { generate } from '../generate';
import { createInitialSectors, findContainingSystem, findObject, getAllSelectableIds, validateSector } from './data';
import { VisibilityLevel } from '../merged_schema';
import { updateObjectVisibility } from './domain/sector/operations';

describe('canonical sector data', () => {
  it('creates deterministic generator-backed initial sectors', () => {
    const first = createInitialSectors();
    expect(first).toEqual(createInitialSectors());
    for (const sector of first) {
      expect(sector.SchemaVersion).toBe('merged-v1');
      expect(sector.Systems.length).toBeGreaterThanOrEqual(20);
      expect(sector.Systems.length).toBeLessThanOrEqual(30);
      expect(new Set(getAllSelectableIds(sector)).size).toBe(getAllSelectableIds(sector).length);
      expect(sector.RoutePortals.length).toBeGreaterThan(0);
      expect(validateSector(sector)).toEqual([]);
    }
  });

  it('preserves richer generator fields', () => {
    const sector = generate('UI-CANONICAL-DATA');
    const object = sector.Systems.flatMap((system) => system.Objects)[0];
    expect(object).toHaveProperty('Temperature');
    expect(object).toHaveProperty('Orbit');
    expect(sector.Systems.some((system) => system.PointsOfInterest.length > 0)).toBe(true);
  });

  it('supports canonical lookup and visibility updates', () => {
    const sector = generate('UI-LOOKUP-DATA');
    const system = sector.Systems[0];
    const object = system.Objects[0];
    expect(findObject(sector, object.Id)?.object).toBe(object);
    expect(findContainingSystem(sector, object.Id)).toBe(system);
    const result = updateObjectVisibility(sector, object.Id, VisibilityLevel.CULTURE_FULL);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(findObject(result.value, object.Id)?.object.VisibilityLevel).toBe(VisibilityLevel.CULTURE_FULL);
    expect(validateSector(result.value)).toEqual([]);
  });
});
