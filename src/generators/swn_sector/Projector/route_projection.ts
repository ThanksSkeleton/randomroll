import type { RouteDisplayDTO } from '../DisplayDTO/dto';
import type { HexLocation, Route, RoutePortal, Sector, StarSystem } from '../BaseDTO/merged_schema';

export function hexRouteDistance(first: HexLocation, second: HexLocation): number {
  const firstQ = first.Column - 1;
  const secondQ = second.Column - 1;
  const firstR = first.Row - 1 - Math.floor(firstQ / 2);
  const secondR = second.Row - 1 - Math.floor(secondQ / 2);
  const firstY = -firstQ - firstR;
  const secondY = -secondQ - secondR;
  return Math.max(
    Math.abs(firstQ - secondQ),
    Math.abs(firstY - secondY),
    Math.abs(firstR - secondR),
  );
}

function routeEndpointName(system: StarSystem, route: Route, preview: 'gm' | 'player') {
  return preview === 'gm' || route.Visibility.PoliticsScan
    ? system.NiceName
    : system.ProceduralName;
}

export function owningRoute(sector: Sector, portalId: string): Route | undefined {
  const owners = sector.Routes.filter((route) => route.PortalIds.includes(portalId));
  return owners.length === 1 ? owners[0] : undefined;
}

export function projectRoute(
  sector: Sector,
  routeId: string,
  preview: 'gm' | 'player',
): RouteDisplayDTO | undefined {
  const route = sector.Routes.find((candidate) => candidate.Id === routeId);
  if (!route) return undefined;
  if (route.PortalIds[0] === route.PortalIds[1]) return undefined;
  const portals = route.PortalIds.map((id) =>
    sector.RoutePortals.find((portal) => portal.Id === id),
  ) as [RoutePortal | undefined, RoutePortal | undefined];
  if (!portals[0] || !portals[1]) return undefined;
  if (portals.some((portal) => owningRoute(sector, portal!.Id)?.Id !== route.Id)) return undefined;
  const systems = portals.map((portal) =>
    sector.Systems.find((system) => system.Id === portal!.SystemId),
  ) as [StarSystem | undefined, StarSystem | undefined];
  if (!systems[0] || !systems[1]) return undefined;
  const [first, second] = systems as [StarSystem, StarSystem];
  if (first.Id === second.Id) return undefined;
  const endpointNames = [
    routeEndpointName(first, route, preview),
    routeEndpointName(second, route, preview),
  ] as const;
  const distance = hexRouteDistance(first.HexLocation, second.HexLocation);
  const symbolicName = (system: StarSystem) =>
    (preview === 'gm' || route.Visibility.PoliticsScan ? system.NiceName : system.ProceduralName) ||
    system.Id ||
    'System';
  const topDownName = (system: StarSystem) => {
    const preferred = routeEndpointName(system, route, preview);
    return preferred.trim() || system.ProceduralName;
  };
  return {
    id: route.Id,
    portalIds: [...route.PortalIds],
    endpointSystemIds: [first.Id, second.Id],
    endpointHexes: [{ ...first.HexLocation }, { ...second.HexLocation }],
    hexDistance: distance,
    inspectorBasic: `${endpointNames[0]} <=> ${endpointNames[1]}\nSpike Length: ${distance}`,
    endpointNames,
    symbolicDestinations: [symbolicName(first), symbolicName(second)],
    topDownDestinations: [topDownName(first), topDownName(second)],
  };
}
