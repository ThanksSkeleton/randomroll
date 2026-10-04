import { describe, expect, it } from 'vitest';
import { checkAllInvariants } from './generated_sector_invariants';
import type {
  OtherCelestialObject,
  Planet,
  Sector,
  SelectableEntity,
} from '../BaseDTO/merged_schema';
import { directOrbitAuBand } from '../Shared/spatial_interpretation';

function entity(id: string): SelectableEntity {
  return {
    Id: id,
    ProceduralName: `proc-${id}`,
    NiceName: `nice-${id}`,
    Visibility: {
      BasicScan: false,
      DetailedScan: false,
      PoliticsScan: false,
      DeepPoliticsScan: false,
    },
    Intelligence: {
      InfoboxSummary: '',
      BasicScan: '',
      DetailedScan: '',
      PoliticsScan: '',
      DeepPoliticsScan: '',
      GM: '',
    },
  };
}

function planet(id: string, parentObjectId: string | null, size: Planet['Size']): Planet {
  return {
    ...entity(id),
    Kind: 'Planet',
    Orbit:
      parentObjectId === null
        ? { AU: 1, AngleDegrees: 0, ParentObjectId: null }
        : { AngleDegrees: 0, ParentObjectId: parentObjectId },
    Size: size,
    BulkComposition:
      size === 'Jupiter' ? 'Jovian Gas' : size === 'Neptune' ? 'Neptunian Gas' : 'Silicon',
    SurfaceWaterPresent: false,
    Atmosphere: { Category: 'Vacuum' },
    NativeBiosphere: 1,
    ClaimedByPolityIds: [],
    InhabitedInfo: false,
  };
}

function station(id: string, parentObjectId: string | null): OtherCelestialObject {
  return {
    ...entity(id),
    Kind: 'OtherCelestialObject',
    ObjectType: 'IndependentStation',
    ClaimedByPolityIds: [],
    Orbit:
      parentObjectId === null
        ? { AU: 1.4, AngleDegrees: 45, ParentObjectId: null }
        : { AngleDegrees: 45, ParentObjectId: parentObjectId },
  };
}

function sector(objects: Array<Planet | OtherCelestialObject>): Sector {
  return {
    SchemaVersion: 'merged-v9',
    OriginalSeed: 'test',
    StartingWorldMode: 'UNRESTRICTED',
    StartingWorldId: null,
    SectorName: 'Test',
    Systems: [
      {
        ...entity('system'),
        HexLocation: { Column: 1, Row: 1 },
        Star: { ...entity('star'), StarType: 'G-type' },
        Objects: objects,
        PointsOfInterest: [],
        HabitablePointsOfInterest: [],
      },
    ],
    Routes: [],
    RoutePortals: [],
    Polities: [],
    ConquestEvents: [],
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
      ClaimedByPolityIds: [],
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
      WorldTags: ['Abandoned Colony', 'Alien Ruins'],
      TerranBiosphere: 1,
      Population: 1,
      TechLevel: 4,
    };
    terrestrial.Culture = null;
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

  it('rejects POIs with unresolved object references', () => {
    const input = sector([planet('planet', null, 'Earth'), planet('extra', null, 'Mars')]);
    input.Systems[0]!.PointsOfInterest.push({
      ...entity('poi'),
      ParentObjectId: 'missing-object',
      POIType: 'Asteroid base',
      AngleDegrees: 0,
    });

    expect(checkAllInvariants(input).some((violation) => violation.RuleId === 'F1')).toBe(true);
  });

  it('enforces other-object temperature bands', () => {
    const kuiper: OtherCelestialObject = {
      ...entity('kuiper'),
      Kind: 'OtherCelestialObject',
      ObjectType: 'KuiperBelt',
      ClaimedByPolityIds: [],
      Orbit: { AU: 1.2, AngleDegrees: 0, ParentObjectId: null },
    };

    const violations = checkAllInvariants(sector([planet('planet', null, 'Earth'), kuiper]));
    expect(violations.some((violation) => violation.RuleId === 'F12')).toBe(true);
  });

  it('treats temperature-band endpoints as exclusive', () => {
    const volcanic = planet('planet', null, 'Earth');
    if (volcanic.Orbit.ParentObjectId !== null) throw new Error('Expected direct orbit');
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
      WorldTags: ['Tomb World', 'Abandoned Colony'],
      TerranBiosphere: 1,
      Population: 2,
      TechLevel: 4,
    };
    world.Culture = null;

    expect(
      checkAllInvariants(
        sector([world, planet('extra', null, 'Mars'), station('station', null)]),
      ).some((violation) => violation.RuleId === 'E9'),
    ).toBe(true);
  });

  it('checks the inclusive native biosphere rank required by world tags', () => {
    const world = planet('world', null, 'Earth');
    world.InhabitedInfo = {
      WorldTags: ['Beastmasters', 'Alien Ruins'],
      TerranBiosphere: 1,
      Population: 1,
      TechLevel: 4,
    };
    world.Culture = null;
    const input = sector([world, planet('extra', null, 'Mars'), station('station', null)]);

    world.NativeBiosphere = 3;
    expect(checkAllInvariants(input).some((violation) => violation.RuleId === '2A-19b')).toBe(true);
    world.NativeBiosphere = 4;
    expect(checkAllInvariants(input).some((violation) => violation.RuleId === '2A-19b')).toBe(
      false,
    );
  });

  it('checks the inclusive atmosphere rank allowed by Bubble Cities', () => {
    const world = planet('world', null, 'Earth');
    world.InhabitedInfo = {
      WorldTags: ['Bubble Cities', 'Alien Ruins'],
      TerranBiosphere: 1,
      Population: 1,
      TechLevel: 4,
    };
    world.Culture = null;
    const input = sector([world, planet('extra', null, 'Mars'), station('station', null)]);

    world.Atmosphere = { Category: 'Flammable', SelectedGas: 'H2' };
    expect(checkAllInvariants(input).some((violation) => violation.RuleId === '2A-19a')).toBe(
      false,
    );
    world.Atmosphere = { Category: 'Inert', SelectedGas: 'N2' };
    expect(checkAllInvariants(input).some((violation) => violation.RuleId === '2A-19a')).toBe(true);
  });

  it('rejects string biosphere values in serialized sectors', () => {
    const world = planet('world', null, 'Earth');
    const input = sector([world, planet('extra', null, 'Mars'), station('station', null)]);
    (world as unknown as Record<string, unknown>).NativeBiosphere = 'None';
    expect(checkAllInvariants(input).some((violation) => violation.RuleId === 'SCHEMA')).toBe(true);

    world.NativeBiosphere = 1;
    world.InhabitedInfo = {
      WorldTags: ['Alien Ruins', 'Anarchists'],
      TerranBiosphere: 1,
      Population: 1,
      TechLevel: 4,
    };
    world.Culture = null;
    (world.InhabitedInfo as unknown as Record<string, unknown>).TerranBiosphere = 'None';
    expect(checkAllInvariants(input).some((violation) => violation.RuleId === 'SCHEMA')).toBe(true);
  });

  it('rejects surface water on a Desert World', () => {
    const world = planet('world', null, 'Earth');
    if (world.Orbit.ParentObjectId !== null) throw new Error('Expected direct orbit');
    const band = directOrbitAuBand('G-type', 'Temperate');
    world.Orbit.AU = (band[0] + band[1]) / 2;
    world.Atmosphere = { Category: 'Breathable', SelectedGas: 'N2' };
    world.SurfaceWaterPresent = true;
    world.InhabitedInfo = {
      WorldTags: ['Desert World', 'Alien Ruins'],
      TerranBiosphere: 1,
      Population: 1,
      TechLevel: 4,
    };
    world.Culture = null;

    expect(
      checkAllInvariants(
        sector([world, planet('extra', null, 'Mars'), station('station', null)]),
      ).some((violation) => violation.RuleId === 'E2'),
    ).toBe(true);
  });

  it('includes star habitability when checking physical constraints', () => {
    const world = planet('world', null, 'Earth');
    if (world.Orbit.ParentObjectId !== null) throw new Error('Expected direct orbit');
    const band = directOrbitAuBand('G-type', 'Temperate');
    world.Orbit.AU = (band[0] + band[1]) / 2;
    world.Atmosphere = { Category: 'Breathable', SelectedGas: 'N2' };
    world.InhabitedInfo = {
      WorldTags: ['Alien Ruins', 'Anarchists'],
      TerranBiosphere: 4,
      Population: 1,
      TechLevel: 4,
    };
    world.Culture = null;
    const input = sector([world, planet('extra', null, 'Mars'), station('station', null)]);
    input.Systems[0]!.Star.StarType = 'A-type';

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
      checkAllInvariants({ SchemaVersion: 'merged-v2' }).some(
        (violation) => violation.RuleId === 'SCHEMA',
      ),
    ).toBe(true);
  });
});
