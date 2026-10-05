import { describe, expect, it } from 'vitest';
import type {
  OtherCelestialObject,
  HexLocation,
  Planet,
  Population,
  Route,
  RoutePortal,
  SelectableEntity,
  StarSystem,
  TechLevel,
} from '../BaseDTO/merged_schema';
import { resolvePolitics } from './politics';
import { capabilityFor } from '../Shared/politics_interpretation';

function entity(id: string, niceName = id): SelectableEntity {
  return {
    Id: id,
    ProceduralName: id,
    NiceName: niceName,
    Visibility: {
      BasicScan: false,
      DetailedScan: false,
      PoliticsScan: false,
      DeepPoliticsScan: false,
    },
    Intelligence: {
      InfoboxSummary: '-',
      BasicScan: '-',
      DetailedScan: '-',
      PoliticsScan: '-',
      DeepPoliticsScan: '-',
      GM: '-',
    },
  };
}

function planet(
  id: string,
  niceName: string,
  inhabited: false | { TechLevel: TechLevel; Population: Population },
): Planet {
  return {
    ...entity(id, niceName),
    Kind: 'Planet',
    Orbit: { AU: 1, AngleDegrees: 0, ParentObjectId: null },
    ClaimedByPolityIds: [],
    Size: 'Earth',
    BulkComposition: 'Silicon',
    SurfaceWaterPresent: true,
    Atmosphere: { Category: 'Breathable', SelectedGas: 'N2' },
    NativeBiosphere: 4,
    InhabitedInfo:
      inhabited === false
        ? false
        : {
            WorldTags: ['Alien Ruins', 'Anarchists'],
            TerranBiosphere: 4,
            ...inhabited,
          },
  };
}

function other(id: string, type: OtherCelestialObject['ObjectType']): OtherCelestialObject {
  return {
    ...entity(id),
    Kind: 'OtherCelestialObject',
    ObjectType: type,
    Orbit: { AU: 2, AngleDegrees: 0, ParentObjectId: null },
    ClaimedByPolityIds: [],
  };
}

function system(
  id: string,
  objects: StarSystem['Objects'],
  HexLocation: HexLocation = { Column: 1, Row: 1 },
): StarSystem {
  return {
    ...entity(id),
    HexLocation,
    Star: { ...entity(`${id}-star`), StarType: 'G-type' },
    Objects: objects,
    PointsOfInterest: [],
    HabitablePointsOfInterest: [],
  };
}

function connect(pairs: ReadonlyArray<readonly [string, string]>): {
  routes: Route[];
  portals: RoutePortal[];
} {
  const routes: Route[] = [];
  const portals: RoutePortal[] = [];
  pairs.forEach(([left, right], index) => {
    const routeId = `route-${index}`;
    const leftPortalId = `${routeId}-left`;
    const rightPortalId = `${routeId}-right`;
    routes.push({ ...entity(routeId), PortalIds: [leftPortalId, rightPortalId] });
    portals.push(
      {
        ...entity(leftPortalId),
        SystemId: left,
        BoundaryAngleDegrees: 0,
      },
      {
        ...entity(rightPortalId),
        SystemId: right,
        BoundaryAngleDegrees: 180,
      },
    );
  });
  return { routes, portals };
}

function claims(result: ReturnType<typeof resolvePolitics>, objectId: string): string[] {
  const polityNames = new Map(result.Polities.map((polity) => [polity.Id, polity.NiceName]));
  return (result.ClaimsByObjectId.get(objectId) ?? []).map((id) => polityNames.get(id)!);
}

describe('political capability matrix', () => {
  it('maps every canonical technology and population combination', () => {
    const populations: Population[] = [1, 2, 3, 4, 5];
    const expected: Record<TechLevel, Array<[number, number, number]>> = {
      0: populations.map(() => [0, 0, -1]),
      1: populations.map(() => [0, 0, -1]),
      2: populations.map(() => [0, 0, -1]),
      3: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [1, 1, 0],
        [1, 1, 0],
      ],
      4: [
        [1, 1, 0],
        [2, 2, 1],
        [2, 2, 1],
        [2, 3, 1],
        [2, 3, 1],
      ],
      4.1: [
        [1, 1, 0],
        [2, 2, 1],
        [2, 2, 1],
        [2, 3, 1],
        [2, 3, 1],
      ],
      5: [
        [2, 2, 1],
        [3, 3, 2],
        [3, 4, 2],
        [3, 4, 2],
        [4, 4, 3],
      ],
    };

    for (const [techLevelKey, rows] of Object.entries(expected) as [
      string,
      Array<[number, number, number]>,
    ][])
      rows.forEach(([Attack, Defense, Projection], index) =>
        expect(capabilityFor(Number(techLevelKey) as TechLevel, populations[index]!)).toEqual({
          Attack,
          Defense,
          Projection,
          ProjectionHexDistance: Projection,
        }),
      );
  });
});

describe('simultaneous political resolution', () => {
  it('requires both configured route-hop and hex-distance projection reach', () => {
    const alpha = planet('alpha', 'Alpha', {
      TechLevel: 4,
      Population: 2,
    });
    const nearbyStation = other('nearby-station', 'IndependentStation');
    const distantWorld = planet('distant-world', 'Distant', {
      TechLevel: 1,
      Population: 1,
    });
    const systems = [
      system('alpha-system', [alpha], { Column: 1, Row: 1 }),
      system('nearby-system', [nearbyStation], { Column: 2, Row: 1 }),
      system('distant-system', [distantWorld], { Column: 3, Row: 1 }),
    ];
    const { routes, portals } = connect([
      ['alpha-system', 'nearby-system'],
      ['alpha-system', 'distant-system'],
    ]);

    const result = resolvePolitics({ seed: 'dual-projection-range' }, systems, routes, portals);

    expect(claims(result, nearbyStation.Id)).toEqual(['Alpha']);
    expect(claims(result, distantWorld.Id)).toEqual(['Distant']);
    expect(result.ConquestEvents.some((event) => event.TargetWorldId === distantWorld.Id)).toBe(
      false,
    );
  });

  it('assigns unique body colors when polity count exceeds the old palette', () => {
    const systems = Array.from({ length: 30 }, (_, index) => {
      const suffix = String(index).padStart(2, '0');
      return system(`system-${suffix}`, [
        planet(`world-${suffix}`, `World ${suffix}`, {
          TechLevel: 4,
          Population: 1,
        }),
      ]);
    });

    const result = resolvePolitics({ seed: 'many-polities' }, systems, [], []);
    const colors = result.Polities.map((polity) => polity.Flag.FieldColor);

    expect(colors).toHaveLength(30);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('gives a surviving native exclusive control of its contested homeworld', () => {
    const alpha = planet('alpha', 'Alpha', {
      TechLevel: 4,
      Population: 4,
    });
    const beta = planet('beta', 'Beta', {
      TechLevel: 5,
      Population: 2,
    });
    const systems = [system('alpha-system', [alpha]), system('beta-system', [beta])];
    const { routes, portals } = connect([['alpha-system', 'beta-system']]);

    const result = resolvePolitics({ seed: 'native-tie' }, systems, routes, portals);

    expect(claims(result, alpha.Id)).toEqual(['Alpha']);
    expect(
      result.ConquestEvents.find((event) => event.TargetWorldId === alpha.Id)?.Attack! >
        result.ConquestEvents.find((event) => event.TargetWorldId === alpha.Id)?.Defense!,
    ).toBe(false);
  });

  it('keeps multiple foreign victors tied on a defeated homeworld', () => {
    const alpha = planet('alpha', 'Alpha', {
      TechLevel: 4,
      Population: 2,
    });
    const beta = planet('beta', 'Beta', {
      TechLevel: 5,
      Population: 2,
    });
    const gamma = planet('gamma', 'Gamma', {
      TechLevel: 5,
      Population: 3,
    });
    const systems = [
      system('alpha-system', [alpha]),
      system('beta-system', [beta]),
      system('gamma-system', [gamma]),
    ];
    const { routes, portals } = connect([
      ['alpha-system', 'beta-system'],
      ['alpha-system', 'gamma-system'],
    ]);

    const result = resolvePolitics({ seed: 'foreign-tie' }, systems, routes, portals);
    const reordered = resolvePolitics(
      { seed: 'foreign-tie' },
      [...systems].reverse(),
      [...routes].reverse(),
      [...portals].reverse(),
    );

    expect(claims(result, alpha.Id)).toEqual(['Beta', 'Gamma']);
    expect(claims(reordered, alpha.Id)).toEqual(['Beta', 'Gamma']);
    expect(reordered.Polities.map((polity) => polity.Flag)).toEqual(
      result.Polities.map((polity) => polity.Flag),
    );
    expect(new Set(result.Polities.map((polity) => polity.Flag.FieldColor)).size).toBe(
      result.Polities.length,
    );
    for (const polity of result.Polities) {
      expect(polity.Flag.FieldColor).not.toBe('black');
      expect(polity.Flag.CircleColor).not.toBe('black');
      expect(polity.Flag.FieldColor).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(
      result.ConquestEvents.filter(
        (event) => event.TargetWorldId === alpha.Id && event.Attack > event.Defense,
      ),
    ).toHaveLength(2);
  });

  it('preserves a conquered polity projection beyond its conqueror range', () => {
    const beta = planet('beta', 'Beta', {
      TechLevel: 5,
      Population: 2,
    });
    const alpha = planet('alpha', 'Alpha', {
      TechLevel: 4,
      Population: 2,
    });
    const remoteStation = other('remote-station', 'IndependentStation');
    const systems = [
      system('beta-system', [beta]),
      system('middle-system', []),
      system('alpha-system', [alpha]),
      system('remote-system', [remoteStation]),
    ];
    const { routes, portals } = connect([
      ['beta-system', 'middle-system'],
      ['middle-system', 'alpha-system'],
      ['alpha-system', 'remote-system'],
    ]);

    const result = resolvePolitics({ seed: 'transmigration' }, systems, routes, portals);

    expect(claims(result, alpha.Id)).toEqual(['Beta']);
    expect(claims(result, remoteStation.Id)).toEqual(['Alpha']);
  });

  it('limits projection -1 to its homeworld and paints every object at projection 0', () => {
    const primitive = planet('primitive', 'Primitive', {
      TechLevel: 1,
      Population: 5,
    });
    const industrial = planet('industrial', 'Industrial', {
      TechLevel: 3,
      Population: 2,
    });
    const emptyWorld = planet('empty', 'Empty', false);
    const belt = other('belt', 'AsteroidBelt');
    const kuiper = other('kuiper', 'KuiperBelt');
    const cloud = other('cloud', 'GasCloud');
    const station = other('station', 'IndependentStation');
    const systems = [
      system('shared-system', [primitive, industrial, emptyWorld, belt, kuiper, cloud, station]),
    ];

    const result = resolvePolitics({ seed: 'same-system' }, systems, [], []);

    expect(claims(result, primitive.Id)).toEqual(['Primitive']);
    for (const target of [emptyWorld, belt, kuiper, cloud, station])
      expect(claims(result, target.Id)).toEqual(['Industrial']);
  });
});
