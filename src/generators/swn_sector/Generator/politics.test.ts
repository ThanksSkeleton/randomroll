import { describe, expect, it } from 'vitest';
import type {
  OtherCelestialObject,
  Planet,
  Population,
  Route,
  RoutePortal,
  SelectableEntity,
  StarSystem,
  TechLevel,
} from '../BaseDTO/merged_schema';
import { resolvePolitics } from './politics';
import { capabilityFor } from '../Helpers/Domain/politics_interpretation';

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
    Atmosphere: 'Breathable',
    NativeBiosphere: 'Significant',
    InhabitedInfo:
      inhabited === false
        ? false
        : {
            WorldTags: ['Alien Ruins', 'Anarchists'],
            TerranBiosphere: 'Significant',
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

function system(id: string, objects: StarSystem['Objects']): StarSystem {
  return {
    ...entity(id),
    HexLocation: { Column: 1, Row: 1 },
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
    const populations: Population[] = [
      'Fewer than 500',
      'Fewer than a million inhabitants',
      'Several million inhabitants',
      'Hundreds of millions of inhabitants',
      'Billions of inhabitants',
    ];
    const expected: Record<TechLevel, Array<[number, number, number]>> = {
      'Neolithic-level technology': populations.map(() => [0, 0, -1]),
      'Medieval technology': populations.map(() => [0, 0, -1]),
      'Early Industrial Age tech': populations.map(() => [0, 0, -1]),
      'Tech like that of present-day Earth': [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [1, 1, 0],
        [1, 1, 0],
      ],
      'Modern postech': [
        [1, 1, 0],
        [2, 2, 1],
        [2, 2, 1],
        [2, 3, 1],
        [2, 3, 1],
      ],
      'Postech with specialties': [
        [1, 1, 0],
        [2, 2, 1],
        [2, 2, 1],
        [2, 3, 1],
        [2, 3, 1],
      ],
      'Pretech with surviving infrastructure': [
        [2, 2, 1],
        [3, 3, 2],
        [3, 4, 2],
        [3, 4, 2],
        [4, 4, 3],
      ],
    };

    for (const [techLevel, rows] of Object.entries(expected) as [
      TechLevel,
      Array<[number, number, number]>,
    ][])
      rows.forEach(([Attack, Defense, Projection], index) =>
        expect(capabilityFor(techLevel, populations[index]!)).toEqual({
          Attack,
          Defense,
          Projection,
        }),
      );
  });
});

describe('simultaneous political resolution', () => {
  it('assigns unique body colors when polity count exceeds the old palette', () => {
    const systems = Array.from({ length: 30 }, (_, index) => {
      const suffix = String(index).padStart(2, '0');
      return system(`system-${suffix}`, [
        planet(`world-${suffix}`, `World ${suffix}`, {
          TechLevel: 'Modern postech',
          Population: 'Fewer than 500',
        }),
      ]);
    });

    const result = resolvePolitics('many-polities', systems, [], []);
    const colors = result.Polities.map((polity) => polity.Flag.FieldColor);

    expect(colors).toHaveLength(30);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('gives a surviving native exclusive control of its contested homeworld', () => {
    const alpha = planet('alpha', 'Alpha', {
      TechLevel: 'Modern postech',
      Population: 'Hundreds of millions of inhabitants',
    });
    const beta = planet('beta', 'Beta', {
      TechLevel: 'Pretech with surviving infrastructure',
      Population: 'Fewer than a million inhabitants',
    });
    const systems = [system('alpha-system', [alpha]), system('beta-system', [beta])];
    const { routes, portals } = connect([['alpha-system', 'beta-system']]);

    const result = resolvePolitics('native-tie', systems, routes, portals);

    expect(claims(result, alpha.Id)).toEqual(['Alpha']);
    expect(
      result.ConquestEvents.find((event) => event.TargetWorldId === alpha.Id)?.Attack! >
        result.ConquestEvents.find((event) => event.TargetWorldId === alpha.Id)?.Defense!,
    ).toBe(false);
  });

  it('keeps multiple foreign victors tied on a defeated homeworld', () => {
    const alpha = planet('alpha', 'Alpha', {
      TechLevel: 'Modern postech',
      Population: 'Fewer than a million inhabitants',
    });
    const beta = planet('beta', 'Beta', {
      TechLevel: 'Pretech with surviving infrastructure',
      Population: 'Fewer than a million inhabitants',
    });
    const gamma = planet('gamma', 'Gamma', {
      TechLevel: 'Pretech with surviving infrastructure',
      Population: 'Several million inhabitants',
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

    const result = resolvePolitics('foreign-tie', systems, routes, portals);
    const reordered = resolvePolitics(
      'foreign-tie',
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
      TechLevel: 'Pretech with surviving infrastructure',
      Population: 'Fewer than a million inhabitants',
    });
    const alpha = planet('alpha', 'Alpha', {
      TechLevel: 'Modern postech',
      Population: 'Fewer than a million inhabitants',
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

    const result = resolvePolitics('transmigration', systems, routes, portals);

    expect(claims(result, alpha.Id)).toEqual(['Beta']);
    expect(claims(result, remoteStation.Id)).toEqual(['Alpha']);
  });

  it('limits projection -1 to its homeworld and paints every object at projection 0', () => {
    const primitive = planet('primitive', 'Primitive', {
      TechLevel: 'Medieval technology',
      Population: 'Billions of inhabitants',
    });
    const industrial = planet('industrial', 'Industrial', {
      TechLevel: 'Tech like that of present-day Earth',
      Population: 'Fewer than a million inhabitants',
    });
    const emptyWorld = planet('empty', 'Empty', false);
    const belt = other('belt', 'AsteroidBelt');
    const kuiper = other('kuiper', 'KuiperBelt');
    const cloud = other('cloud', 'GasCloud');
    const station = other('station', 'IndependentStation');
    const systems = [
      system('shared-system', [primitive, industrial, emptyWorld, belt, kuiper, cloud, station]),
    ];

    const result = resolvePolitics('same-system', systems, [], []);

    expect(claims(result, primitive.Id)).toEqual(['Primitive']);
    for (const target of [emptyWorld, belt, kuiper, cloud, station])
      expect(claims(result, target.Id)).toEqual(['Industrial']);
  });
});
