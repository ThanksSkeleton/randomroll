import type {
  ConquestEvent,
  Guid,
  Planet,
  Polity,
  Route,
  RoutePortal,
  StarSystem,
} from '../BaseDTO/merged_schema';
import { choose, deterministicId, randomFor } from './generation_random';

import { POLITY_FLAG_COLORS } from '../Shared/polity_flag_colors';
import { capabilityFor, type Capability } from '../Shared/politics_interpretation';
import { hexDistance } from '../Shared/hex_distance';

export interface PoliticsResult {
  Polities: Polity[];
  ConquestEvents: ConquestEvent[];
  ClaimsByObjectId: Map<Guid, Guid[]>;
}

type ResolvedPolity = Polity & Capability;
type Homeworld = { world: Planet; system: StarSystem; polity: ResolvedPolity };

function componentToHex(value: number): string {
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, '0');
}

function hslToHex(hue: number, saturation = 0.72, lightness = 0.46): string {
  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12;
    const chroma = saturation * Math.min(lightness, 1 - lightness);
    return lightness - chroma * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return `#${componentToHex(channel(0))}${componentToHex(channel(8))}${componentToHex(channel(4))}`;
}

function uniqueFieldColors(seed: string, count: number): string[] {
  if (count === 0) return [];
  const offset = randomFor(seed, 'polity-flag-field-colors')() * 360;
  return Array.from({ length: count }, (_, index) => hslToHex(offset + (index * 360) / count));
}

/** Resolves one simultaneous, non-recursive initial politics pass. */
export function resolvePolitics(
  seed: string,
  systems: readonly StarSystem[],
  routes: readonly Route[],
  routePortals: readonly RoutePortal[],
): PoliticsResult {
  const homeworlds: Homeworld[] = [];
  for (const system of systems)
    for (const object of system.Objects) {
      if (object.Kind !== 'Planet' || object.InhabitedInfo === false) continue;
      const polityId = deterministicId(seed, `polity:${object.Id}`);
      const flagRandom = randomFor(seed, `polity-flag:${polityId}`);
      const CircleColor = choose(flagRandom, POLITY_FLAG_COLORS, 'polity flag circle colors');
      homeworlds.push({
        world: object,
        system,
        polity: {
          Id: polityId,
          NiceName: object.NiceName,
          HomeworldId: object.Id,
          ...capabilityFor(object.InhabitedInfo.TechLevel, object.InhabitedInfo.Population),
          Flag: { FieldColor: '', CircleColor },
        },
      });
    }
  homeworlds.sort((left, right) => left.polity.Id.localeCompare(right.polity.Id));
  const fieldColors = uniqueFieldColors(seed, homeworlds.length);
  homeworlds.forEach(({ polity }, index) => {
    polity.Flag.FieldColor = fieldColors[index]!;
  });

  const adjacency = routeAdjacency(systems, routes, routePortals);
  const distancesByPolityId = new Map(
    homeworlds.map(({ polity, system }) => [polity.Id, routeDistances(system.Id, adjacency)]),
  );
  const homeSystemByPolityId = new Map(homeworlds.map(({ polity, system }) => [polity.Id, system]));
  const paintedByObjectId = new Map<Guid, ResolvedPolity[]>();
  for (const system of systems)
    for (const object of system.Objects) {
      const painted = homeworlds
        .filter(({ world, polity }) => {
          if (world.Id === object.Id) return true;
          if (polity.Projection < 0 || polity.ProjectionHexDistance < 0) return false;
          const distance = distancesByPolityId.get(polity.Id)?.get(system.Id);
          const homeSystem = homeSystemByPolityId.get(polity.Id)!;
          return (
            distance !== undefined &&
            distance <= polity.Projection &&
            hexDistance(homeSystem.HexLocation, system.HexLocation) <= polity.ProjectionHexDistance
          );
        })
        .map(({ polity }) => polity);
      paintedByObjectId.set(object.Id, painted);
    }

  const homeworldById = new Map(homeworlds.map((homeworld) => [homeworld.world.Id, homeworld]));
  const ClaimsByObjectId = new Map<Guid, Guid[]>();
  for (const system of systems)
    for (const object of system.Objects) {
      const painted = paintedByObjectId.get(object.Id) ?? [];
      let survivors = painted.filter(
        (candidate) =>
          !painted.some(
            (opponent) => opponent.Id !== candidate.Id && opponent.Attack > candidate.Defense,
          ),
      );
      const native = homeworldById.get(object.Id)?.polity;
      if (native && survivors.some((polity) => polity.Id === native.Id)) survivors = [native];
      ClaimsByObjectId.set(
        object.Id,
        survivors
          .sort(
            (left, right) =>
              left.NiceName.localeCompare(right.NiceName) || left.Id.localeCompare(right.Id),
          )
          .map((polity) => polity.Id),
      );
    }

  const ConquestEvents: ConquestEvent[] = [];
  for (const defender of homeworlds) {
    const painted = paintedByObjectId.get(defender.world.Id) ?? [];
    for (const attacker of painted) {
      if (attacker.Id === defender.polity.Id || attacker.Attack === 0) continue;
      const distance = distancesByPolityId.get(attacker.Id)?.get(defender.system.Id);
      if (distance === undefined) continue;
      ConquestEvents.push({
        Id: deterministicId(seed, `conquest:${attacker.Id}:${defender.world.Id}`),
        AttackerPolityId: attacker.Id,
        DefenderPolityId: defender.polity.Id,
        TargetWorldId: defender.world.Id,
        RouteDistance: distance,
        Attack: attacker.Attack,
        Defense: defender.polity.Defense,
      });
    }
  }
  ConquestEvents.sort((left, right) => left.Id.localeCompare(right.Id));

  return {
    Polities: homeworlds.map(({ polity }) => ({
      Id: polity.Id,
      NiceName: polity.NiceName,
      HomeworldId: polity.HomeworldId,
      Flag: polity.Flag,
    })),
    ConquestEvents,
    ClaimsByObjectId,
  };
}

function routeAdjacency(
  systems: readonly StarSystem[],
  routes: readonly Route[],
  routePortals: readonly RoutePortal[],
): Map<Guid, Guid[]> {
  const portalsById = new Map(routePortals.map((portal) => [portal.Id, portal]));
  const adjacency = new Map(systems.map((system) => [system.Id, [] as Guid[]]));
  for (const route of routes) {
    const first = portalsById.get(route.PortalIds[0]);
    const second = portalsById.get(route.PortalIds[1]);
    if (!first || !second) continue;
    adjacency.get(first.SystemId)?.push(second.SystemId);
    adjacency.get(second.SystemId)?.push(first.SystemId);
  }
  return adjacency;
}

function routeDistances(
  originId: Guid,
  adjacency: ReadonlyMap<Guid, readonly Guid[]>,
): Map<Guid, number> {
  const distances = new Map<Guid, number>([[originId, 0]]);
  const queue = [originId];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    const nextDistance = distances.get(current)! + 1;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (distances.has(neighbor)) continue;
      distances.set(neighbor, nextDistance);
      queue.push(neighbor);
    }
  }
  return distances;
}
