import { generateSwnCultureForTags } from '../../swn_culture/swn_culture_impl';
import type {
  HabitablePointOfInterest,
  HabitablePointOfInterestType,
  Planet,
  Sector,
  StarSystem,
} from '../BaseDTO/merged_schema';
import { deterministicId, randomFor } from './generation_random';

const INFRASTRUCTURE_TYPES: HabitablePointOfInterestType[] = [
  'Orbital Station',
  'Starport',
  'Planetary Defenses',
];

function shell(
  seed: string,
  world: Planet,
  type: HabitablePointOfInterestType,
  polityId: string | null,
): HabitablePointOfInterest {
  const path = `hpoi:${world.Id}:${type}:${polityId ?? 'world'}`;
  const label = type === 'Garrison' ? `Garrison ${polityId}` : type;
  return {
    Id: deterministicId(seed, path),
    ProceduralName: label,
    NiceName: label,
    ParentWorldId: world.Id,
    HPOIType: type,
    AssignedPolityId: polityId,
    AngleDegrees: randomFor(seed, `${path}:angle`)() * 360,
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

export function createHabitablePointsOfInterest(
  seed: string,
  system: StarSystem,
): HabitablePointOfInterest[] {
  return system.Objects.flatMap((object) => {
    if (object.Kind !== 'Planet' || object.InhabitedInfo === false) return [];
    return [
      ...INFRASTRUCTURE_TYPES.map((type) => shell(seed, object, type, null)),
      ...object.ClaimedByPolityIds.map((id) => shell(seed, object, 'Garrison', id)),
    ];
  });
}

export function completeWorld(sector: Sector, worldId: string): Sector {
  const next = structuredClone(sector);
  const world = next.Systems.flatMap((system) => system.Objects).find(
    (object): object is Planet =>
      object.Id === worldId && object.Kind === 'Planet' && object.InhabitedInfo !== false,
  );
  if (!world) throw new Error('Only an inhabited world can be completed.');
  if (world.Complete) return sector;
  const inhabited = world.InhabitedInfo;
  if (inhabited === false) throw new Error('Only an inhabited world can be completed.');
  world.Culture = generateSwnCultureForTags(
    inhabited.WorldTags,
    `${sector.OriginalSeed}:world-culture:${world.Id}`,
  );
  world.Complete = true;
  return next;
}
