import { expect, it } from 'vitest';
import type { Planet, Sector } from '../BaseDTO/merged_schema';
import { checkAllInvariants } from '../Generator/generated_sector_invariants';
import { sectorJsonForSeed } from './sector_json_api';

it('exports a complete default sector as deterministic JSON for a seed', () => {
  const seed = 'sector-json-api-test';
  const json = sectorJsonForSeed(seed);
  const sector = JSON.parse(json) as Sector;

  expect(sector.SchemaVersion).toBe('merged-v9');
  expect(sector.OriginalSeed).toBe(seed);
  expect(sector.StartingWorldMode).toBe('UNRESTRICTED');
  expect(sector.Systems.length).toBeGreaterThanOrEqual(21);
  expect(sector.Systems.length).toBeLessThanOrEqual(30);
  expect(
    sector.Systems.every(
      (system) => system.HexLocation.Column <= 11 && system.HexLocation.Row <= 7,
    ),
  ).toBe(true);
  const inhabitedWorlds = sector.Systems.flatMap((system) => system.Objects).filter(
    (object): object is Planet => object.Kind === 'Planet' && object.InhabitedInfo !== false,
  );
  expect(inhabitedWorlds.length).toBeGreaterThan(0);
  expect(inhabitedWorlds.every((world) => world.Culture)).toBe(true);
  expect(checkAllInvariants(sector)).toEqual([]);
  expect(sectorJsonForSeed(seed)).toBe(json);
});
