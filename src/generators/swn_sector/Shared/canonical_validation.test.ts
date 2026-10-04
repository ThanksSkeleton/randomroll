import { describe, expect, it } from 'vitest';
import { checkCanonicalInvariants } from './canonical_validation';
import type { Sector } from '../BaseDTO/merged_schema';

function entity(id: string) {
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

function sector(): Sector {
  return {
    SchemaVersion: 'merged-v8',
    OriginalSeed: 'test',
    StartingWorldMode: 'UNRESTRICTED',
    StartingWorldId: null,
    SectorName: 'Test',
    Systems: [],
    Routes: [],
    RoutePortals: [],
    Polities: [],
    ConquestEvents: [],
    PlayerShip: { ...entity('ship'), CurrentLocationId: 'ship' },
  };
}

describe('canonical validation', () => {
  it('rejects malformed serialized input', () => {
    expect(checkCanonicalInvariants({ SchemaVersion: 'merged-v2' })).toContainEqual({
      RuleId: 'SCHEMA',
      Message: 'Sector.OriginalSeed must be present.',
    });
  });

  it('rejects unknown schema properties', () => {
    const value = sector() as ReturnType<typeof sector> & Record<string, unknown>;
    value.Unexpected = true;
    expect(checkCanonicalInvariants(value).some(({ RuleId }) => RuleId === '2A-09')).toBe(true);
  });

  it('checks selectable identity and allows the ship to refer to itself only through normal selectable checks', () => {
    const value = sector();
    value.Systems.push({
      ...entity('ship'),
      HexLocation: { Column: 1, Row: 1 },
      Star: { ...entity('star'), StarType: 'G-type' },
      Objects: [],
      PointsOfInterest: [],
      HabitablePointsOfInterest: [],
    });
    expect(checkCanonicalInvariants(value).some(({ RuleId }) => RuleId === 'H4')).toBe(true);
  });
});
