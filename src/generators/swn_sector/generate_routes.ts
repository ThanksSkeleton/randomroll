import type { Route, RoutePortal, StarSystem } from './merged_schema';
import { deterministicId, randomFor } from './generation_random';

type Edge = { left: StarSystem; right: StarSystem; distance: number; tie: number };
const PORTAL_BEARING_OFFSET_DEGREES = 5;

function edges(systems: readonly StarSystem[], seed: string): Edge[] {
  return systems
    .flatMap((left, index) =>
      systems.slice(index + 1).map((right) => ({
        left,
        right,
        distance: Math.hypot(
          left.HexLocation.Column - right.HexLocation.Column,
          left.HexLocation.Row - right.HexLocation.Row,
        ),
        tie: randomFor(seed, `route-tie:${left.Id}:${right.Id}`)(),
      })),
    )
    .sort((a, b) => a.distance - b.distance || a.tie - b.tie);
}

function bearing(from: StarSystem, to: StarSystem): number {
  return (
    ((Math.atan2(
      to.HexLocation.Row - from.HexLocation.Row,
      to.HexLocation.Column - from.HexLocation.Column,
    ) *
      180) /
      Math.PI +
      360) %
    360
  );
}

export function generateRoutes(
  seed: string,
  systems: readonly StarSystem[],
): { Routes: Route[]; RoutePortals: RoutePortal[] } {
  const parents = new Map(systems.map((system) => [system.Id, system.Id]));
  const root = (id: string): string => {
    const parent = parents.get(id)!;
    if (parent === id) return id;
    const found = root(parent);
    parents.set(id, found);
    return found;
  };
  const selected: Edge[] = [];
  const available = edges(systems, seed);
  for (const edge of available)
    if (root(edge.left.Id) !== root(edge.right.Id)) {
      parents.set(root(edge.left.Id), root(edge.right.Id));
      selected.push(edge);
    }
  selected.push(
    ...available.filter((edge) => !selected.includes(edge)).slice(0, Math.ceil(systems.length / 4)),
  );
  const Routes: Route[] = [];
  const RoutePortals: RoutePortal[] = [];
  const occupiedAngles = new Map<string, Set<number>>();
  for (const [index, edge] of selected.entries()) {
    const path = `route:${String(index + 1).padStart(2, '0')}`;
    const routeId = deterministicId(seed, path);
    const portalIds = [
      deterministicId(seed, `${path}:portal:left`),
      deterministicId(seed, `${path}:portal:right`),
    ] as [string, string];
    Routes.push({
      Id: routeId,
      ProceduralName: `Route ${index + 1}`,
      NiceName: `Route ${index + 1}`,
      VisibilityLevel: 'NONE',
      Intelligence: {
        InfoboxSummary: '-',
        BasicScan: '-',
        CulturePartial: '-',
        CultureFull: '-',
        GM: '-',
      },
      PortalIds: portalIds,
    });
    for (const [side, other, id] of [
      [edge.left, edge.right, portalIds[0]],
      [edge.right, edge.left, portalIds[1]],
    ] as const) {
      let angle =
        bearing(side, other) +
        randomFor(seed, `${path}:${side.Id}:angle`)() * PORTAL_BEARING_OFFSET_DEGREES * 2 -
        PORTAL_BEARING_OFFSET_DEGREES;
      angle = (angle + 360) % 360;
      const used = occupiedAngles.get(side.Id) ?? new Set<number>();
      while (used.has(angle)) angle = (angle + 0.001) % 360;
      used.add(angle);
      occupiedAngles.set(side.Id, used);
      RoutePortals.push({
        Id: id,
        ProceduralName: `Portal ${side.NiceName}-${other.NiceName}`,
        NiceName: `Portal ${side.NiceName}-${other.NiceName}`,
        VisibilityLevel: 'NONE',
        Intelligence: {
          InfoboxSummary: '-',
          BasicScan: '-',
          CulturePartial: '-',
          CultureFull: '-',
          GM: '-',
        },
        RouteId: routeId,
        SystemId: side.Id,
        BoundaryAngleDegrees: angle,
      });
    }
  }
  return { Routes, RoutePortals };
}
