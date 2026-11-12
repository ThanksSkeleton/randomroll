import type { Guid, Sector } from '../BaseDTO/merged_schema';

export type CultureRealizationTier = 'Primary' | 'Secondary' | 'Tertiary';

/** Returns the non-recursive system set realized around the starting world. */
export function cultureRealizationTiers(
  sector: Pick<Sector, 'StartingWorldId' | 'Systems' | 'Routes' | 'RoutePortals' | 'Polities'>,
): Map<Guid, CultureRealizationTier> {
  if (!sector.StartingWorldId) return new Map();
  const centralSystem = sector.Systems.find((system) =>
    system.Objects.some((object) => object.Id === sector.StartingWorldId),
  );
  if (!centralSystem) return new Map();

  const tiers = new Map<Guid, CultureRealizationTier>([[centralSystem.Id, 'Primary']]);
  for (const route of sector.Routes) {
    const portals = route.PortalIds.map((id) =>
      sector.RoutePortals.find((portal) => portal.Id === id),
    );
    if (!portals.some((portal) => portal?.SystemId === centralSystem.Id)) continue;
    for (const portal of portals)
      if (portal && portal.SystemId !== centralSystem.Id)
        tiers.set(portal.SystemId, 'Secondary');
  }

  const homeSystemIdByWorldId = new Map(
    sector.Systems.flatMap((system) =>
      system.Objects.map((object) => [object.Id, system.Id] as const),
    ),
  );
  const homeSystemIdByPolityId = new Map(
    sector.Polities.map((polity) => [polity.Id, homeSystemIdByWorldId.get(polity.HomeworldId)]),
  );
  const centralAndSecondaryIds = new Set(tiers.keys());
  for (const system of sector.Systems) {
    if (!centralAndSecondaryIds.has(system.Id)) continue;
    for (const object of system.Objects)
      for (const polityId of object.ClaimedByPolityIds) {
        const homeSystemId = homeSystemIdByPolityId.get(polityId);
        if (homeSystemId && !centralAndSecondaryIds.has(homeSystemId))
          tiers.set(homeSystemId, 'Tertiary');
      }
  }
  return tiers;
}
