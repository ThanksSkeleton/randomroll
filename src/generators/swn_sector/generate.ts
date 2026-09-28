import type { Planet, Sector, StarType, StartingWorldMode } from './merged_schema';
import {
  choose,
  chooseWeighted,
  deterministicId,
  randomFor,
  rollDie,
  shuffled,
} from './generation_random';
import { STAR_TABLE } from './generation_rules';
import { generateRoutes } from './generate_routes';
import { generateCompleteSystem } from './generate_system';
import { resolvePolitics } from './politics';

export function generate(
  seed: string,
  startingWorldMode: StartingWorldMode = 'UNRESTRICTED',
): Sector {
  const count = rollDie(randomFor(seed, 'sector:system-count'), 10) + 20;
  const cells = shuffled(
    randomFor(seed, 'sector:grid'),
    Array.from({ length: 77 }, (_, index) => ({
      Column: (index % 11) + 1,
      Row: Math.floor(index / 11) + 1,
    })),
  );
  const Systems = cells.slice(0, count).map((hexLocation, index) => {
    const path = `system:${String(index + 1).padStart(2, '0')}`;
    const star = chooseWeighted(randomFor(seed, `${path}:star`), STAR_TABLE, 'star candidates');
    return generateCompleteSystem({
      seed,
      entityPath: path,
      hexLocation,
      starType: star.Value as StarType,
      starHabitability: star.Hab ?? 0,
    });
  });
  const { Routes, RoutePortals } = generateRoutes(seed, Systems);
  const politics = resolvePolitics(seed, Systems, Routes, RoutePortals);
  for (const system of Systems)
    for (const object of system.Objects)
      object.ClaimedByPolityIds = politics.ClaimsByObjectId.get(object.Id) ?? [];
  const candidates = Systems.flatMap((system) => system.Objects)
    .filter(
      (object): object is Planet => object.Kind === 'Planet' && object.InhabitedInfo !== false,
    )
    .filter((planet) => eligibleStartingWorld(planet, startingWorldMode))
    .sort((a, b) => a.Id.localeCompare(b.Id));
  if (candidates.length === 0)
    throw new Error(
      `Starting-world mode ${startingWorldMode} failed: no eligible inhabited world was generated. Choose another mode or generate a different sector.`,
    );
  const startingWorld = choose(
    randomFor(seed, 'starting-world'),
    candidates,
    'eligible starting worlds',
  );
  const startingSystem = Systems.find((system) =>
    system.Objects.some((object) => object.Id === startingWorld.Id),
  )!;
  const setVisibility = (
    entity: { Visibility: Planet['Visibility'] },
    flags: Partial<Planet['Visibility']>,
  ) => {
    entity.Visibility = { ...entity.Visibility, ...flags };
  };
  const startingVisibility = { BasicScan: true, PoliticsScan: true, DeepPoliticsScan: true };
  for (const entity of [startingSystem, startingSystem.Star, ...startingSystem.Objects])
    setVisibility(entity, startingVisibility);
  const shipVisibility = {
    BasicScan: true,
    DetailedScan: false,
    PoliticsScan: true,
    DeepPoliticsScan: true,
  };
  const neighboringSystemIds = new Set<string>();
  for (const route of Routes) {
    const portals = route.PortalIds.map((id) => RoutePortals.find((portal) => portal.Id === id)!);
    if (!portals.some((portal) => portal.SystemId === startingSystem.Id)) continue;
    setVisibility(route, { BasicScan: true, PoliticsScan: true });
    for (const portal of portals) {
      setVisibility(portal, { BasicScan: true });
      if (portal.SystemId !== startingSystem.Id) neighboringSystemIds.add(portal.SystemId);
    }
  }
  for (const system of Systems) {
    if (!neighboringSystemIds.has(system.Id)) continue;
    const neighborVisibility = { BasicScan: true, PoliticsScan: true };
    for (const entity of [system, system.Star, ...system.Objects])
      setVisibility(entity, neighborVisibility);
    for (const portal of RoutePortals)
      if (portal.SystemId === system.Id) setVisibility(portal, neighborVisibility);
  }
  const shipName = 'Player ship';
  return {
    SchemaVersion: 'merged-v2',
    OriginalSeed: seed,
    StartingWorldMode: startingWorldMode,
    SectorName: `Sector ${seed}`,
    Systems,
    Routes,
    RoutePortals,
    Polities: politics.Polities,
    ConquestEvents: politics.ConquestEvents,
    PlayerShip: {
      Id: deterministicId(seed, 'player-ship'),
      ProceduralName: shipName,
      NiceName: shipName,
      Visibility: shipVisibility,
      Intelligence: {
        InfoboxSummary: '-',
        BasicScan: '-',
        DetailedScan: '-',
        PoliticsScan: '-',
        DeepPoliticsScan: '-',
        GM: '-',
      },
      CurrentLocationId: startingWorld.Id,
    },
    StartingWorldId: startingWorld.Id,
  };
}

function eligibleStartingWorld(planet: Planet, mode: StartingWorldMode): boolean {
  if (planet.InhabitedInfo === false) return false;
  if (mode === 'UNRESTRICTED') return true;
  const { TechLevel, Population } = planet.InhabitedInfo;
  const qualifiesForTl4 =
    TechLevel === 'Modern postech' ||
    TechLevel === 'Postech with specialties' ||
    TechLevel === 'Pretech with surviving infrastructure';
  return qualifiesForTl4 && (mode === 'TL4_PLUS' || Population !== 'Fewer than 500');
}
