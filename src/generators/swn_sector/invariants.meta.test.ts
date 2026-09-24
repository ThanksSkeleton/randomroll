import { describe, expect, it } from 'vitest';
import { checkAllInvariants } from './invariants';
import type { OtherCelestialObject, Planet, Sector, SelectableEntity } from './merged_schema';

function entity(id: string): SelectableEntity {
  return {
    Id: id,
    ProceduralName: `proc-${id}`,
    NiceName: `nice-${id}`,
    VisibilityLevel: 'NONE',
    Intelligence: {
      InfoboxSummary: '',
      BasicScan: '',
      CulturePartial: '',
      CultureFull: '',
      GM: '',
    },
  };
}

function planet(id: string, parentObjectId: string | null, size: Planet['Size']): Planet {
  return {
    ...entity(id),
    Kind: 'Planet',
    Orbit: { AU: parentObjectId === null ? 1 : 1, AngleDegrees: 0, ParentObjectId: parentObjectId },
    Size: size,
    BulkComposition:
      size === 'Jupiter' ? 'Jovian Gas' : size === 'Neptune' ? 'Neptunian Gas' : 'Silicon',
    SurfaceWaterPresent: false,
    TidallyLocked: false,
    Atmosphere: 'Vacuum',
    Temperature: 'Cryogenic',
    NativeBiosphere: 'None',
    InhabitedInfo: false,
  };
}

function station(id: string, parentObjectId: string | null): OtherCelestialObject {
  return {
    ...entity(id),
    Kind: 'OtherCelestialObject',
    ObjectType: 'IndependentStation',
    Temperature: 'Temperate',
    Orbit: {
      AU: parentObjectId === null ? 1.4 : 1,
      AngleDegrees: 45,
      ParentObjectId: parentObjectId,
    },
  };
}

function sector(objects: Array<Planet | OtherCelestialObject>): Sector {
  return {
    SchemaVersion: 'merged-v1',
    OriginalSeed: 'test',
    SectorName: 'Test',
    Systems: [
      {
        ...entity('system'),
        HexLocation: { Column: 1, Row: 1 },
        Star: { ...entity('star'), StarType: 'G-type', HabitabilityRating: 3 },
        Objects: objects,
        PointsOfInterest: [],
      },
    ],
    Routes: [],
    RoutePortals: [],
    PlayerShip: { ...entity('ship'), CurrentLocationId: 'system' },
  };
}

describe('merged-sector independent stations', () => {
  it('rejects a station orbiting a moon', () => {
    const giant = planet('giant', null, 'Jupiter');
    const moon = planet('moon', giant.Id, 'Luna');
    const result = checkAllInvariants(sector([giant, moon, station('station', moon.Id)]));

    expect(result.some((violation) => violation.RuleId === 'B21')).toBe(true);
  });

  it('rejects a station orbiting an object', () => {
    const belt: OtherCelestialObject = {
      ...entity('belt'),
      Kind: 'OtherCelestialObject',
      ObjectType: 'AsteroidBelt',
      Temperature: 'Temperate',
      Orbit: { AU: 1, AngleDegrees: 0, ParentObjectId: null },
    };
    const result = checkAllInvariants(sector([belt, station('station', belt.Id)]));

    expect(result.some((violation) => violation.RuleId === 'B21')).toBe(true);
  });

  it('requires a direct station to host exactly one Deep-space station POI', () => {
    const stationObject = station('station', null);
    const input = sector([
      planet('planet', null, 'Earth'),
      planet('extra', null, 'Mars'),
      stationObject,
    ]);
    input.Systems[0]!.PointsOfInterest.push({
      ...entity('poi'),
      ParentObjectId: stationObject.Id,
      POIType: 'Deep-space station',
      AngleDegrees: 0,
    });
    const result = checkAllInvariants(input);

    expect(
      result.some((violation) => violation.RuleId === 'B21' || violation.RuleId === 'F14'),
    ).toBe(false);
  });

  it("uses the generator's POI host table", () => {
    const giant = planet('giant', null, 'Jupiter');
    const input = sector([giant, planet('moon', giant.Id, 'Luna'), station('station', null)]);
    input.Systems[0]!.PointsOfInterest.push({
      ...entity('poi'),
      ParentObjectId: giant.Id,
      POIType: 'Asteroid base',
      AngleDegrees: 0,
    });

    expect(checkAllInvariants(input).some((violation) => violation.RuleId === 'F13')).toBe(true);
  });

  it('does not use inhabited status to decide POI host compatibility', () => {
    const terrestrial = planet('terrestrial', null, 'Earth');
    terrestrial.InhabitedInfo = {
      TotalHab: 0,
      WorldTags: ['Abandoned Colony', 'Alien Ruins'],
      TerranBiosphere: 'None',
      Population: 'Fewer than 500',
      TechLevel: 'Modern postech',
    };
    const input = sector([terrestrial, planet('extra', null, 'Mars'), station('station', null)]);
    input.Systems[0]!.PointsOfInterest.push({
      ...entity('poi'),
      ParentObjectId: terrestrial.Id,
      POIType: 'Remote moon base',
      AngleDegrees: 0,
    });
    const violations = checkAllInvariants(input);

    expect(violations.some((violation) => violation.RuleId === 'F13')).toBe(false);
    expect(violations.some((violation) => violation.RuleId === 'F4')).toBe(true);
  });

  it('enforces other-object temperature bands', () => {
    const kuiper: OtherCelestialObject = {
      ...entity('kuiper'),
      Kind: 'OtherCelestialObject',
      ObjectType: 'KuiperBelt',
      Temperature: 'Temperate',
      Orbit: { AU: 2, AngleDegrees: 0, ParentObjectId: null },
    };

    expect(
      checkAllInvariants(sector([planet('planet', null, 'Earth'), kuiper])).some(
        (violation) => violation.RuleId === 'F12',
      ),
    ).toBe(true);
  });

  it('uses other-object temperature in direct-orbit ordering', () => {
    const asteroid: OtherCelestialObject = {
      ...entity('asteroid'),
      Kind: 'OtherCelestialObject',
      ObjectType: 'AsteroidBelt',
      Temperature: 'Furance',
      Orbit: { AU: 2, AngleDegrees: 0, ParentObjectId: null },
    };
    const coldPlanet = planet('planet', null, 'Earth');
    coldPlanet.Temperature = 'Cryogenic';

    expect(
      checkAllInvariants(sector([asteroid, coldPlanet])).some(
        (violation) => violation.RuleId === 'F12',
      ),
    ).toBe(true);
  });

  it('treats temperature-band endpoints as exclusive', () => {
    const volcanic = planet('planet', null, 'Earth');
    volcanic.Temperature = 'Furance';
    volcanic.Orbit.AU = 0.086; // G-type FromStar boundary

    expect(
      checkAllInvariants(sector([volcanic, station('station', null)])).some(
        (violation) => violation.RuleId === 'F12',
      ),
    ).toBe(true);
  });

  it('requires rank-1 population for Tomb Worlds and Abandoned Colonies', () => {
    const world = planet('world', null, 'Earth');
    world.InhabitedInfo = {
      TotalHab: 0,
      WorldTags: ['Tomb World', 'Abandoned Colony'],
      TerranBiosphere: 'None',
      Population: 'Fewer than a million inhabitants',
      TechLevel: 'Modern postech',
    };

    expect(
      checkAllInvariants(
        sector([world, planet('extra', null, 'Mars'), station('station', null)]),
      ).some((violation) => violation.RuleId === 'E9'),
    ).toBe(true);
  });

  it('rejects surface water on a Desert World', () => {
    const world = planet('world', null, 'Earth');
    world.Temperature = 'Temperate';
    world.Atmosphere = 'Breathable';
    world.SurfaceWaterPresent = true;
    world.InhabitedInfo = {
      TotalHab: 0,
      WorldTags: ['Desert World', 'Alien Ruins'],
      TerranBiosphere: 'None',
      Population: 'Fewer than 500',
      TechLevel: 'Modern postech',
    };

    expect(
      checkAllInvariants(
        sector([world, planet('extra', null, 'Mars'), station('station', null)]),
      ).some((violation) => violation.RuleId === 'E2'),
    ).toBe(true);
  });

  it('includes star Hab in TotalHab instead of applying a separate star gate', () => {
    const world = planet('world', null, 'Earth');
    world.Temperature = 'Temperate';
    world.Atmosphere = 'Breathable';
    world.InhabitedInfo = {
      TotalHab: 1,
      WorldTags: ['Alien Ruins', 'Anarchists'],
      TerranBiosphere: 'Significant',
      Population: 'Fewer than 500',
      TechLevel: 'Modern postech',
    };
    const input = sector([world, planet('extra', null, 'Mars'), station('station', null)]);
    input.Systems[0]!.Star.HabitabilityRating = 1;

    expect(checkAllInvariants(input).some((violation) => violation.RuleId === '2A-31')).toBe(false);
  });

  it('rejects unknown serialized properties', () => {
    const input = sector([
      planet('planet', null, 'Earth'),
      planet('extra', null, 'Mars'),
      station('station', null),
    ]);
    (input.Systems[0]! as unknown as Record<string, unknown>).Unexpected = true;

    expect(checkAllInvariants(input).some((violation) => violation.RuleId === '2A-09')).toBe(true);
  });

  it('safely rejects malformed serialized input', () => {
    expect(
      checkAllInvariants({ SchemaVersion: 'merged-v1' }).some(
        (violation) => violation.RuleId === 'SCHEMA',
      ),
    ).toBe(true);
  });
});
