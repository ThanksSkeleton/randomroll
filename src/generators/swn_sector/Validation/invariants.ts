/**
 * Executable business-rule validation for the merged SWN sector contract.
 *
 * This deliberately validates relationships and derived domain facts that
 * TypeScript interfaces cannot express. It has no dependency on generation,
 * so it is also the oracle used by Stochastic Success.
 */
import type {
  OtherCelestialObject,
  Planet,
  Sector,
  SelectableEntity,
  StarSystem,
  SystemObject,
} from '../BaseDTO/merged_schema';
import { POI_TYPES, WORLD_TAG_CONSTRAINTS } from '../Data/Raw/generation_constraints';
import { isGasPlanet, isPoiHostCompatible } from '../Helpers/Domain/poi_host_interpretation';
import {
  ATMOSPHERE_MAX_PERCENTILE,
  GAS_COMPOSITION_BY_SIZE,
  NATIVE_BIOSPHERE_MIN_PERCENTILE,
  POPULATION_HAB_REQUIRED,
  POPULATION_RANGE,
  SIZE_RANK,
  TECH_HAB_REQUIRED,
  TERRAN_BIOSPHERE_HAB_REQUIRED,
} from '../Data/Raw/tables';
import {
  ATMOSPHERE_HAB,
  BULK_COMPOSITION_HAB,
  SIZE_HAB,
  TECH_LEVEL,
  TEMPERATURE_HAB,
  TERRAN_BIOSPHERE_HAB,
} from '../Helpers/Domain/planet_interpretation';
import { capabilityFor } from '../Helpers/Domain/politics_interpretation';
import { POLITY_FLAG_COLORS } from '../Data/Raw/polity_flag_colors';
import { planetHabitability, STAR_HABITABILITY } from '../Helpers/Domain/planet_interpretation';
import {
  effectiveOrbit,
  temperatureForDirectOrbitAu,
} from '../Helpers/Domain/spatial_interpretation';
import { isPortraitIndex } from '../Helpers/Domain/portrait_index';

export interface InvariantViolation {
  RuleId: string;
  Message: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function allSelectables(sector: Sector): SelectableEntity[] {
  return [
    ...sector.Systems,
    ...sector.Systems.flatMap((system) => [
      system.Star,
      ...system.Objects,
      ...system.PointsOfInterest,
      ...system.HabitablePointsOfInterest,
    ]),
    ...sector.Routes,
    ...sector.RoutePortals,
    sector.PlayerShip,
  ];
}

function routePairKey(first: string, second: string): string {
  return [first, second].sort().join('\u0000');
}

function validatePortraitIndex(
  entity: SelectableEntity,
  fail: (ruleId: string, message: string) => void,
): void {
  const index = entity.PortraitIndex;
  if (index !== undefined && !isPortraitIndex(index))
    fail('PORTRAIT', `Entity ${entity.Id} has invalid portrait index ${index}.`);
}

/** Returns every known violation; one malformed record must not hide another. */
export function checkAllInvariants(value: unknown): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const fail = (ruleId: string, message: string): void => {
    violations.push({ RuleId: ruleId, Message: message });
  };
  const sector = validateCanonicalShape(value, fail);
  if (sector === undefined) return violations;

  checkNoUnknownSchemaProperties(sector, fail);

  const systemsById = new Map(sector.Systems.map((system) => [system.Id, system]));
  if (sector.Systems.length < 21 || sector.Systems.length > 30)
    fail('2A-04', 'A generated sector must contain 21 through 30 systems.');
  const selectables = allSelectables(sector);
  const selectableIds = selectables.map((entity) => entity.Id);
  if (new Set(selectableIds).size !== selectableIds.length)
    fail('H4', 'Selectable entity IDs must be globally unique.');
  for (const entity of selectables) {
    if (entity.NiceName.trim() === '') fail('H5', `Entity ${entity.Id} has a blank nice name.`);
    if (entity.ProceduralName.trim() === '')
      fail('H7', `Entity ${entity.Id} has a blank procedural name.`);
    validatePortraitIndex(entity, fail);
  }
  for (let index = 0; index < sector.Systems.length; index += 1) {
    const left = sector.Systems[index]!;
    for (const right of sector.Systems.slice(index + 1)) {
      if (left.ProceduralName === right.ProceduralName && left.NiceName === right.NiceName) {
        fail('A9', `Systems ${left.Id} and ${right.Id} have indistinguishable names.`);
      }
    }
  }

  const containingSystemByObjectId = new Map<string, StarSystem>();
  const occupiedHexes = new Set<string>();
  for (const system of sector.Systems) {
    if (
      !Number.isInteger(system.HexLocation.Column) ||
      system.HexLocation.Column < 1 ||
      system.HexLocation.Column > 11 ||
      !Number.isInteger(system.HexLocation.Row) ||
      system.HexLocation.Row < 1 ||
      system.HexLocation.Row > 7
    ) {
      fail('A1', `System ${system.Id} has an out-of-bounds hex location.`);
    }
    if (system.Objects.length === 0) fail('A8', `System ${system.Id} has no orbiting objects.`);
    const inhabitedCount = system.Objects.filter(
      (object): object is Planet => object.Kind === 'Planet' && object.InhabitedInfo !== false,
    ).length;
    if (inhabitedCount < 1 || inhabitedCount > 2)
      fail(
        '2A-10',
        `System ${system.Id} has ${inhabitedCount} inhabited worlds; expected one or two.`,
      );
    const extraObjectCount = system.Objects.length - inhabitedCount;
    const maxExtraObjectCount = 5 - inhabitedCount;
    if (extraObjectCount < 2 || extraObjectCount > maxExtraObjectCount)
      fail(
        '2A-35',
        `System ${system.Id} has ${extraObjectCount} extra objects; expected two through ${maxExtraObjectCount} (five total objects maximum).`,
      );
    if (system.PointsOfInterest.length < 2 || system.PointsOfInterest.length > 5)
      fail(
        '2A-36',
        `System ${system.Id} has ${system.PointsOfInterest.length} POIs; expected two through five.`,
      );
    const hex = `${system.HexLocation.Column},${system.HexLocation.Row}`;
    if (occupiedHexes.has(hex))
      fail('2A-07', `System ${system.Id} shares hex ${hex} with another system.`);
    occupiedHexes.add(hex);
    for (const object of system.Objects) containingSystemByObjectId.set(object.Id, system);
    validateSystem(system, systemsById, fail);
  }

  validateRoutes(sector, systemsById, fail);
  validateRouteDependentTags(sector, fail);
  validatePolitics(sector, fail);

  const allowedShipLocations = new Set(selectableIds);
  allowedShipLocations.delete(sector.PlayerShip.Id);
  if (!allowedShipLocations.has(sector.PlayerShip.CurrentLocationId)) {
    fail(
      'H1',
      `Player ship location ${sector.PlayerShip.CurrentLocationId} is not an allowed entity.`,
    );
  }

  // A POI parent can only be an object in the same system, never another entity kind.
  for (const system of sector.Systems) {
    const objectsById = new Map(system.Objects.map((object) => [object.Id, object]));
    for (const object of system.Objects) {
      if (object.Kind !== 'Planet' || object.InhabitedInfo === false) continue;
      if (object.Complete !== Boolean(object.Culture))
        fail('CULTURE', `World ${object.Id} has inconsistent Complete and Culture values.`);
      if (
        object.Culture &&
        (object.Culture.worldTags?.[0] !== object.InhabitedInfo.WorldTags[0] ||
          object.Culture.worldTags?.[1] !== object.InhabitedInfo.WorldTags[1])
      )
        fail('CULTURE', `World ${object.Id} culture tags differ from its World Tags.`);
      const hpois = system.HabitablePointsOfInterest.filter(
        (hpoi) => hpoi.ParentWorldId === object.Id,
      );
      for (const type of ['Orbital Station', 'Starport', 'Planetary Defenses'] as const)
        if (
          hpois.filter((hpoi) => hpoi.HPOIType === type && hpoi.AssignedPolityId === null)
            .length !== 1
        )
          fail('HPOI', `World ${object.Id} requires one ${type} HPOI.`);
      const garrisons = hpois.filter((hpoi) => hpoi.HPOIType === 'Garrison');
      if (
        garrisons.length !== object.ClaimedByPolityIds.length ||
        garrisons.some(
          (hpoi) =>
            !hpoi.AssignedPolityId || !object.ClaimedByPolityIds.includes(hpoi.AssignedPolityId),
        ) ||
        new Set(garrisons.map((hpoi) => hpoi.AssignedPolityId)).size !== garrisons.length
      )
        fail('HPOI', `World ${object.Id} Garrisons do not match its surviving claims.`);
    }
    for (const hpoi of system.HabitablePointsOfInterest) {
      const parent = objectsById.get(hpoi.ParentWorldId);
      if (!parent || parent.Kind !== 'Planet' || parent.InhabitedInfo === false)
        fail('HPOI', `HPOI ${hpoi.Id} has no inhabited parent in its system.`);
      if (
        !['Orbital Station', 'Starport', 'Planetary Defenses', 'Garrison'].includes(hpoi.HPOIType)
      )
        fail('HPOI', `HPOI ${hpoi.Id} has an unknown type.`);
      if (hpoi.HPOIType !== 'Garrison' && hpoi.AssignedPolityId !== null)
        fail('HPOI', `HPOI ${hpoi.Id} has an unexpected polity assignment.`);
      if (!isFiniteNumber(hpoi.AngleDegrees) || hpoi.AngleDegrees < 0 || hpoi.AngleDegrees >= 360)
        fail('HPOI', `HPOI ${hpoi.Id} has an invalid angle.`);
      if (hpoi.PortraitIndex !== undefined)
        fail('HPOI', `HPOI ${hpoi.Id} must use NO DATA portrait.`);
    }
    for (const poi of system.PointsOfInterest) {
      const parent = objectsById.get(poi.ParentObjectId);
      if (parent === undefined) {
        const containing = containingSystemByObjectId.get(poi.ParentObjectId);
        fail(
          containing === undefined ? 'F1' : 'F2',
          `POI ${poi.Id} has an invalid parent ${poi.ParentObjectId}.`,
        );
        continue;
      }
      if (parent.Kind === 'Planet' && parent.InhabitedInfo !== false)
        fail('F4', `POI ${poi.Id} is attached to inhabited planet ${parent.Id}.`);
      if (
        parent.Kind === 'Planet' &&
        isGasPlanet(parent) &&
        system.Objects.some(
          (object) =>
            object.Kind === 'Planet' &&
            object.Orbit.ParentObjectId === parent.Id &&
            object.InhabitedInfo !== false,
        )
      ) {
        fail('F5', `POI ${poi.Id} is attached to gas giant ${parent.Id} with an inhabited moon.`);
      }
      if (!POI_TYPES.has(poi.POIType))
        fail('F9', `POI ${poi.Id} has an unknown type ${poi.POIType}.`);
      else if (!isPoiHostCompatible(poi.POIType, parent))
        fail(
          'F13',
          `POI ${poi.Id} of type ${poi.POIType} is incompatible with parent ${parent.Id}.`,
        );
      if (!isFiniteNumber(poi.AngleDegrees) || poi.AngleDegrees < 0 || poi.AngleDegrees >= 360) {
        fail('F15', `POI ${poi.Id} has invalid angle ${poi.AngleDegrees}; expected [0, 360).`);
      }
    }
    for (const object of system.Objects) {
      if (system.PointsOfInterest.filter((poi) => poi.ParentObjectId === object.Id).length > 3)
        fail('F10', `Object ${object.Id} has more than three POIs.`);
      if (object.Kind === 'OtherCelestialObject' && object.ObjectType === 'IndependentStation') {
        const stationPois = system.PointsOfInterest.filter(
          (poi) => poi.ParentObjectId === object.Id,
        );
        if (stationPois.length !== 1 || stationPois[0]?.POIType !== 'Deep-space station')
          fail(
            'F14',
            `Independent station ${object.Id} must host exactly one Deep-space station POI.`,
          );
      }
    }
  }

  return violations;
}

function validatePolitics(sector: Sector, fail: (ruleId: string, message: string) => void): void {
  const inhabitedWorlds = sector.Systems.flatMap((system) =>
    system.Objects.filter(
      (object): object is Planet => object.Kind === 'Planet' && object.InhabitedInfo !== false,
    ),
  );
  const inhabitedById = new Map(inhabitedWorlds.map((world) => [world.Id, world]));
  const polityById = new Map(sector.Polities.map((polity) => [polity.Id, polity]));
  if (polityById.size !== sector.Polities.length) fail('P1', 'Polity IDs must be unique.');
  if (new Set(sector.Polities.map((polity) => polity.HomeworldId)).size !== sector.Polities.length)
    fail('P1', 'Each polity must have a distinct homeworld.');
  if (sector.Polities.length !== inhabitedWorlds.length)
    fail('P1', 'Every inhabited world must produce exactly one polity.');

  for (const polity of sector.Polities) {
    const homeworld = inhabitedById.get(polity.HomeworldId);
    if (!homeworld || homeworld.InhabitedInfo === false) {
      fail('P1', `Polity ${polity.Id} has an invalid homeworld ${polity.HomeworldId}.`);
      continue;
    }
    const expected = capabilityFor(
      homeworld.InhabitedInfo.TechLevel,
      homeworld.InhabitedInfo.Population,
    );
    if (
      polity.Attack !== expected.Attack ||
      polity.Defense !== expected.Defense ||
      polity.Projection !== expected.Projection
    )
      fail('P2', `Polity ${polity.Id} has capability values inconsistent with its homeworld.`);
    if (
      !/^#[0-9a-f]{6}$/i.test(polity.Flag.FieldColor) ||
      !POLITY_FLAG_COLORS.includes(polity.Flag.CircleColor) ||
      polity.Flag.FieldColor === polity.Flag.CircleColor ||
      sector.Polities.some(
        (candidate) =>
          candidate.Id !== polity.Id && candidate.Flag.FieldColor === polity.Flag.FieldColor,
      )
    )
      fail('P6', `Polity ${polity.Id} has invalid flag colors.`);
  }

  for (const system of sector.Systems)
    for (const object of system.Objects) {
      if (new Set(object.ClaimedByPolityIds).size !== object.ClaimedByPolityIds.length)
        fail('P3', `Object ${object.Id} contains duplicate political claims.`);
      for (const polityId of object.ClaimedByPolityIds)
        if (!polityById.has(polityId))
          fail('P3', `Object ${object.Id} references missing polity ${polityId}.`);
      const native = sector.Polities.find((polity) => polity.HomeworldId === object.Id);
      if (
        native &&
        object.ClaimedByPolityIds.includes(native.Id) &&
        (object.ClaimedByPolityIds.length !== 1 || object.ClaimedByPolityIds[0] !== native.Id)
      )
        fail('P4', `Native polity ${native.Id} must exclusively control its surviving homeworld.`);
    }

  const eventIds = new Set<string>();
  for (const event of sector.ConquestEvents) {
    if (eventIds.has(event.Id)) fail('P5', `Conquest event ID ${event.Id} is duplicated.`);
    eventIds.add(event.Id);
    const attacker = polityById.get(event.AttackerPolityId);
    const defender = polityById.get(event.DefenderPolityId);
    if (!attacker || !defender) {
      fail('P5', `Conquest event ${event.Id} references a missing polity.`);
      continue;
    }
    if (defender.HomeworldId !== event.TargetWorldId)
      fail('P5', `Conquest event ${event.Id} does not target the defender's homeworld.`);
    if (
      event.Attack !== attacker.Attack ||
      event.Defense !== defender.Defense ||
      event.Outcome !== (event.Attack > event.Defense ? 'CONQUEST' : 'DEFENSE') ||
      !Number.isInteger(event.RouteDistance) ||
      event.RouteDistance < 0 ||
      event.RouteDistance > attacker.Projection
    )
      fail('P5', `Conquest event ${event.Id} has inconsistent resolution data.`);
  }
}

function validateCanonicalShape(
  value: unknown,
  fail: (ruleId: string, message: string) => void,
): Sector | undefined {
  const invalid = (path: string, expected: string): false => {
    fail('SCHEMA', `${path} must be ${expected}.`);
    return false;
  };
  const record = (item: unknown, path: string): item is Record<string, unknown> =>
    (typeof item === 'object' && item !== null && !Array.isArray(item)) ||
    invalid(path, 'an object');
  const string = (item: unknown, path: string): item is string =>
    typeof item === 'string' || invalid(path, 'a string');
  const number = (item: unknown, path: string): item is number =>
    isFiniteNumber(item) || invalid(path, 'a finite number');
  const array = (item: unknown, path: string): item is unknown[] =>
    Array.isArray(item) || invalid(path, 'an array');
  const required = (
    item: Record<string, unknown>,
    keys: readonly string[],
    path: string,
  ): boolean => keys.every((key) => key in item || invalid(`${path}.${key}`, 'present'));
  const selectable = (item: unknown, path: string): item is Record<string, unknown> => {
    if (
      !record(item, path) ||
      !required(item, ['Id', 'ProceduralName', 'NiceName', 'Visibility', 'Intelligence'], path)
    )
      return false;
    if (
      !string(item.Id, `${path}.Id`) ||
      !string(item.ProceduralName, `${path}.ProceduralName`) ||
      !string(item.NiceName, `${path}.NiceName`) ||
      !record(item.Visibility, `${path}.Visibility`) ||
      !record(item.Intelligence, `${path}.Intelligence`)
    )
      return false;
    if (item.PortraitIndex !== undefined && !number(item.PortraitIndex, `${path}.PortraitIndex`))
      return false;
    const intelligence = item.Intelligence;
    const visibility = item.Visibility;
    const validVisibility =
      typeof visibility.BasicScan === 'boolean' &&
      typeof visibility.DetailedScan === 'boolean' &&
      typeof visibility.PoliticsScan === 'boolean' &&
      typeof visibility.DeepPoliticsScan === 'boolean' &&
      (!visibility.DetailedScan || visibility.BasicScan) &&
      (!visibility.PoliticsScan || visibility.BasicScan) &&
      (!visibility.DeepPoliticsScan || visibility.PoliticsScan);
    return (
      validVisibility &&
      [
        'InfoboxSummary',
        'BasicScan',
        'DetailedScan',
        'PoliticsScan',
        'DeepPoliticsScan',
        'GM',
      ].every((key) => string(intelligence[key], `${path}.Intelligence.${key}`))
    );
  };
  const orbit = (item: unknown, path: string): boolean => {
    if (
      !record(item, path) ||
      !required(item, ['AngleDegrees', 'ParentObjectId'], path) ||
      !number(item.AngleDegrees, `${path}.AngleDegrees`)
    )
      return false;
    return item.ParentObjectId === null
      ? required(item, ['AU'], path) && number(item.AU, `${path}.AU`)
      : string(item.ParentObjectId, `${path}.ParentObjectId`);
  };
  const object = (item: unknown, path: string): boolean => {
    if (
      !selectable(item, path) ||
      !required(item, ['Orbit', 'ClaimedByPolityIds', 'Kind'], path) ||
      !orbit(item.Orbit, `${path}.Orbit`) ||
      !array(item.ClaimedByPolityIds, `${path}.ClaimedByPolityIds`) ||
      !item.ClaimedByPolityIds.every((id, index) =>
        string(id, `${path}.ClaimedByPolityIds[${index}]`),
      ) ||
      !string(item.Kind, `${path}.Kind`)
    )
      return false;
    if (item.Kind === 'OtherCelestialObject')
      return required(item, ['ObjectType'], path) && string(item.ObjectType, `${path}.ObjectType`);
    if (
      item.Kind !== 'Planet' ||
      !required(
        item,
        [
          'Size',
          'BulkComposition',
          'SurfaceWaterPresent',
          'Atmosphere',
          'NativeBiosphere',
          'InhabitedInfo',
        ],
        path,
      )
    )
      return invalid(`${path}.Kind`, 'Planet or OtherCelestialObject');
    if (
      !string(item.Size, `${path}.Size`) ||
      !string(item.BulkComposition, `${path}.BulkComposition`) ||
      typeof item.SurfaceWaterPresent !== 'boolean' ||
      !string(item.Atmosphere, `${path}.Atmosphere`) ||
      !string(item.NativeBiosphere, `${path}.NativeBiosphere`)
    )
      return invalid(path, 'a complete Planet');
    if (item.InhabitedInfo === false)
      return item.Complete === undefined && item.Culture === undefined;
    return (
      required(item, ['Complete', 'Culture'], path) &&
      typeof item.Complete === 'boolean' &&
      (item.Complete ? record(item.Culture, `${path}.Culture`) : item.Culture === null) &&
      record(item.InhabitedInfo, `${path}.InhabitedInfo`) &&
      required(
        item.InhabitedInfo,
        ['WorldTags', 'TerranBiosphere', 'Population', 'TechLevel'],
        `${path}.InhabitedInfo`,
      ) &&
      array(item.InhabitedInfo.WorldTags, `${path}.InhabitedInfo.WorldTags`) &&
      item.InhabitedInfo.WorldTags.length === 2 &&
      item.InhabitedInfo.WorldTags.every((tag, index) =>
        string(tag, `${path}.InhabitedInfo.WorldTags[${index}]`),
      ) &&
      string(item.InhabitedInfo.TerranBiosphere, `${path}.InhabitedInfo.TerranBiosphere`) &&
      string(item.InhabitedInfo.Population, `${path}.InhabitedInfo.Population`) &&
      string(item.InhabitedInfo.TechLevel, `${path}.InhabitedInfo.TechLevel`)
    );
  };
  if (
    !record(value, 'Sector') ||
    !required(
      value,
      [
        'SchemaVersion',
        'OriginalSeed',
        'StartingWorldMode',
        'StartingWorldId',
        'SectorName',
        'Systems',
        'Routes',
        'RoutePortals',
        'Polities',
        'ConquestEvents',
        'PlayerShip',
      ],
      'Sector',
    ) ||
    value.SchemaVersion !== 'merged-v6' ||
    !string(value.OriginalSeed, 'Sector.OriginalSeed') ||
    !['UNRESTRICTED', 'TL4_PLUS', 'TL4_PLUS_POP_GT_500'].includes(
      String(value.StartingWorldMode),
    ) ||
    !(value.StartingWorldId === null || string(value.StartingWorldId, 'Sector.StartingWorldId')) ||
    !string(value.SectorName, 'Sector.SectorName') ||
    !array(value.Systems, 'Sector.Systems') ||
    !array(value.Routes, 'Sector.Routes') ||
    !array(value.RoutePortals, 'Sector.RoutePortals') ||
    !array(value.Polities, 'Sector.Polities') ||
    !array(value.ConquestEvents, 'Sector.ConquestEvents') ||
    !selectable(value.PlayerShip, 'Sector.PlayerShip') ||
    !string(value.PlayerShip.CurrentLocationId, 'Sector.PlayerShip.CurrentLocationId')
  )
    return undefined;
  for (const [index, system] of value.Systems.entries()) {
    const path = `Sector.Systems[${index}]`;
    if (
      !selectable(system, path) ||
      !required(
        system,
        ['HexLocation', 'Star', 'Objects', 'PointsOfInterest', 'HabitablePointsOfInterest'],
        path,
      ) ||
      !record(system.HexLocation, `${path}.HexLocation`) ||
      !number(system.HexLocation.Column, `${path}.HexLocation.Column`) ||
      !number(system.HexLocation.Row, `${path}.HexLocation.Row`) ||
      !selectable(system.Star, `${path}.Star`) ||
      !string(system.Star.StarType, `${path}.Star.StarType`) ||
      !array(system.Objects, `${path}.Objects`) ||
      !array(system.PointsOfInterest, `${path}.PointsOfInterest`) ||
      !array(system.HabitablePointsOfInterest, `${path}.HabitablePointsOfInterest`) ||
      !system.Objects.every((item, objectIndex) => object(item, `${path}.Objects[${objectIndex}]`))
    )
      return undefined;
    for (const [poiIndex, poi] of system.PointsOfInterest.entries())
      if (
        !selectable(poi, `${path}.PointsOfInterest[${poiIndex}]`) ||
        !string(poi.ParentObjectId, `${path}.PointsOfInterest[${poiIndex}].ParentObjectId`) ||
        !string(poi.POIType, `${path}.PointsOfInterest[${poiIndex}].POIType`) ||
        !number(poi.AngleDegrees, `${path}.PointsOfInterest[${poiIndex}].AngleDegrees`)
      )
        return undefined;
    for (const [hpoiIndex, hpoi] of system.HabitablePointsOfInterest.entries()) {
      const hpoiPath = `${path}.HabitablePointsOfInterest[${hpoiIndex}]`;
      if (
        !selectable(hpoi, hpoiPath) ||
        !string(hpoi.ParentWorldId, `${hpoiPath}.ParentWorldId`) ||
        !string(hpoi.HPOIType, `${hpoiPath}.HPOIType`) ||
        !(
          hpoi.AssignedPolityId === null ||
          string(hpoi.AssignedPolityId, `${hpoiPath}.AssignedPolityId`)
        ) ||
        !number(hpoi.AngleDegrees, `${hpoiPath}.AngleDegrees`)
      )
        return undefined;
    }
  }
  for (const [index, route] of value.Routes.entries())
    if (
      !selectable(route, `Sector.Routes[${index}]`) ||
      !array(route.PortalIds, `Sector.Routes[${index}].PortalIds`) ||
      route.PortalIds.length !== 2 ||
      !route.PortalIds.every((id, portalIndex) =>
        string(id, `Sector.Routes[${index}].PortalIds[${portalIndex}]`),
      )
    )
      return undefined;
  for (const [index, portal] of value.RoutePortals.entries())
    if (
      !selectable(portal, `Sector.RoutePortals[${index}]`) ||
      !string(portal.SystemId, `Sector.RoutePortals[${index}].SystemId`) ||
      !number(portal.BoundaryAngleDegrees, `Sector.RoutePortals[${index}].BoundaryAngleDegrees`)
    )
      return undefined;
  for (const [index, polity] of value.Polities.entries()) {
    const path = `Sector.Polities[${index}]`;
    if (
      !record(polity, path) ||
      !required(
        polity,
        ['Id', 'NiceName', 'HomeworldId', 'Attack', 'Defense', 'Projection', 'Flag'],
        path,
      ) ||
      !string(polity.Id, `${path}.Id`) ||
      !string(polity.NiceName, `${path}.NiceName`) ||
      !string(polity.HomeworldId, `${path}.HomeworldId`) ||
      !number(polity.Attack, `${path}.Attack`) ||
      !number(polity.Defense, `${path}.Defense`) ||
      !number(polity.Projection, `${path}.Projection`) ||
      !record(polity.Flag, `${path}.Flag`) ||
      !required(polity.Flag, ['FieldColor', 'CircleColor'], `${path}.Flag`) ||
      !string(polity.Flag.FieldColor, `${path}.Flag.FieldColor`) ||
      !string(polity.Flag.CircleColor, `${path}.Flag.CircleColor`)
    )
      return undefined;
  }
  for (const [index, event] of value.ConquestEvents.entries()) {
    const path = `Sector.ConquestEvents[${index}]`;
    if (
      !record(event, path) ||
      !required(
        event,
        [
          'Id',
          'AttackerPolityId',
          'DefenderPolityId',
          'TargetWorldId',
          'RouteDistance',
          'Attack',
          'Defense',
          'Outcome',
        ],
        path,
      ) ||
      !string(event.Id, `${path}.Id`) ||
      !string(event.AttackerPolityId, `${path}.AttackerPolityId`) ||
      !string(event.DefenderPolityId, `${path}.DefenderPolityId`) ||
      !string(event.TargetWorldId, `${path}.TargetWorldId`) ||
      !number(event.RouteDistance, `${path}.RouteDistance`) ||
      !number(event.Attack, `${path}.Attack`) ||
      !number(event.Defense, `${path}.Defense`) ||
      !['CONQUEST', 'DEFENSE'].includes(String(event.Outcome))
    )
      return undefined;
  }
  return value as unknown as Sector;
}

function checkNoUnknownSchemaProperties(
  sector: Sector,
  fail: (ruleId: string, message: string) => void,
): void {
  const check = (value: object, allowed: readonly string[], path: string): void => {
    for (const key of Object.keys(value))
      if (!allowed.includes(key)) fail('2A-09', `${path} contains unknown property ${key}.`);
  };
  const selectable = [
    'Id',
    'ProceduralName',
    'NiceName',
    'Visibility',
    'Intelligence',
    'PortraitIndex',
  ];
  const checkSelectable = (entity: SelectableEntity, path: string): void => {
    check(
      entity.Visibility,
      ['BasicScan', 'DetailedScan', 'PoliticsScan', 'DeepPoliticsScan'],
      `${path}.Visibility`,
    );
    check(
      entity.Intelligence,
      ['InfoboxSummary', 'BasicScan', 'DetailedScan', 'PoliticsScan', 'DeepPoliticsScan', 'GM'],
      `${path}.Intelligence`,
    );
  };
  check(
    sector,
    [
      'SchemaVersion',
      'OriginalSeed',
      'StartingWorldMode',
      'StartingWorldId',
      'SectorName',
      'Systems',
      'Routes',
      'RoutePortals',
      'Polities',
      'ConquestEvents',
      'PlayerShip',
    ],
    'Sector',
  );
  checkSelectable(sector.PlayerShip, 'PlayerShip');
  check(sector.PlayerShip, [...selectable, 'CurrentLocationId'], 'PlayerShip');
  for (const polity of sector.Polities)
    check(
      polity,
      ['Id', 'NiceName', 'HomeworldId', 'Attack', 'Defense', 'Projection', 'Flag'],
      `Polity ${polity.Id}`,
    );
  for (const polity of sector.Polities)
    check(polity.Flag, ['FieldColor', 'CircleColor'], `Polity ${polity.Id}.Flag`);
  for (const event of sector.ConquestEvents)
    check(
      event,
      [
        'Id',
        'AttackerPolityId',
        'DefenderPolityId',
        'TargetWorldId',
        'RouteDistance',
        'Attack',
        'Defense',
        'Outcome',
      ],
      `ConquestEvent ${event.Id}`,
    );
  for (const route of sector.Routes) {
    checkSelectable(route, `Route ${route.Id}`);
    check(route, [...selectable, 'PortalIds'], `Route ${route.Id}`);
  }
  for (const portal of sector.RoutePortals) {
    checkSelectable(portal, `RoutePortal ${portal.Id}`);
    check(portal, [...selectable, 'SystemId', 'BoundaryAngleDegrees'], `RoutePortal ${portal.Id}`);
  }
  for (const system of sector.Systems) {
    checkSelectable(system, `System ${system.Id}`);
    check(
      system,
      [
        ...selectable,
        'HexLocation',
        'Star',
        'Objects',
        'PointsOfInterest',
        'HabitablePointsOfInterest',
      ],
      `System ${system.Id}`,
    );
    check(system.HexLocation, ['Column', 'Row'], `System ${system.Id}.HexLocation`);
    checkSelectable(system.Star, `Star ${system.Star.Id}`);
    check(system.Star, [...selectable, 'StarType'], `Star ${system.Star.Id}`);
    for (const object of system.Objects) {
      checkSelectable(object, `Object ${object.Id}`);
      check(
        object.Orbit,
        object.Orbit.ParentObjectId === null
          ? ['AU', 'AngleDegrees', 'ParentObjectId']
          : ['AngleDegrees', 'ParentObjectId'],
        `Object ${object.Id}.Orbit`,
      );
      if (object.Kind === 'Planet') {
        check(
          object,
          [
            ...selectable,
            'Orbit',
            'Kind',
            'Size',
            'BulkComposition',
            'SurfaceWaterPresent',
            'Atmosphere',
            'NativeBiosphere',
            'ClaimedByPolityIds',
            'InhabitedInfo',
            'Complete',
            'Culture',
            'PortraitIndex',
          ],
          `Planet ${object.Id}`,
        );
        if (object.InhabitedInfo !== false)
          check(
            object.InhabitedInfo,
            ['WorldTags', 'TerranBiosphere', 'Population', 'TechLevel'],
            `Planet ${object.Id}.InhabitedInfo`,
          );
      } else
        check(
          object,
          [...selectable, 'Orbit', 'ClaimedByPolityIds', 'Kind', 'ObjectType'],
          `OtherCelestialObject ${object.Id}`,
        );
    }
    for (const poi of system.PointsOfInterest) {
      checkSelectable(poi, `POI ${poi.Id}`);
      check(poi, [...selectable, 'ParentObjectId', 'POIType', 'AngleDegrees'], `POI ${poi.Id}`);
    }
    for (const hpoi of system.HabitablePointsOfInterest) {
      checkSelectable(hpoi, `HPOI ${hpoi.Id}`);
      check(
        hpoi,
        [...selectable, 'ParentWorldId', 'HPOIType', 'AssignedPolityId', 'AngleDegrees'],
        `HPOI ${hpoi.Id}`,
      );
    }
  }
}

function validateRouteDependentTags(
  sector: Sector,
  fail: (ruleId: string, message: string) => void,
): void {
  const connectedSystemIds = new Set(sector.RoutePortals.map((portal) => portal.SystemId));
  for (const system of sector.Systems) {
    for (const object of system.Objects) {
      if (object.Kind !== 'Planet' || object.InhabitedInfo === false) continue;
      const tags = object.InhabitedInfo.WorldTags;
      if (tags.includes('Trade Hub') && !connectedSystemIds.has(system.Id))
        fail('E10', `Trade Hub ${object.Id} is in a system without a route.`);
      if (tags.includes('Regional Hegemon') && !connectedSystemIds.has(system.Id))
        fail('G10', `Regional Hegemon ${object.Id} is in a system without a route.`);
    }
  }
}

function validateSystem(
  system: StarSystem,
  systemsById: ReadonlyMap<string, StarSystem>,
  fail: (ruleId: string, message: string) => void,
): void {
  const objectsById = new Map(system.Objects.map((object) => [object.Id, object]));
  const directObjects = system.Objects.filter((object) => object.Orbit.ParentObjectId === null);
  if (directObjects.length === 0) fail('B14', `System ${system.Id} has no direct-orbit object.`);
  const directAus = new Set<number>();
  for (const object of directObjects) {
    if (object.Orbit.ParentObjectId !== null) continue;
    const au = object.Orbit.AU;
    if (!isFiniteNumber(au) || au < 0)
      fail('B1', `Direct-orbit object ${object.Id} has invalid AU.`);
    else if (directAus.has(au))
      fail('B5', `Direct-orbit object ${object.Id} shares an AU with another object.`);
    else directAus.add(au);
    if (isFiniteNumber(au)) {
      try {
        temperatureForDirectOrbitAu(system.Star.StarType, au);
      } catch {
        fail(
          object.Kind === 'Planet' && object.InhabitedInfo !== false ? 'C2' : 'F12',
          `Direct object ${object.Id} has AU ${au} outside every exclusive temperature band.`,
        );
      }
    }
  }
  for (const object of system.Objects) {
    if (
      !isFiniteNumber(object.Orbit.AngleDegrees) ||
      object.Orbit.AngleDegrees < 0 ||
      object.Orbit.AngleDegrees >= 360
    )
      fail('B4', `Object ${object.Id} has invalid orbit angle.`);
    const parentId = object.Orbit.ParentObjectId;
    if (parentId === object.Id) fail('B9', `Object ${object.Id} is its own parent.`);
    if (parentId !== null && !objectsById.has(parentId)) {
      const otherSystem = [...systemsById.values()].some((candidate) =>
        candidate.Objects.some((candidateObject) => candidateObject.Id === parentId),
      );
      fail(otherSystem ? 'B8' : 'B7', `Object ${object.Id} has an invalid parent ${parentId}.`);
    }
  }

  for (const object of system.Objects) {
    const visited = new Set<string>();
    let parentId = object.Orbit.ParentObjectId;
    while (parentId !== null) {
      if (visited.has(parentId)) {
        fail('B10', `Object ${object.Id} has a cyclic parent chain.`);
        break;
      }
      visited.add(parentId);
      parentId = objectsById.get(parentId)?.Orbit.ParentObjectId ?? null;
    }
  }

  for (const object of system.Objects) validateObject(object, objectsById, system, fail);
}

function validateObject(
  object: SystemObject,
  objectsById: ReadonlyMap<string, SystemObject>,
  system: StarSystem,
  fail: (ruleId: string, message: string) => void,
): void {
  const parent =
    object.Orbit.ParentObjectId === null ? undefined : objectsById.get(object.Orbit.ParentObjectId);
  if (object.Kind === 'OtherCelestialObject') {
    validateOtherObject(object, parent, effectiveOrbit(system, object.Id)?.temperature, fail);
    return;
  }
  const planet = object;
  const expectedGasComposition = GAS_COMPOSITION_BY_SIZE[planet.Size];
  if (expectedGasComposition !== undefined && planet.BulkComposition !== expectedGasComposition)
    fail('C7', `Gas giant ${planet.Id} has incompatible bulk composition.`);
  if (
    expectedGasComposition === undefined &&
    (planet.BulkComposition === 'Jovian Gas' || planet.BulkComposition === 'Neptunian Gas')
  )
    fail('C6', `Rocky planet ${planet.Id} has gas-giant composition.`);
  if (isGasPlanet(planet) && planet.SurfaceWaterPresent)
    fail('C8', `Gas giant ${planet.Id} has surface water.`);
  if (isGasPlanet(planet) && planet.InhabitedInfo !== false)
    fail('D12', `Gas giant ${planet.Id} is inhabited.`);
  if (
    effectiveOrbit(system, planet.Id)?.temperature === 'Cryogenic' ||
    effectiveOrbit(system, planet.Id)?.temperature === 'Furance' ||
    planet.Atmosphere === 'Vacuum'
  ) {
    if (planet.SurfaceWaterPresent)
      fail('2A-28a', `Planet ${planet.Id} has surface water despite an overriding environment.`);
  } else if (planet.BulkComposition === 'Water') {
    if (!planet.SurfaceWaterPresent)
      fail('2A-28c', `Water-composition planet ${planet.Id} lacks surface water.`);
  }
  if (planet.InhabitedInfo !== false) validateInhabitedPlanet(planet, system, fail);
  if (parent !== undefined) {
    if (parent.Kind !== 'Planet') fail('B12', `Planet ${planet.Id} orbits a non-planet object.`);
    else {
      const moonCount = [...objectsById.values()].filter(
        (candidate) => candidate.Kind === 'Planet' && candidate.Orbit.ParentObjectId === parent.Id,
      ).length;
      if (moonCount > 2) fail('B18', `Planet ${parent.Id} has more than two moons.`);
      if (parent.Orbit.ParentObjectId !== null)
        fail('B16', `Moon ${planet.Id} has a moon of its own.`);
      if (SIZE_RANK[planet.Size] >= SIZE_RANK[parent.Size])
        fail('B17', `Moon ${planet.Id} is not smaller than parent ${parent.Id}.`);
    }
  }
}

function validateInhabitedPlanet(
  planet: Planet,
  system: StarSystem,
  fail: (ruleId: string, message: string) => void,
): void {
  const inhabited = planet.InhabitedInfo;
  if (inhabited === false) return;
  const [firstTag, secondTag] = inhabited.WorldTags;
  if (firstTag === secondTag)
    fail('2A-13', `Inhabited planet ${planet.Id} has duplicate world tags.`);
  const temperature = effectiveOrbit(system, planet.Id)?.temperature;
  if (!temperature) return;
  const totalHab = planetHabitability(
    planet,
    STAR_HABITABILITY[system.Star.StarType],
    temperature,
  )!;
  if (totalHab < POPULATION_HAB_REQUIRED[inhabited.Population])
    fail('2A-22a', `Planet ${planet.Id} lacks habitability for its population.`);
  if (totalHab < TECH_HAB_REQUIRED[inhabited.TechLevel])
    fail('2A-22b', `Planet ${planet.Id} lacks habitability for its technology.`);
  if (totalHab < TERRAN_BIOSPHERE_HAB_REQUIRED[inhabited.TerranBiosphere])
    fail('2A-22c', `Planet ${planet.Id} lacks habitability for its Terran biosphere.`);
  const environmentalHab = Math.min(
    ATMOSPHERE_HAB[planet.Atmosphere],
    TEMPERATURE_HAB[temperature],
    TERRAN_BIOSPHERE_HAB[inhabited.TerranBiosphere],
    SIZE_HAB[planet.Size],
    BULK_COMPOSITION_HAB[planet.BulkComposition],
  );
  if (
    (firstTag === 'Oceanic World' ||
      firstTag === 'Seagoing Cities' ||
      secondTag === 'Oceanic World' ||
      secondTag === 'Seagoing Cities') &&
    !planet.SurfaceWaterPresent
  ) {
    fail('2A-28d', `Water-world tag on ${planet.Id} requires surface water.`);
  }
  if (
    (firstTag === 'Heavy Industry' ||
      firstTag === 'Major Spaceyard' ||
      firstTag === 'Post-Scarcity' ||
      secondTag === 'Heavy Industry' ||
      secondTag === 'Major Spaceyard' ||
      secondTag === 'Post-Scarcity') &&
    TECH_LEVEL[inhabited.TechLevel] < 3
  ) {
    fail('E6', `Industry tag on ${planet.Id} requires non-primitive technology.`);
  }
  if (firstTag === 'Outpost World' || secondTag === 'Outpost World') {
    if (inhabited.Population === 'Billions of inhabitants')
      fail('E8', `Outpost world ${planet.Id} has billions of inhabitants.`);
  }
  if ((firstTag === 'Desert World' || secondTag === 'Desert World') && planet.SurfaceWaterPresent) {
    fail('E2', `Desert World ${planet.Id} has surface water.`);
  }
  if (
    (firstTag === 'Tomb World' ||
      firstTag === 'Abandoned Colony' ||
      secondTag === 'Tomb World' ||
      secondTag === 'Abandoned Colony') &&
    inhabited.Population !== 'Fewer than 500'
  ) {
    fail('E9', `Tomb World or Abandoned Colony ${planet.Id} must have rank-1 population.`);
  }
  for (const tag of inhabited.WorldTags) {
    const constraint = WORLD_TAG_CONSTRAINTS.get(tag);
    if (constraint === undefined) continue;
    const [populationMin, populationMax] = POPULATION_RANGE[inhabited.Population];
    if (
      constraint.maxEnvironmentalHab !== undefined &&
      environmentalHab > constraint.maxEnvironmentalHab
    )
      fail('2A-19a', `Tag ${tag} requires lower environmental habitability on ${planet.Id}.`);
    if (
      constraint.maxAtmospherePercentile !== undefined &&
      ATMOSPHERE_MAX_PERCENTILE[planet.Atmosphere] > constraint.maxAtmospherePercentile
    )
      fail('2A-19a', `Tag ${tag} is incompatible with atmosphere on ${planet.Id}.`);
    if (
      constraint.minNativeBiospherePercentile !== undefined &&
      NATIVE_BIOSPHERE_MIN_PERCENTILE[planet.NativeBiosphere] <
        constraint.minNativeBiospherePercentile
    )
      fail('2A-19b', `Tag ${tag} is incompatible with native biosphere on ${planet.Id}.`);
    if (
      constraint.minPopulationPercentile !== undefined &&
      populationMin < constraint.minPopulationPercentile
    )
      fail('2A-19c', `Tag ${tag} requires more population on ${planet.Id}.`);
    if (
      constraint.maxPopulationPercentile !== undefined &&
      populationMax > constraint.maxPopulationPercentile
    )
      fail('2A-19c', `Tag ${tag} requires less population on ${planet.Id}.`);
    if (
      constraint.minTechLevel !== undefined &&
      TECH_LEVEL[inhabited.TechLevel] < constraint.minTechLevel
    )
      fail('2A-19d', `Tag ${tag} requires higher technology on ${planet.Id}.`);
  }
}

function validateOtherObject(
  object: OtherCelestialObject,
  parent: SystemObject | undefined,
  temperature: import('../BaseDTO/merged_schema').Temperature | undefined,
  fail: (ruleId: string, message: string) => void,
): void {
  if (
    (object.ObjectType === 'KuiperBelt' || object.ObjectType === 'GasCloud') &&
    temperature !== 'Cryogenic'
  ) {
    fail('F12', `${object.ObjectType} ${object.Id} has incompatible temperature ${temperature}.`);
  }
  if (
    (object.ObjectType === 'AsteroidBelt' ||
      object.ObjectType === 'KuiperBelt' ||
      object.ObjectType === 'GasCloud') &&
    parent !== undefined
  ) {
    fail('B13', `Diffuse object ${object.Id} cannot be a satellite.`);
  }
  if (object.ObjectType === 'IndependentStation' && parent !== undefined) {
    fail('B21', `Independent station ${object.Id} must directly orbit its star.`);
  }
}

function validateRoutes(
  sector: Sector,
  systemsById: ReadonlyMap<string, StarSystem>,
  fail: (ruleId: string, message: string) => void,
): void {
  const portalsById = new Map(sector.RoutePortals.map((portal) => [portal.Id, portal]));
  const ownedPortalIds = new Set<string>();
  const routePairs = new Set<string>();
  const systemPortalAngles = new Map<string, Set<number>>();
  for (const portal of sector.RoutePortals) {
    if (!systemsById.has(portal.SystemId))
      fail('G2', `Portal ${portal.Id} references missing system ${portal.SystemId}.`);
    if (
      !isFiniteNumber(portal.BoundaryAngleDegrees) ||
      portal.BoundaryAngleDegrees < 0 ||
      portal.BoundaryAngleDegrees >= 360
    )
      fail('G5', `Portal ${portal.Id} has invalid boundary angle.`);
    const angles = systemPortalAngles.get(portal.SystemId) ?? new Set<number>();
    if (angles.has(portal.BoundaryAngleDegrees))
      fail('G6', `System ${portal.SystemId} has duplicate route-portal angles.`);
    angles.add(portal.BoundaryAngleDegrees);
    systemPortalAngles.set(portal.SystemId, angles);
  }
  for (const route of sector.Routes) {
    const [firstId, secondId] = route.PortalIds;
    const first = portalsById.get(firstId);
    const second = portalsById.get(secondId);
    if (firstId === secondId || first === undefined || second === undefined) {
      fail('G3', `Route ${route.Id} must reference two distinct existing portals.`);
      continue;
    }
    for (const portal of [first, second]) {
      if (ownedPortalIds.has(portal.Id))
        fail('G3', `Portal ${portal.Id} belongs to more than one route.`);
      ownedPortalIds.add(portal.Id);
    }
    if (first.SystemId === second.SystemId)
      fail('G1', `Route ${route.Id} connects one system to itself.`);
    const pair = routePairKey(first.SystemId, second.SystemId);
    if (routePairs.has(pair)) fail('G4', `Route ${route.Id} duplicates a system pair.`);
    routePairs.add(pair);
  }
  for (const portal of sector.RoutePortals)
    if (!ownedPortalIds.has(portal.Id))
      fail('G3', `Portal ${portal.Id} is not owned by its route.`);
  for (const system of sector.Systems)
    if (!sector.RoutePortals.some((portal) => portal.SystemId === system.Id))
      fail('G8', `System ${system.Id} has no route.`);
}
