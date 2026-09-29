import type {
  HabitablePointOfInterest,
  HabitablePointOfInterestType,
  Planet,
  Sector,
} from '../BaseDTO/merged_schema';
import { TECH_LEVEL } from '../Helpers/Domain/planet_interpretation';

export function hpoiWorld(sector: Sector, hpoi: HabitablePointOfInterest): Planet | undefined {
  return sector.Systems.flatMap((system) => system.Objects).find(
    (object): object is Planet => object.Kind === 'Planet' && object.Id === hpoi.ParentWorldId,
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
      TECH_LEVEL[home.InhabitedInfo.TechLevel] < 4
    )
      reason = 'Assigned polity below TL 4';
  } else if (world.ClaimedByPolityIds.length > 1) reason = 'Contested world';
  else if (TECH_LEVEL[world.InhabitedInfo.TechLevel] < 4) reason = 'Original polity below TL 4';
  if (!world.Complete || !world.Culture)
    return { absent: reason !== null, reason, fields: [], polityIds };
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

export function displayedWorldCulture(sector: Sector, world: Planet): typeof world.Culture {
  if (!world.Culture) return null;
  const display = structuredClone(world.Culture);
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
