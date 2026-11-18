import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  HabitablePointOfInterest,
  Planet,
  PointOfInterest,
  Sector,
  SelectableEntity,
} from '../../src/generators/swn_sector/BaseDTO/merged_schema';
import { checkAllInvariants } from '../../src/generators/swn_sector/Generator/generated_sector_invariants';
import {
  projectCultureWorld,
  hpoiProjection,
} from '../../src/generators/swn_sector/Projector/culture_projection';
import { populationStrings } from '../../src/generators/swn_sector/Shared/population_interpretation';
import { techLevelStrings } from '../../src/generators/swn_sector/Shared/tech_level_interpretation';
import { biosphereName } from '../../src/generators/swn_sector/Shared/biosphere_interpretation';
import { projectWorldTag } from '../../src/generators/swn_sector/Projector/world_tag_projection';
import { polityFlagColorValue } from '../../src/generators/swn_sector/UI/features/politics/PolityFlag';
import { partitionHubPolities } from './hub_visibility';

type Poi = PointOfInterest | HabitablePointOfInterest;
type Target = { path: string; name: string };

function safeId(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`Unsafe entity ID: ${id}`);
  return id;
}

function plain(value: unknown): string {
  return String(value).replace(/\r?\n/g, ' ').trim();
}

function wikiLabel(value: string): string {
  return plain(value).replace(/[|\[\]]/g, ' ');
}

function frontmatter(kind: string, id: string): string {
  return `---\nkind: ${JSON.stringify(kind)}\nsource_id: ${JSON.stringify(id)}\n---\n\n`;
}

function note(kind: string, id: string, title: string, parts: string[]): string {
  return `${frontmatter(kind, id)}# ${plain(title)}\n\n${parts.filter(Boolean).join('\n\n')}\n`;
}

function list(values: string[]): string {
  return values.length ? values.map((value) => `- ${value}`).join('\n') : '- None';
}

function hostId(poi: Poi): string {
  return 'ParentWorldId' in poi ? poi.ParentWorldId : poi.ParentObjectId;
}

function intelligence(entity: SelectableEntity): string {
  const scanFields = [
    ['Summary', entity.Intelligence.InfoboxSummary],
    ['Basic scan', entity.Intelligence.BasicScan],
    ['Detailed scan', entity.Intelligence.DetailedScan],
    ['Politics scan', entity.Intelligence.PoliticsScan],
    ['Deep politics scan', entity.Intelligence.DeepPoliticsScan],
  ].filter(([, value]) => value.trim() && value.trim() !== '-');
  const scanText = scanFields.length
    ? `## Existing scan text\n\n${scanFields
        .map(([label, value]) => `### ${label}\n\n${value.trim()}`)
        .join('\n\n')}`
    : '';
  const gmText = entity.Intelligence.GM.trim();
  return [
    scanText,
    '## Player-facing lore\n\n<!-- Add player-facing lore here. -->',
    `## GM notes\n\n${gmText && gmText !== '-' ? gmText : '<!-- Add GM notes here. -->'}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function visibility(entity: SelectableEntity): string {
  const flags = entity.Visibility;
  return `## Visibility\n\n${list([
    `Basic scan: ${flags.BasicScan ? 'yes' : 'no'}`,
    `Detailed scan: ${flags.DetailedScan ? 'yes' : 'no'}`,
    `Politics scan: ${flags.PoliticsScan ? 'yes' : 'no'}`,
    `Deep politics scan: ${flags.DeepPoliticsScan ? 'yes' : 'no'}`,
  ])}`;
}

/** SVG uses the same color interpretation and geometry as the application flag. */
export function buildFlagAssets(sector: Sector): Map<string, string> {
  return new Map(
    sector.Polities.map((polity) => [
      `Assets/Flags/${safeId(polity.Id)}.svg`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 16"><rect x="0.5" y="0.5" width="31" height="15" fill="${polityFlagColorValue(polity.Flag.FieldColor)}" stroke="#ffffff"/><circle cx="16" cy="8" r="5" fill="${polityFlagColorValue(polity.Flag.CircleColor)}"/></svg>\n`,
    ]),
  );
}

function expandedCulture(sector: Sector, world: Planet): string {
  if (!world.Culture || world.InhabitedInfo === false) return '';
  const projected = projectCultureWorld(sector, world.Id);
  if (!projected?.culture || !projected.npcLocationBank)
    throw new Error(`Cannot project culture for world ${world.Id}`);
  const culture = projected.culture;
  const bank = projected.npcLocationBank;
  const components = Object.entries(culture.adventureComponents).map(([kind, component]) => {
    const identity =
      'name' in component
        ? `${component.name} (${component.gender})`
        : 'placeName' in component
          ? component.placeName
          : '';
    return `- ${kind}: ${identity}${identity ? ' — ' : ''}${component.prompts.map((prompt) => `${prompt.sourceTag}: ${prompt.prompt}`).join(' / ')}`;
  });
  const hpois = sector.Systems.flatMap((system) => system.HabitablePointsOfInterest)
    .filter((poi) => poi.ParentWorldId === world.Id)
    .map((poi) => {
      const result = hpoiProjection(sector, poi);
      return `- ${poi.HPOIType}: ${result.reason ? `NONE (${result.reason}); ` : ''}${result.fields.map(([name, value]) => `${name}: ${value}`).join('; ')}`;
    });
  return [
    '## LoreBuilderForWorldPolity',
    `### World tags\n\n${list(projected.tags.map((tag) => `${tag.tag}: ${tag.description}`))}`,
    `### Culture and cities\n\n${list([
      `Template: ${culture.culturalTemplate}`,
      `Capital: ${culture.capitalCity}`,
      `Secondary cities: ${culture.secondaryCities.join(', ')}`,
      `Population: ${projected.population}`,
      `Tech level: ${projected.techLevel}`,
      `Outsider opinion: ${culture.outsiderOpinion}`,
      `PC interest: ${culture.pcCaresAbout.category} / ${culture.pcCaresAbout.type}${culture.pcCaresAbout.commoditySize ? ` / ${culture.pcCaresAbout.commoditySize}` : ''}`,
      `Biggest conflict: ${culture.biggestConflict.category} — ${culture.biggestConflict.details}`,
      `Starport: ${culture.majorStarport.name} (${culture.majorStarport.type})`,
    ])}`,
    `### NPCs\n\n${list(bank.npcs.map((npc) => `${npc.name} (${npc.gender})`))}`,
    `### Locations\n\n${list(bank.locations)}`,
    `### Adventure components\n\n${list(components)}`,
    `### Security\n\n${list([
      `Law enforcement: ${culture.lawEnforcement.amount}; ${culture.lawEnforcement.style}; ${culture.lawEnforcement.specialLaw}`,
      `Orbital station: ${culture.planetaryDefenses.orbitingStationStyle}; ${culture.planetaryDefenses.orbitingStationType}`,
      `Trade enforcement: ${culture.planetaryDefenses.tradeAndSmugglingEnforcementAmount}`,
      `Customs and visas: ${culture.planetaryDefenses.customsAndVisaEmphasis}`,
      `Patrol boats: ${culture.planetaryDefenses.patrolBoatPresence}`,
      `Gun turrets: ${culture.planetaryDefenses.planetaryGunTurrets}`,
    ])}`,
    `### Habitable points of interest\n\n${list(hpois)}`,
  ].join('\n\n');
}

function atmosphere(world: Planet): string {
  const value = world.Atmosphere;
  if ('SelectedGas' in value) return `${value.Category} (${value.SelectedGas})`;
  if ('PressureResult' in value) return `${value.Category} (${value.PressureResult})`;
  return value.Category;
}

/** Build an Obsidian vault from a complete canonical sector, without writing files. */
export function buildVaultNotes(sector: Sector): Map<string, string> {
  const targets = new Map<string, Target>();
  const notes = new Map<string, string>();
  const portals = new Map(sector.RoutePortals.map((portal) => [portal.Id, portal]));
  const register = (id: string, path: string, name: string) => {
    if (targets.has(id)) throw new Error(`Duplicate entity ID: ${id}`);
    targets.set(id, { path, name });
  };
  const pathOf = (id: string): string => {
    const target = targets.get(id);
    if (!target) throw new Error(`Missing note target for ${id}`);
    return target.path;
  };
  const link = (id: string): string => {
    const target = targets.get(id);
    if (!target) throw new Error(`Missing note target for ${id}`);
    return `[[${target.path.slice(0, -3)}|${wikiLabel(target.name)}]]`;
  };
  const add = (path: string, content: string) => {
    if (notes.has(path)) throw new Error(`Duplicate note path: ${path}`);
    notes.set(path, content);
  };

  for (const system of sector.Systems) {
    const root = `Systems/${safeId(system.Id)}`;
    register(system.Id, `${root}/System.md`, system.NiceName);
    register(system.Star.Id, `${root}/System.md`, system.Star.NiceName);
    for (const object of system.Objects) {
      const folder = object.Kind === 'Planet' ? 'Planets' : 'Other Entities';
      register(object.Id, `${root}/${folder}/${safeId(object.Id)}.md`, object.NiceName);
    }
    for (const poi of [...system.PointsOfInterest, ...system.HabitablePointsOfInterest]) {
      const parent = targets.get(hostId(poi));
      if (!parent) throw new Error(`Missing host for point of interest ${poi.Id}`);
      register(poi.Id, `${parent.path.slice(0, -3)}/POIs/${safeId(poi.Id)}.md`, poi.NiceName);
    }
  }
  for (const route of sector.Routes) {
    const path = `Routes/${safeId(route.Id)}.md`;
    register(route.Id, path, route.NiceName);
    for (const portalId of route.PortalIds) {
      const portal = portals.get(portalId);
      if (!portal) throw new Error(`Missing route portal ${portalId}`);
      register(portal.Id, path, portal.NiceName);
    }
  }
  for (const polity of sector.Polities)
    register(polity.Id, `Polities/${safeId(polity.Id)}.md`, polity.NiceName);

  const hubPolities = partitionHubPolities(sector);
  add(
    'SectorHub.md',
    note('sector hub', sector.OriginalSeed, 'SectorHub', [
      `## Visible WorldPolities\n\n${list(hubPolities.visible.map((polity) => link(polity.Id)))}`,
      `## Visible systems\n\n${list(sector.Systems.filter((system) => system.Visibility.BasicScan).map((system) => link(system.Id)))}`,
      '[[UnseenSectorHub|Unseen WorldPolities]]',
    ]),
  );
  add(
    'UnseenSectorHub.md',
    note('unseen sector hub', sector.OriginalSeed, 'UnseenSectorHub', [
      `## Unseen WorldPolities\n\n${list(hubPolities.unseen.map((polity) => link(polity.Id)))}`,
      '[[SectorHub|Visible WorldPolities]]',
    ]),
  );

  add(
    'Sector.md',
    note('sector', sector.OriginalSeed, sector.SectorName, [
      `- **Seed:** ${plain(sector.OriginalSeed)}\n- **Starting world:** ${sector.StartingWorldId ? link(sector.StartingWorldId) : 'None'}\n- **Player ship location:** ${link(sector.PlayerShip.CurrentLocationId)}`,
      `## Systems\n\n${list(sector.Systems.map((system) => link(system.Id)))}`,
      `## Routes\n\n${list(sector.Routes.map((route) => link(route.Id)))}`,
      `## Polities\n\n${list(sector.Polities.map((polity) => link(polity.Id)))}`,
      '## Player-facing lore\n\n<!-- Add player-facing lore here. -->',
      '## GM notes\n\n<!-- Add GM notes here. -->',
    ]),
  );

  for (const system of sector.Systems) {
    const systemRoutes = sector.Routes.filter((route) =>
      route.PortalIds.some((id) => portals.get(id)?.SystemId === system.Id),
    );
    const pois = [...system.PointsOfInterest, ...system.HabitablePointsOfInterest];
    add(
      pathOf(system.Id),
      note('system', system.Id, system.NiceName, [
        `- **Sector:** [[Sector]]\n- **Hex:** ${system.HexLocation.Column}, ${system.HexLocation.Row}\n- **Star:** ${plain(system.Star.NiceName)} (${system.Star.StarType})`,
        `## Planets and moons\n\n${list(system.Objects.filter((object) => object.Kind === 'Planet').map((object) => link(object.Id)))}`,
        `## Other entities\n\n${list(system.Objects.filter((object) => object.Kind !== 'Planet').map((object) => link(object.Id)))}`,
        `## Points of interest\n\n${list(pois.map((poi) => link(poi.Id)))}`,
        `## Routes\n\n${list(systemRoutes.map((route) => link(route.Id)))}`,
        visibility(system),
        intelligence(system),
      ]),
    );

    for (const object of system.Objects) {
      const poiIds = pois.filter((poi) => hostId(poi) === object.Id).map((poi) => poi.Id);
      const orbitText =
        object.Orbit.ParentObjectId !== null
          ? `moon of ${link(object.Orbit.ParentObjectId)}`
          : `${object.Orbit.AU} AU`;
      const shared = [
        `- **System:** ${link(system.Id)}\n- **Procedural name:** ${plain(object.ProceduralName)}\n- **Orbit:** ${orbitText}\n- **Orbital angle:** ${object.Orbit.AngleDegrees}°`,
        `## Political claims\n\n${list(object.ClaimedByPolityIds.map(link))}`,
        `## Points of interest\n\n${list(poiIds.map(link))}`,
      ];
      if (object.Kind === 'Planet') {
        const inhabited = object.InhabitedInfo;
        add(
          pathOf(object.Id),
          note(object.Orbit.ParentObjectId ? 'moon' : 'planet', object.Id, object.NiceName, [
            ...shared.slice(0, 1),
            `- **Size:** ${object.Size}\n- **Composition:** ${object.BulkComposition}\n- **Surface water:** ${object.SurfaceWaterPresent ? 'yes' : 'no'}\n- **Atmosphere:** ${atmosphere(object)}\n- **Native biosphere:** ${biosphereName(object.NativeBiosphere)}${inhabited ? `\n- **World tags:** ${inhabited.WorldTags.map((tag) => `${tag} — ${projectWorldTag(tag).description}`).join('; ')}\n- **Population:** ${populationStrings(inhabited.Population).longString}\n- **Tech level:** ${techLevelStrings(inhabited.TechLevel).longString}\n- **Terran biosphere:** ${biosphereName(inhabited.TerranBiosphere)}` : '\n- **Inhabited:** no'}`,
            ...shared.slice(1),
            visibility(object),
            intelligence(object),
          ]),
        );
      } else {
        add(
          pathOf(object.Id),
          note('other entity', object.Id, object.NiceName, [
            ...shared.slice(0, 1),
            `- **Type:** ${object.ObjectType}`,
            ...shared.slice(1),
            visibility(object),
            intelligence(object),
          ]),
        );
      }
    }

    for (const poi of pois) {
      const kind = 'HPOIType' in poi ? poi.HPOIType : poi.POIType;
      const assignedPolity =
        'AssignedPolityId' in poi && poi.AssignedPolityId
          ? `\n- **Assigned polity:** ${link(poi.AssignedPolityId)}`
          : '';
      add(
        pathOf(poi.Id),
        note('point of interest', poi.Id, poi.NiceName, [
          `- **System:** ${link(system.Id)}\n- **Host:** ${link(hostId(poi))}\n- **Type:** ${kind}\n- **Angle:** ${poi.AngleDegrees}°${assignedPolity}`,
          visibility(poi),
          intelligence(poi),
        ]),
      );
    }
  }

  for (const route of sector.Routes) {
    const endpoints = route.PortalIds.map((id) => portals.get(id)!);
    add(
      pathOf(route.Id),
      note('route', route.Id, route.NiceName, [
        `- **Sector:** [[Sector]]\n- **Endpoint systems:** ${endpoints.map((portal) => link(portal.SystemId)).join(' ↔ ')}`,
        `## Endpoints\n\n${list(endpoints.map((portal) => `${link(portal.SystemId)} — portal at ${portal.BoundaryAngleDegrees}°`))}`,
        visibility(route),
        intelligence(route),
      ]),
    );
  }

  const objects = sector.Systems.flatMap((system) => system.Objects);
  for (const polity of sector.Polities) {
    const claimed = objects.filter((object) => object.ClaimedByPolityIds.includes(polity.Id));
    const homeworld = objects.find(
      (object): object is Planet => object.Id === polity.HomeworldId && object.Kind === 'Planet',
    );
    if (!homeworld) throw new Error(`Missing homeworld for polity ${polity.Id}`);
    add(
      pathOf(polity.Id),
      note('polity', polity.Id, polity.NiceName, [
        `![[Assets/Flags/${safeId(polity.Id)}.svg|${wikiLabel(polity.NiceName)} flag]]\n\n- **Sector:** [[Sector]]\n- **Homeworld:** ${link(polity.HomeworldId)}`,
        `## Claims\n\n${list(claimed.map((object) => link(object.Id)))}`,
        expandedCulture(sector, homeworld),
        '## Player-facing lore\n\n<!-- Add player-facing lore here. -->',
        '## GM notes\n\n<!-- Add GM notes here. -->',
      ]),
    );
  }

  return notes;
}

/** Convert one sector JSON file into a new vault folder. Existing output is never replaced. */
export async function convertJsonToVault(inputPath: string, outputDir: string): Promise<number> {
  const raw: unknown = JSON.parse(await readFile(inputPath, 'utf8'));
  const violations = checkAllInvariants(raw);
  if (violations.length)
    throw new Error(`Invalid sector JSON: ${violations[0]!.RuleId}: ${violations[0]!.Message}`);
  const notes = buildVaultNotes(raw as Sector);
  const assets = buildFlagAssets(raw as Sector);
  const destination = resolve(outputDir);
  await mkdir(dirname(destination), { recursive: true });
  await mkdir(destination);
  try {
    for (const [relativePath, content] of [...notes, ...assets]) {
      const path = join(destination, relativePath);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, { flag: 'wx' });
    }
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
  return notes.size + assets.size;
}

async function main(): Promise<void> {
  const [inputPath, outputDir] = process.argv.slice(2);
  if (!inputPath || !outputDir)
    throw new Error(
      'Usage: node --import tsx swn_sector/Obsidian/convert.ts <sector.json> <new-vault-folder>',
    );
  const count = await convertJsonToVault(inputPath, outputDir);
  console.log(`Created ${count} notes in ${resolve(outputDir)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
