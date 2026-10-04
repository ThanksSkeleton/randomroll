import type { Polity, Sector, SelectableEntity } from '../BaseDTO/merged_schema';
import { POLITY_FLAG_COLORS } from '../Shared/polity_flag_colors';
import { isAtmosphere } from './atmosphere_interpretation';

export interface InvariantViolation {
  RuleId: string;
  Message: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateCanonicalShape(
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
  const biosphereRank = (item: unknown, path: string): boolean =>
    (typeof item === 'number' && [1, 2, 3, 4, 5].includes(item)) ||
    invalid(path, 'a biosphere rank from 1 through 5');
  const array = (item: unknown, path: string): item is unknown[] =>
    Array.isArray(item) || invalid(path, 'an array');
  const required = (
    item: Record<string, unknown>,
    keys: readonly string[],
    path: string,
  ): boolean => keys.every((key) => key in item || invalid(`${path}.${key}`, 'present'));
  const culture = (item: unknown, path: string): boolean => {
    if (
      !record(item, path) ||
      !required(
        item,
        [
          'culturalTemplate',
          'homeworld',
          'adventureComponents',
          'pcCaresAbout',
          'biggestConflict',
          'outsiderOpinion',
          'lawEnforcement',
          'majorStarport',
          'planetaryDefenses',
        ],
        path,
      ) ||
      !record(item.adventureComponents, `${path}.adventureComponents`)
    )
      return false;
    if (
      !string(item.culturalTemplate, `${path}.culturalTemplate`) ||
      !string(item.homeworld, `${path}.homeworld`) ||
      !string(item.outsiderOpinion, `${path}.outsiderOpinion`)
    )
      return false;
    for (const kind of ['enemy', 'friend', 'complication', 'thing', 'place']) {
      const component = item.adventureComponents[kind];
      const componentPath = `${path}.adventureComponents.${kind}`;
      if (
        !record(component, componentPath) ||
        !array(component.prompts, `${componentPath}.prompts`) ||
        component.prompts.length !== 2
      )
        return false;
      for (const [index, prompt] of component.prompts.entries())
        if (
          !record(prompt, `${componentPath}.prompts[${index}]`) ||
          !string(prompt.prompt, `${componentPath}.prompts[${index}].prompt`)
        )
          return false;
      if (kind === 'enemy' || kind === 'friend')
        if (
          !string(component.name, `${componentPath}.name`) ||
          !string(component.gender, `${componentPath}.gender`)
        )
          return false;
      if (kind === 'place' && !string(component.placeName, `${componentPath}.placeName`))
        return false;
    }
    const fields: Record<string, string[]> = {
      pcCaresAbout: ['category', 'type'],
      biggestConflict: ['category', 'details'],
      lawEnforcement: ['amount', 'style', 'specialLaw'],
      majorStarport: ['type', 'name'],
      planetaryDefenses: [
        'orbitingStationStyle',
        'orbitingStationType',
        'tradeAndSmugglingEnforcementAmount',
        'customsAndVisaEmphasis',
        'patrolBoatPresence',
        'planetaryGunTurrets',
      ],
    };
    for (const [key, names] of Object.entries(fields)) {
      const section = item[key];
      if (!record(section, `${path}.${key}`) || !required(section, names, `${path}.${key}`))
        return false;
      for (const name of names) if (!string(section[name], `${path}.${key}.${name}`)) return false;
    }
    const caresAbout = item.pcCaresAbout as Record<string, unknown>;
    if (
      !required(caresAbout, ['commoditySize'], `${path}.pcCaresAbout`) ||
      !(
        caresAbout.commoditySize === null ||
        string(caresAbout.commoditySize, `${path}.pcCaresAbout.commoditySize`)
      )
    )
      return false;
    return true;
  };
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
      (!isAtmosphere(item.Atmosphere) &&
        invalid(`${path}.Atmosphere`, 'a valid atmosphere outcome')) ||
      !biosphereRank(item.NativeBiosphere, `${path}.NativeBiosphere`)
    )
      return invalid(path, 'a complete Planet');
    if (item.InhabitedInfo === false) return item.Culture === undefined;
    return (
      required(item, ['Culture'], path) &&
      (item.Culture === null || culture(item.Culture, `${path}.Culture`)) &&
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
      biosphereRank(item.InhabitedInfo.TerranBiosphere, `${path}.InhabitedInfo.TerranBiosphere`) &&
      typeof item.InhabitedInfo.Population === 'number' &&
      [1, 2, 3, 4, 5].includes(item.InhabitedInfo.Population) &&
      typeof item.InhabitedInfo.TechLevel === 'number' &&
      [0, 1, 2, 3, 4, 4.1, 5].includes(item.InhabitedInfo.TechLevel)
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
    value.SchemaVersion !== 'merged-v9' ||
    !string(value.OriginalSeed, 'Sector.OriginalSeed') ||
    !['UNRESTRICTED', 'TL4_PLUS', 'TL4_PLUS_POP_GT_2000', 'TL4_PLUS_POP_GT_500'].includes(
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
      !required(polity, ['Id', 'NiceName', 'HomeworldId', 'Flag'], path) ||
      !string(polity.Id, `${path}.Id`) ||
      !string(polity.NiceName, `${path}.NiceName`) ||
      !string(polity.HomeworldId, `${path}.HomeworldId`) ||
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
        ],
        path,
      ) ||
      !string(event.Id, `${path}.Id`) ||
      !string(event.AttackerPolityId, `${path}.AttackerPolityId`) ||
      !string(event.DefenderPolityId, `${path}.DefenderPolityId`) ||
      !string(event.TargetWorldId, `${path}.TargetWorldId`) ||
      !number(event.RouteDistance, `${path}.RouteDistance`) ||
      !number(event.Attack, `${path}.Attack`) ||
      !number(event.Defense, `${path}.Defense`)
    )
      return undefined;
  }
  return value as unknown as Sector;
}

export function checkNoUnknownSchemaProperties(
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
    check(polity, ['Id', 'NiceName', 'HomeworldId', 'Flag'], `Polity ${polity.Id}`);
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
        if (object.Culture) {
          const culture = object.Culture;
          const path = `Planet ${object.Id}.Culture`;
          check(
            culture,
            [
              'culturalTemplate',
              'homeworld',
              'adventureComponents',
              'pcCaresAbout',
              'biggestConflict',
              'outsiderOpinion',
              'lawEnforcement',
              'majorStarport',
              'planetaryDefenses',
            ],
            path,
          );
          check(
            culture.adventureComponents,
            ['enemy', 'friend', 'complication', 'thing', 'place'],
            `${path}.adventureComponents`,
          );
          for (const [key, fields] of [
            ['pcCaresAbout', ['category', 'type', 'commoditySize']],
            ['biggestConflict', ['category', 'details']],
            ['lawEnforcement', ['amount', 'style', 'specialLaw']],
            ['majorStarport', ['type', 'name']],
            [
              'planetaryDefenses',
              [
                'orbitingStationStyle',
                'orbitingStationType',
                'tradeAndSmugglingEnforcementAmount',
                'customsAndVisaEmphasis',
                'patrolBoatPresence',
                'planetaryGunTurrets',
              ],
            ],
          ] as const)
            check(culture[key], fields, `${path}.${key}`);
          for (const [kind, component] of Object.entries(culture.adventureComponents)) {
            const componentPath = `${path}.adventureComponents.${kind}`;
            check(
              component,
              kind === 'enemy' || kind === 'friend'
                ? ['name', 'gender', 'prompts']
                : kind === 'place'
                  ? ['placeName', 'prompts']
                  : ['prompts'],
              componentPath,
            );
            for (const prompt of component.prompts)
              check(prompt, ['prompt'], `${componentPath}.prompt`);
          }
        }
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

export function validPolityFlag(polity: Polity, polities: readonly Polity[]): boolean {
  return (
    /^#[0-9a-f]{6}$/i.test(polity.Flag.FieldColor) &&
    POLITY_FLAG_COLORS.includes(polity.Flag.CircleColor) &&
    polity.Flag.FieldColor !== polity.Flag.CircleColor &&
    !polities.some(
      (candidate) =>
        candidate.Id !== polity.Id && candidate.Flag.FieldColor === polity.Flag.FieldColor,
    )
  );
}

/** Canonical structure and identity checks shared by commands and generation. */
export function checkCanonicalInvariants(value: unknown): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const fail = (RuleId: string, Message: string): void => {
    violations.push({ RuleId, Message });
  };
  const sector = validateCanonicalShape(value, fail);
  if (!sector) return violations;
  checkNoUnknownSchemaProperties(sector, fail);
  const selectable: SelectableEntity[] = [
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
  if (new Set(selectable.map(({ Id }) => Id)).size !== selectable.length)
    fail('H4', 'Selectable entity IDs must be globally unique.');
  for (const entity of selectable) {
    if (entity.NiceName.trim() === '') fail('H5', `Entity ${entity.Id} has a blank nice name.`);
    if (entity.ProceduralName.trim() === '')
      fail('H7', `Entity ${entity.Id} has a blank procedural name.`);
  }
  for (const polity of sector.Polities)
    if (!validPolityFlag(polity, sector.Polities))
      fail('P6', `Polity ${polity.Id} has invalid flag colors.`);

  const systemIds = new Set(sector.Systems.map((system) => system.Id));
  const selectableIds = new Set(selectable.map(({ Id }) => Id));
  selectableIds.delete(sector.PlayerShip.Id);
  if (!selectableIds.has(sector.PlayerShip.CurrentLocationId))
    fail(
      'H1',
      `Player ship location ${sector.PlayerShip.CurrentLocationId} is not an allowed entity.`,
    );
  const objects = sector.Systems.flatMap((system) => system.Objects);
  const objectIds = new Set(objects.map(({ Id }) => Id));
  for (const portal of sector.RoutePortals)
    if (!systemIds.has(portal.SystemId))
      fail('G2', `Portal ${portal.Id} references missing system ${portal.SystemId}.`);
  const portalIds = new Set(sector.RoutePortals.map(({ Id }) => Id));
  for (const route of sector.Routes) {
    const [first, second] = route.PortalIds;
    if (first === second || !portalIds.has(first!) || !portalIds.has(second!))
      fail('G3', `Route ${route.Id} must reference two distinct existing portals.`);
  }
  for (const system of sector.Systems) {
    const localObjectIds = new Set(system.Objects.map(({ Id }) => Id));
    for (const object of system.Objects)
      if (object.Orbit.ParentObjectId !== null && !objectIds.has(object.Orbit.ParentObjectId))
        fail(
          objects.some(
            (candidate) =>
              candidate.Id === object.Orbit.ParentObjectId &&
              !system.Objects.some((local) => local.Id === candidate.Id),
          )
            ? 'B8'
            : 'B7',
          `Object ${object.Id} has an invalid parent ${object.Orbit.ParentObjectId}.`,
        );
    for (const poi of system.PointsOfInterest)
      if (!localObjectIds.has(poi.ParentObjectId)) {
        const elsewhere = objectIds.has(poi.ParentObjectId);
        fail(elsewhere ? 'F2' : 'F1', `POI ${poi.Id} has an invalid parent ${poi.ParentObjectId}.`);
      }
    for (const hpoi of system.HabitablePointsOfInterest) {
      const parent = system.Objects.find((object) => object.Id === hpoi.ParentWorldId);
      if (!parent || parent.Kind !== 'Planet' || parent.InhabitedInfo === false)
        fail('HPOI', `HPOI ${hpoi.Id} has no inhabited parent in its system.`);
    }
  }
  return violations;
}
