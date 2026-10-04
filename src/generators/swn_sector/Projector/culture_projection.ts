import type {
  HabitablePointOfInterest,
  HabitablePointOfInterestType,
  Planet,
  Sector,
} from '../BaseDTO/merged_schema';
import type { SwnCulture } from '../BaseDTO/culture';
import type {
  CultureScreenDisplayDTO,
  CultureWorldDisplayDTO,
  HabitablePoiDisplayDTO,
  PolityDisplayDTO,
} from '../DisplayDTO/dto';
import { techLevelStrings } from '../Shared/tech_level_interpretation';
import { populationStrings } from '../Shared/population_interpretation';
import { projectClaims, projectPolity } from './politics_projection';
import { projectWorldTag } from './world_tag_projection';
import { HPOI_MARKER } from '../Data/Projection/poi_presentation';

export function hpoiWorld(sector: Sector, hpoi: HabitablePointOfInterest): Planet | undefined {
  const system = sector.Systems.find((candidate) =>
    candidate.HabitablePointsOfInterest.some((item) => item.Id === hpoi.Id),
  );
  return system?.Objects.find(
    (object): object is Planet =>
      object.Kind === 'Planet' &&
      object.Id === hpoi.ParentWorldId &&
      object.InhabitedInfo !== false,
  );
}

export function hpoiProjection(
  sector: Sector,
  hpoi: HabitablePointOfInterest,
): {
  absent: boolean;
  reason: string | null;
  fields: [string, string][];
  polityIds: string[];
} {
  const world = hpoiWorld(sector, hpoi);
  if (!world || world.InhabitedInfo === false)
    return { absent: true, reason: 'Missing world', fields: [], polityIds: [] };
  const polityIds = hpoi.AssignedPolityId ? [hpoi.AssignedPolityId] : world.ClaimedByPolityIds;
  let reason: string | null = null;
  if (hpoi.HPOIType === 'Garrison') {
    const polity = sector.Polities.find((candidate) => candidate.Id === hpoi.AssignedPolityId);
    const home =
      polity &&
      sector.Systems.flatMap((system) => system.Objects).find(
        (object) => object.Id === polity.HomeworldId,
      );
    if (
      !home ||
      home.Kind !== 'Planet' ||
      home.InhabitedInfo === false ||
      home.InhabitedInfo.TechLevel < 4
    )
      reason = 'Assigned polity below TL 4';
  } else if (world.ClaimedByPolityIds.length > 1) reason = 'Contested world';
  else if (world.InhabitedInfo.TechLevel < 4) reason = 'Original polity below TL 4';
  if (!world.Culture) return { absent: reason !== null, reason, fields: [], polityIds };
  const culture = world.Culture;
  let fields: [string, string][];
  switch (hpoi.HPOIType) {
    case 'Orbital Station':
      fields = [
        ['Orbiting Station Style', culture.planetaryDefenses.orbitingStationStyle],
        ['Orbiting Station Type', culture.planetaryDefenses.orbitingStationType],
        [
          'Trade and Smuggling Enforcement Amount',
          culture.planetaryDefenses.tradeAndSmugglingEnforcementAmount,
        ],
        ['Customs and Visa Emphasis', culture.planetaryDefenses.customsAndVisaEmphasis],
      ];
      break;
    case 'Starport':
      fields = [
        ['Starport Type', culture.majorStarport.type],
        ['Starport Name', culture.majorStarport.name],
      ];
      break;
    case 'Planetary Defenses':
      fields = [['Planetary Gun Turrets', culture.planetaryDefenses.planetaryGunTurrets]];
      break;
    case 'Garrison':
      fields = [['Patrol Boat Presence', culture.planetaryDefenses.patrolBoatPresence]];
      break;
  }
  if (hpoi.HPOIType === 'Garrison') {
    if (!reason && culture.planetaryDefenses.patrolBoatPresence.toLowerCase() === 'none')
      reason = 'No patrol boats';
  }
  if (reason) fields = fields.map(([name]) => [name, name === 'Starport Name' ? '' : 'NONE']);
  return { absent: reason !== null, reason, fields, polityIds };
}

export function displayedWorldCulture(sector: Sector, world: Planet): SwnCulture | null {
  if (!world.Culture) return null;
  if (world.InhabitedInfo === false) return null;
  const tags = world.InhabitedInfo.WorldTags;
  const selected = structuredClone(world.Culture);
  const display = {
    ...selected,
    worldTags: [...tags] as [(typeof tags)[0], (typeof tags)[1]],
    adventureComponents: Object.fromEntries(
      Object.entries(selected.adventureComponents).map(([kind, component]) => [
        kind,
        {
          ...component,
          prompts: component.prompts.map(({ prompt }, index) => ({
            prompt,
            sourceTag: tags[index]!,
          })),
        },
      ]),
    ) as SwnCulture['adventureComponents'],
  };
  const hpois = sector.Systems.flatMap((system) => system.HabitablePointsOfInterest).filter(
    (hpoi) => hpoi.ParentWorldId === world.Id,
  );
  const projected = (type: HabitablePointOfInterestType) =>
    hpois.find((hpoi) => hpoi.HPOIType === type);
  const station = projected('Orbital Station');
  const starport = projected('Starport');
  const defenses = projected('Planetary Defenses');
  const value = (hpoi: HabitablePointOfInterest | undefined, name: string, fallback: string) =>
    hpoi
      ? (hpoiProjection(sector, hpoi).fields.find(([label]) => label === name)?.[1] ?? fallback)
      : fallback;
  display.planetaryDefenses.orbitingStationStyle = value(
    station,
    'Orbiting Station Style',
    display.planetaryDefenses.orbitingStationStyle,
  );
  display.planetaryDefenses.orbitingStationType = value(
    station,
    'Orbiting Station Type',
    display.planetaryDefenses.orbitingStationType,
  );
  display.planetaryDefenses.tradeAndSmugglingEnforcementAmount = value(
    station,
    'Trade and Smuggling Enforcement Amount',
    display.planetaryDefenses.tradeAndSmugglingEnforcementAmount,
  );
  display.planetaryDefenses.customsAndVisaEmphasis = value(
    station,
    'Customs and Visa Emphasis',
    display.planetaryDefenses.customsAndVisaEmphasis,
  );
  display.majorStarport.type = value(starport, 'Starport Type', display.majorStarport.type);
  display.majorStarport.name = value(starport, 'Starport Name', display.majorStarport.name);
  display.planetaryDefenses.planetaryGunTurrets = value(
    defenses,
    'Planetary Gun Turrets',
    display.planetaryDefenses.planetaryGunTurrets,
  );
  const garrisons = hpois.filter((hpoi) => hpoi.HPOIType === 'Garrison');
  if (garrisons.length === 1)
    display.planetaryDefenses.patrolBoatPresence = value(
      garrisons[0],
      'Patrol Boat Presence',
      display.planetaryDefenses.patrolBoatPresence,
    );
  else if (garrisons.length !== 1)
    display.planetaryDefenses.patrolBoatPresence = garrisons.length
      ? 'By polity — see Garrisons below'
      : 'NONE';
  return display;
}

export function hpoiVisible(
  sector: Sector,
  hpoi: HabitablePointOfInterest,
  preview: 'gm' | 'player',
): boolean {
  const projection = hpoiProjection(sector, hpoi);
  if (projection.absent) return false;
  if (preview === 'gm') return true;
  return hpoi.Visibility.BasicScan && Boolean(hpoiWorld(sector, hpoi)?.Visibility.BasicScan);
}

export function projectHabitablePoi(
  sector: Sector,
  id: string,
): HabitablePoiDisplayDTO | undefined {
  const hpoi = sector.Systems.flatMap((system) => system.HabitablePointsOfInterest).find(
    (candidate) => candidate.Id === id,
  );
  if (!hpoi || !hpoiWorld(sector, hpoi)) return undefined;
  const result = hpoiProjection(sector, hpoi);
  const assignedPolity = hpoi.AssignedPolityId
    ? projectPolity(sector, hpoi.AssignedPolityId)
    : null;
  if (hpoi.AssignedPolityId && !assignedPolity) return undefined;
  const claims = result.polityIds.map((polityId) => projectPolity(sector, polityId));
  if (claims.some((polity) => !polity)) return undefined;
  const field = (name: string) => result.fields.find(([label]) => label === name)?.[1];
  const physical = result.fields.filter(
    ([name]) =>
      !['Trade and Smuggling Enforcement Amount', 'Customs and Visa Emphasis'].includes(name),
  );
  const names = (claims as PolityDisplayDTO[]).map((polity) => polity.NiceName);
  return {
    id: hpoi.Id,
    typeLabel: hpoi.HPOIType,
    marker: HPOI_MARKER[hpoi.HPOIType],
    hostId: hpoi.ParentWorldId,
    assignedPolity: assignedPolity ?? null,
    ...result,
    stock: {
      basic: [hpoi.HPOIType, ...physical.map(([name, value]) => `${name}: ${value}`)].join('\n'),
      detailed: '-',
      politics: `ClaimedBy: ${names.length ? names.join(', ') : 'None'}`,
      deep:
        [
          field('Trade and Smuggling Enforcement Amount') &&
            `Trade and Smuggling Enforcement Amount: ${field('Trade and Smuggling Enforcement Amount')}`,
          field('Customs and Visa Emphasis') &&
            `Customs and Visa Emphasis: ${field('Customs and Visa Emphasis')}`,
        ]
          .filter(Boolean)
          .join('\n') || '-',
      gm:
        `${result.reason ? `NONE: ${result.reason}\n` : ''}${result.fields.map(([name, value]) => `${name}: ${value}`).join('\n')}` ||
        '-',
    },
  };
}

export function projectCultureWorld(
  sector: Sector,
  worldId: string,
): CultureWorldDisplayDTO | undefined {
  const system = sector.Systems.find((candidate) =>
    candidate.Objects.some((object) => object.Id === worldId),
  );
  const world = system?.Objects.find((object) => object.Id === worldId);
  if (!system || !world || world.Kind !== 'Planet' || world.InhabitedInfo === false)
    return undefined;
  const claims = projectClaims(sector, world);
  if (!claims) return undefined;
  const original = sector.Polities.find((polity) => polity.HomeworldId === worldId);
  const originalPolity = original ? projectPolity(sector, original.Id) : null;
  if (original && !originalPolity) return undefined;
  const hpois = system.HabitablePointsOfInterest.filter(
    (hpoi) => hpoi.ParentWorldId === worldId,
  ).map((hpoi) => projectHabitablePoi(sector, hpoi.Id));
  if (hpois.some((hpoi) => !hpoi)) return undefined;
  return {
    id: world.Id,
    name: world.NiceName,
    systemName: system.NiceName,
    kindLabel: world.Orbit.ParentObjectId ? 'Moon' : 'Planet',
    complete: Boolean(world.Culture),
    startingWorld: sector.StartingWorldId === world.Id,
    techLevel: techLevelStrings(world.InhabitedInfo.TechLevel).shortString,
    population: populationStrings(world.InhabitedInfo.Population).shortString,
    tags: world.InhabitedInfo.WorldTags.map(projectWorldTag) as CultureWorldDisplayDTO['tags'],
    originalPolity: originalPolity ?? null,
    claims,
    culture: displayedWorldCulture(sector, world),
    hpois: hpois as HabitablePoiDisplayDTO[],
  };
}

export function projectCultureScreen(sector: Sector): CultureScreenDisplayDTO | undefined {
  const worldIds = sector.Systems.flatMap((system) =>
    system.Objects.filter(
      (object) => object.Kind === 'Planet' && object.InhabitedInfo !== false,
    ).map((object) => object.Id),
  );
  const worlds = worldIds.map((id) => projectCultureWorld(sector, id));
  if (worlds.some((world) => !world)) return undefined;
  const present = worlds as CultureWorldDisplayDTO[];
  const compare = (a: PolityDisplayDTO, b: PolityDisplayDTO) =>
    a.NiceName.localeCompare(b.NiceName) || a.id.localeCompare(b.id);
  const overview = present
    .map((world) => ({
      worldId: world.id,
      worldName: world.name,
      startingWorld: world.startingWorld,
      complete: world.complete,
      originalPolity: world.originalPolity,
      currentPolities: [...world.claims.claimants].sort(compare),
    }))
    .sort(
      (a, b) =>
        Number(b.startingWorld) - Number(a.startingWorld) ||
        (a.currentPolities[0]?.NiceName ?? 'None').localeCompare(
          b.currentPolities[0]?.NiceName ?? 'None',
        ) ||
        a.worldName.localeCompare(b.worldName) ||
        a.worldId.localeCompare(b.worldId),
    );
  const compareWorldPolity = (world: CultureWorldDisplayDTO) =>
    [...world.claims.claimants].sort(compare)[0]?.NiceName ?? 'None';
  const sortedWorlds = [...present].sort(
    (a, b) =>
      Number(b.startingWorld) - Number(a.startingWorld) ||
      Number(b.complete) - Number(a.complete) ||
      compareWorldPolity(a).localeCompare(compareWorldPolity(b)) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  );
  return {
    worlds: sortedWorlds,
    overview,
  };
}
