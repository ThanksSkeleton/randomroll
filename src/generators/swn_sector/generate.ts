import type { Sector, StarType } from './merged_schema';
import { chooseWeighted, deterministicId, randomFor, rollDie, shuffled } from './generation_random';
import { STAR_TABLE } from './generation_rules';
import { generateRoutes } from './generate_routes';
import { generateCompleteSystem } from './generate_system';

export function generate(seed: string): Sector {
  const count = rollDie(randomFor(seed, 'sector:system-count'), 10) + 20;
  const cells = shuffled(
    randomFor(seed, 'sector:grid'),
    Array.from({ length: 80 }, (_, index) => ({
      Column: (index % 10) + 1,
      Row: Math.floor(index / 10) + 1,
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
  const shipName = 'Player ship';
  return {
    SchemaVersion: 'merged-v1',
    OriginalSeed: seed,
    SectorName: `Sector ${seed}`,
    Systems,
    Routes,
    RoutePortals,
    PlayerShip: {
      Id: deterministicId(seed, 'player-ship'),
      ProceduralName: shipName,
      NiceName: shipName,
      VisibilityLevel: 'NONE',
      Intelligence: {
        InfoboxSummary: '-',
        BasicScan: '-',
        CulturePartial: '-',
        CultureFull: '-',
        GM: '-',
      },
      CurrentLocationId: Systems[0]!.Star.Id,
    },
  };
}
