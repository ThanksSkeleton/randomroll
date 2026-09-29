import { expect, test } from 'vitest';
import { generate } from '../Generator/generate';
import { projectPlanet } from './planet_projection';
import { STAR_HABITABILITY } from '../Helpers/Domain/planet_interpretation';
import { STAR_TABLE } from '../Generator/generation_rules';
import { directOrbitAuBand } from '../Helpers/Domain/spatial_interpretation';

test('star interpretation agrees with the generation source', () => {
  for (const row of STAR_TABLE) expect(STAR_HABITABILITY[row.Value]).toBe(row.Hab);
});

test('projecting a planet is repeatable and leaves the sector unchanged', () => {
  const sector = generate('planet-projection');
  const original = structuredClone(sector);
  const planet = sector.Systems.flatMap((system) => system.Objects).find(
    (object) => object.Kind === 'Planet' && object.InhabitedInfo !== false,
  );
  if (!planet) throw new Error('Expected an inhabited planet');

  const first = projectPlanet(sector, planet.Id, { preview: 'gm' });
  expect(first).toEqual(projectPlanet(sector, planet.Id, { preview: 'gm' }));
  expect(sector).toEqual(original);
  expect(first?.habitabilityRating).toBeGreaterThanOrEqual(0);
  expect(first?.stock.detailed).toContain('Population:');
  expect(first?.stock.politics).toContain('Tech Level:');
});

test('generated sectors store only canonical planet and star facts', () => {
  const sector = generate('planet-projection-shape');
  expect(sector.SchemaVersion).toBe('merged-v7');
  for (const system of sector.Systems) {
    expect(system.Star).not.toHaveProperty('HabitabilityRating');
    for (const object of system.Objects) {
      if (object.Kind !== 'Planet') continue;
      expect(object).not.toHaveProperty('TidallyLocked');
      if (object.InhabitedInfo !== false)
        expect(object.InhabitedInfo).not.toHaveProperty('TotalHab');
      expect(projectPlanet(sector, object.Id, { preview: 'player' })).toBeDefined();
    }
  }
});

test('projects an uninhabited cold moon with the player-visible host name', () => {
  const sector = generate('planet-projection-moon');
  const system = sector.Systems.find((candidate) =>
    candidate.Objects.some(
      (object) => object.Kind === 'Planet' && object.Orbit.ParentObjectId === null,
    ),
  );
  const host = system?.Objects.find(
    (object) => object.Kind === 'Planet' && object.Orbit.ParentObjectId === null,
  );
  if (!system || !host || host.Kind !== 'Planet') throw new Error('Expected a planet host');
  host.ProceduralName = 'HOST PROCEDURAL';
  host.NiceName = 'HOST NICE';
  host.Visibility.PoliticsScan = false;
  if (host.Orbit.ParentObjectId !== null) throw new Error('Expected direct orbit');
  const polarBand = directOrbitAuBand(system.Star.StarType, 'Polar');
  host.Orbit.AU = (polarBand[0] + polarBand[1]) / 2;
  const moon = {
    ...host,
    Id: 'projection-moon',
    InhabitedInfo: false as const,
    Orbit: { AngleDegrees: host.Orbit.AngleDegrees, ParentObjectId: host.Id },
    BulkComposition: 'Water' as const,
  };
  system.Objects.push(moon);

  const player = projectPlanet(sector, moon.Id, { preview: 'player' });
  const gm = projectPlanet(sector, moon.Id, { preview: 'gm' });
  expect(player?.displayedComposition).toBe('Ice');
  expect(player?.stock.basic).toContain('Moon of HOST PROCEDURAL');
  expect(gm?.stock.basic).toContain('Moon of HOST NICE');
  expect(player?.stock.detailed).toBe('Signals Detected: 0');
  expect(player?.habitabilityRating).toBeNull();
});
