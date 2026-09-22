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
} from './merged_schema';
import {
  directOrbitAuBand,
  isGasPlanet,
  isPoiHostCompatible,
  POI_TYPES,
  WORLD_TAG_CONSTRAINTS,
} from './generation_rules';
import {
  ATMOSPHERE_HAB,
  ATMOSPHERE_MAX_PERCENTILE,
  BULK_COMPOSITION_HAB,
  GAS_COMPOSITION_BY_SIZE,
  NATIVE_BIOSPHERE_MIN_PERCENTILE,
  POPULATION_HAB_REQUIRED,
  POPULATION_RANGE,
  SIZE_HAB,
  SIZE_RANK,
  TECH_HAB_REQUIRED,
  TECH_LEVEL,
  TEMPERATURE_HAB,
  TEMPERATURE_RANK,
  TERRAN_BIOSPHERE_HAB,
  TERRAN_BIOSPHERE_HAB_REQUIRED,
} from './tables';

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
    ]),
    ...sector.Routes,
    ...sector.RoutePortals,
    sector.PlayerShip,
  ];
}

function routePairKey(first: string, second: string): string {
  return [first, second].sort().join('\u0000');
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
      system.HexLocation.Column > 10 ||
      !Number.isInteger(system.HexLocation.Row) ||
      system.HexLocation.Row < 1 ||
      system.HexLocation.Row > 8
    ) {
      fail('A1', `System ${system.Id} has an out-of-bounds hex location.`);
    }
    if (system.Objects.length === 0) fail('A8', `System ${system.Id} has no orbiting objects.`);
    const inhabitedCount = system.Objects.filter(
      (object): object is Planet => object.Kind === 'Planet' && object.InhabitedInfo !== false,
    ).length;
    if (inhabitedCount < 1 || inhabitedCount > 3)
      fail(
        '2A-10',
        `System ${system.Id} has ${inhabitedCount} inhabited planets; expected one through three.`,
      );
    const extraObjectCount = system.Objects.length - inhabitedCount;
    if (extraObjectCount < 2 || extraObjectCount > 7)
      fail(
        '2A-35',
        `System ${system.Id} has ${extraObjectCount} extra objects; expected two through seven.`,
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
      !required(item, ['Id', 'ProceduralName', 'NiceName', 'VisibilityLevel', 'Intelligence'], path)
    )
      return false;
    if (
      !string(item.Id, `${path}.Id`) ||
      !string(item.ProceduralName, `${path}.ProceduralName`) ||
      !string(item.NiceName, `${path}.NiceName`) ||
      !string(item.VisibilityLevel, `${path}.VisibilityLevel`) ||
      !record(item.Intelligence, `${path}.Intelligence`)
    )
      return false;
    const intelligence = item.Intelligence;
    return ['InfoboxSummary', 'BasicScan', 'CulturePartial', 'CultureFull', 'GM'].every((key) =>
      string(intelligence[key], `${path}.Intelligence.${key}`),
    );
  };
  const orbit = (item: unknown, path: string): boolean =>
    record(item, path) &&
    required(item, ['AU', 'AngleDegrees', 'ParentObjectId'], path) &&
    number(item.AU, `${path}.AU`) &&
    number(item.AngleDegrees, `${path}.AngleDegrees`) &&
    (item.ParentObjectId === null || string(item.ParentObjectId, `${path}.ParentObjectId`));
  const object = (item: unknown, path: string): boolean => {
    if (
      !selectable(item, path) ||
      !required(item, ['Orbit', 'Temperature', 'Kind'], path) ||
      !orbit(item.Orbit, `${path}.Orbit`) ||
      !string(item.Temperature, `${path}.Temperature`) ||
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
          'TidallyLocked',
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
      typeof item.TidallyLocked !== 'boolean' ||
      !string(item.Atmosphere, `${path}.Atmosphere`) ||
      !string(item.NativeBiosphere, `${path}.NativeBiosphere`)
    )
      return invalid(path, 'a complete Planet');
    if (item.InhabitedInfo === false) return true;
    return (
      record(item.InhabitedInfo, `${path}.InhabitedInfo`) &&
      required(
        item.InhabitedInfo,
        ['TotalHab', 'WorldTags', 'TerranBiosphere', 'Population', 'TechLevel'],
        `${path}.InhabitedInfo`,
      ) &&
      number(item.InhabitedInfo.TotalHab, `${path}.InhabitedInfo.TotalHab`) &&
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
        'SectorName',
        'Systems',
        'Routes',
        'RoutePortals',
        'PlayerShip',
      ],
      'Sector',
    ) ||
    !string(value.SchemaVersion, 'Sector.SchemaVersion') ||
    !string(value.OriginalSeed, 'Sector.OriginalSeed') ||
    !string(value.SectorName, 'Sector.SectorName') ||
    !array(value.Systems, 'Sector.Systems') ||
    !array(value.Routes, 'Sector.Routes') ||
    !array(value.RoutePortals, 'Sector.RoutePortals') ||
    !selectable(value.PlayerShip, 'Sector.PlayerShip') ||
    !string(value.PlayerShip.CurrentLocationId, 'Sector.PlayerShip.CurrentLocationId')
  )
    return undefined;
  for (const [index, system] of value.Systems.entries()) {
    const path = `Sector.Systems[${index}]`;
    if (
      !selectable(system, path) ||
      !required(system, ['HexLocation', 'Star', 'Objects', 'PointsOfInterest'], path) ||
      !record(system.HexLocation, `${path}.HexLocation`) ||
      !number(system.HexLocation.Column, `${path}.HexLocation.Column`) ||
      !number(system.HexLocation.Row, `${path}.HexLocation.Row`) ||
      !selectable(system.Star, `${path}.Star`) ||
      !string(system.Star.StarType, `${path}.Star.StarType`) ||
      !number(system.Star.HabitabilityRating, `${path}.Star.HabitabilityRating`) ||
      !array(system.Objects, `${path}.Objects`) ||
      !array(system.PointsOfInterest, `${path}.PointsOfInterest`) ||
      !system.Objects.every((item, objectIndex) => object(item, `${path}.Objects[${objectIndex}]`))
    )
      return undefined;
    for (const [poiIndex, poi] of system.PointsOfInterest.entries())
      if (
        !selectable(poi, `${path}.PointsOfInterest[${poiIndex}]`) ||
        !string(poi.ParentObjectId, `${path}.PointsOfInterest[${poiIndex}].ParentObjectId`) ||
        !string(poi.POIType, `${path}.PointsOfInterest[${poiIndex}].POIType`)
      )
        return undefined;
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
      !string(portal.RouteId, `Sector.RoutePortals[${index}].RouteId`) ||
      !string(portal.SystemId, `Sector.RoutePortals[${index}].SystemId`) ||
      !number(portal.BoundaryAngleDegrees, `Sector.RoutePortals[${index}].BoundaryAngleDegrees`)
    )
      return undefined;
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
  const selectable = ['Id', 'ProceduralName', 'NiceName', 'VisibilityLevel', 'Intelligence'];
  const checkSelectable = (entity: SelectableEntity, path: string): void => {
    check(
      entity.Intelligence,
      ['InfoboxSummary', 'BasicScan', 'CulturePartial', 'CultureFull', 'GM'],
      `${path}.Intelligence`,
    );
  };
  check(
    sector,
    [
      'SchemaVersion',
      'OriginalSeed',
      'SectorName',
      'Systems',
      'Routes',
      'RoutePortals',
      'PlayerShip',
    ],
    'Sector',
  );
  checkSelectable(sector.PlayerShip, 'PlayerShip');
  check(sector.PlayerShip, [...selectable, 'CurrentLocationId'], 'PlayerShip');
  for (const route of sector.Routes) {
    checkSelectable(route, `Route ${route.Id}`);
    check(route, [...selectable, 'PortalIds'], `Route ${route.Id}`);
  }
  for (const portal of sector.RoutePortals) {
    checkSelectable(portal, `RoutePortal ${portal.Id}`);
    check(
      portal,
      [...selectable, 'RouteId', 'SystemId', 'BoundaryAngleDegrees'],
      `RoutePortal ${portal.Id}`,
    );
  }
  for (const system of sector.Systems) {
    checkSelectable(system, `System ${system.Id}`);
    check(
      system,
      [...selectable, 'HexLocation', 'Star', 'Objects', 'PointsOfInterest'],
      `System ${system.Id}`,
    );
    check(system.HexLocation, ['Column', 'Row'], `System ${system.Id}.HexLocation`);
    checkSelectable(system.Star, `Star ${system.Star.Id}`);
    check(system.Star, [...selectable, 'StarType', 'HabitabilityRating'], `Star ${system.Star.Id}`);
    for (const object of system.Objects) {
      checkSelectable(object, `Object ${object.Id}`);
      check(object.Orbit, ['AU', 'AngleDegrees', 'ParentObjectId'], `Object ${object.Id}.Orbit`);
      if (object.Kind === 'Planet') {
        check(
          object,
          [
            ...selectable,
            'Orbit',
            'Temperature',
            'Kind',
            'Size',
            'BulkComposition',
            'SurfaceWaterPresent',
            'TidallyLocked',
            'Atmosphere',
            'NativeBiosphere',
            'InhabitedInfo',
          ],
          `Planet ${object.Id}`,
        );
        if (object.InhabitedInfo !== false)
          check(
            object.InhabitedInfo,
            ['TotalHab', 'WorldTags', 'TerranBiosphere', 'Population', 'TechLevel'],
            `Planet ${object.Id}.InhabitedInfo`,
          );
      } else
        check(
          object,
          [...selectable, 'Orbit', 'Temperature', 'Kind', 'ObjectType'],
          `OtherCelestialObject ${object.Id}`,
        );
    }
    for (const poi of system.PointsOfInterest) {
      checkSelectable(poi, `POI ${poi.Id}`);
      check(poi, [...selectable, 'ParentObjectId', 'POIType'], `POI ${poi.Id}`);
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
    if (!isFiniteNumber(object.Orbit.AU) || object.Orbit.AU < 0)
      fail('B1', `Direct-orbit object ${object.Id} has invalid AU.`);
    else if (directAus.has(object.Orbit.AU))
      fail('B5', `Direct-orbit object ${object.Id} shares an AU with another object.`);
    else directAus.add(object.Orbit.AU);
    const [minimum, maximum] = directOrbitAuBand(system.Star.StarType, object.Temperature);
    if (object.Orbit.AU <= minimum || object.Orbit.AU >= maximum) {
      fail(
        object.Kind === 'Planet' ? 'C2' : 'F12',
        `Direct object ${object.Id} has AU ${object.Orbit.AU} outside its exclusive temperature band (${minimum}, ${maximum}).`,
      );
    }
  }
  for (const object of system.Objects) {
    if (!isFiniteNumber(object.Orbit.AU) || object.Orbit.AU < 0)
      fail('B3', `Object ${object.Id} has invalid AU.`);
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
  for (const left of directObjects)
    for (const right of directObjects) {
      if (
        left.Id !== right.Id &&
        TEMPERATURE_RANK[left.Temperature] > TEMPERATURE_RANK[right.Temperature] &&
        left.Orbit.AU >= right.Orbit.AU
      ) {
        fail(
          left.Kind === 'Planet' && right.Kind === 'Planet' ? 'C2' : 'F12',
          `Hotter direct object ${left.Id} is not closer than ${right.Id}.`,
        );
      }
    }
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
    validateOtherObject(object, parent, fail);
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
    planet.Temperature === 'Cryogenic' ||
    planet.Temperature === 'Furance' ||
    planet.Atmosphere === 'Vacuum'
  ) {
    if (planet.SurfaceWaterPresent)
      fail('2A-28a', `Planet ${planet.Id} has surface water despite an overriding environment.`);
  } else if (planet.BulkComposition === 'Water') {
    if (!planet.SurfaceWaterPresent)
      fail('2A-28c', `Water-composition planet ${planet.Id} lacks surface water.`);
  }
  if (planet.InhabitedInfo !== false) validateInhabitedPlanet(planet, system, fail);
  const shouldBeTidallyLocked =
    planet.Orbit.ParentObjectId === null && system.Star.StarType === 'M-type';
  if (planet.TidallyLocked !== shouldBeTidallyLocked)
    fail('C17', `Planet ${planet.Id} has incorrect tidal-locking state.`);
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
      if (planet.Temperature !== parent.Temperature)
        fail('B19', `Moon ${planet.Id} has a different temperature than parent ${parent.Id}.`);
      if (planet.Orbit.AU !== parent.Orbit.AU)
        fail('B20', `Moon ${planet.Id} has a different AU than parent ${parent.Id}.`);
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
  if (inhabited.TotalHab < POPULATION_HAB_REQUIRED[inhabited.Population])
    fail('2A-22a', `Planet ${planet.Id} lacks habitability for its population.`);
  if (inhabited.TotalHab < TECH_HAB_REQUIRED[inhabited.TechLevel])
    fail('2A-22b', `Planet ${planet.Id} lacks habitability for its technology.`);
  if (inhabited.TotalHab < TERRAN_BIOSPHERE_HAB_REQUIRED[inhabited.TerranBiosphere])
    fail('2A-22c', `Planet ${planet.Id} lacks habitability for its Terran biosphere.`);
  const environmentalHab = Math.min(
    ATMOSPHERE_HAB[planet.Atmosphere],
    TEMPERATURE_HAB[planet.Temperature],
    TERRAN_BIOSPHERE_HAB[inhabited.TerranBiosphere],
    SIZE_HAB[planet.Size],
    BULK_COMPOSITION_HAB[planet.BulkComposition],
  );
  const expectedTotalHab = Math.min(system.Star.HabitabilityRating, environmentalHab);
  if (inhabited.TotalHab !== expectedTotalHab)
    fail(
      '2A-21b',
      `Planet ${planet.Id} has TotalHab ${inhabited.TotalHab}; expected ${expectedTotalHab} from its star and physical facts.`,
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
  fail: (ruleId: string, message: string) => void,
): void {
  const temperatureRank = TEMPERATURE_RANK[object.Temperature];
  if (
    object.ObjectType === 'AsteroidBelt' &&
    (temperatureRank < TEMPERATURE_RANK.Alpine || temperatureRank > TEMPERATURE_RANK.Furance)
  ) {
    fail('F12', `Asteroid belt ${object.Id} has incompatible temperature ${object.Temperature}.`);
  }
  if (
    (object.ObjectType === 'KuiperBelt' || object.ObjectType === 'GasCloud') &&
    (temperatureRank < TEMPERATURE_RANK.Cryogenic || temperatureRank > TEMPERATURE_RANK.Boreal)
  ) {
    fail(
      'F12',
      `${object.ObjectType} ${object.Id} has incompatible temperature ${object.Temperature}.`,
    );
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
  const routeIds = new Set(sector.Routes.map((route) => route.Id));
  const ownedPortalIds = new Set<string>();
  const routePairs = new Set<string>();
  const systemPortalAngles = new Map<string, Set<number>>();
  for (const portal of sector.RoutePortals) {
    if (!routeIds.has(portal.RouteId))
      fail('G3', `Portal ${portal.Id} references missing route ${portal.RouteId}.`);
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
      if (portal.RouteId !== route.Id)
        fail('G3', `Portal ${portal.Id} does not reciprocally reference route ${route.Id}.`);
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
