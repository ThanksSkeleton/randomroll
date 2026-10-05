import { generateSwnCultureForTags } from '../../swn_culture/swn_culture_impl';
import type { SectorCulture } from '../BaseDTO/culture';
import type {
  HabitablePointOfInterest,
  HabitablePointOfInterestType,
  Planet,
  Sector,
  StarSystem,
} from '../BaseDTO/merged_schema';
import { deterministicId, randomFor } from './generation_random';
import { applySystemNiceNames } from './system_naming';

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

/** Propagates a stored culture name to its system and other dependent names. */
function propagateCultureDrivenNames(sector: Sector, worldId: string): void {
  const world = sector.Systems.flatMap((system) => system.Objects).find(
    (object): object is Planet => object.Id === worldId && object.Kind === 'Planet',
  );
  if (!world?.Culture)
    throw new Error(`Cannot propagate names without culture for world ${worldId}`);
  let system = sector.Systems.find((candidate) =>
    candidate.Objects.some((object) => object.Id === worldId),
  )!;
  const namingWorld = system.Objects.find(
    (object): object is Planet => object.Kind === 'Planet' && object.InhabitedInfo !== false,
  );
  system = applySystemNiceNames(
    system,
    namingWorld?.Id === worldId ? world.Culture.homeworld : system.NiceName,
  );
  sector.Systems = sector.Systems.map((candidate) =>
    candidate.Id === system.Id ? system : candidate,
  );
  const affectedWorldIds = new Set(
    system.Objects.filter(
      (object) => object.Kind === 'Planet' && object.InhabitedInfo !== false,
    ).map((object) => object.Id),
  );
  for (const polity of sector.Polities) {
    if (!affectedWorldIds.has(polity.HomeworldId)) continue;
    const homeworld = system.Objects.find((object) => object.Id === polity.HomeworldId)!;
    polity.NiceName = homeworld.NiceName;
  }
  const systemById = new Map(sector.Systems.map((candidate) => [candidate.Id, candidate]));
  for (const portal of sector.RoutePortals) {
    const route = sector.Routes.find((candidate) => candidate.PortalIds.includes(portal.Id));
    if (!route) continue;
    const otherPortalId = route.PortalIds.find((id) => id !== portal.Id)!;
    const otherPortal = sector.RoutePortals.find((candidate) => candidate.Id === otherPortalId)!;
    if (portal.SystemId !== system.Id && otherPortal.SystemId !== system.Id) continue;
    const side = systemById.get(portal.SystemId)!;
    const other = systemById.get(otherPortal.SystemId)!;
    portal.NiceName = `Portal ${side.NiceName}-${other.NiceName}`;
  }
  const polityNameById = new Map(sector.Polities.map((polity) => [polity.Id, polity.NiceName]));
  for (const candidate of sector.Systems)
    for (const object of candidate.Objects)
      object.ClaimedByPolityIds.sort(
        (left, right) =>
          (polityNameById.get(left) ?? '').localeCompare(polityNameById.get(right) ?? '') ||
          left.localeCompare(right),
      );
}

export function completeWorld(sector: Sector, worldId: string): Sector {
  const next = structuredClone(sector);
  const world = next.Systems.flatMap((system) => system.Objects).find(
    (object): object is Planet =>
      object.Id === worldId && object.Kind === 'Planet' && object.InhabitedInfo !== false,
  );
  if (!world) throw new Error('Only an inhabited world can be completed.');
  if (world.Culture) return sector;
  const inhabited = world.InhabitedInfo;
  if (inhabited === false) throw new Error('Only an inhabited world can be completed.');
  const generated = generateSwnCultureForTags(
    inhabited.WorldTags,
    `${sector.OriginalSeed}:world-culture:${world.Id}`,
  );
  const { worldTags: _worldTags, ...selected } = generated;
  selected.adventureComponents = Object.fromEntries(
    Object.entries(selected.adventureComponents).map(([kind, component]) => [
      kind,
      {
        ...component,
        prompts: component.prompts.map(({ prompt }) => ({ prompt })),
      },
    ]),
  ) as typeof selected.adventureComponents;
  world.Culture = selected as SectorCulture;
  propagateCultureDrivenNames(next, world.Id);
  return next;
}
