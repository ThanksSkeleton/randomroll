import type { Sector } from '../../src/generators/swn_sector/BaseDTO/merged_schema';

/** A polity is discoverable when its inhabited homeworld is player-visible. */
export function partitionHubPolities(sector: Sector): {
  visible: Sector['Polities'];
  unseen: Sector['Polities'];
} {
  const homeworlds = new Map(
    sector.Systems.flatMap((system) => system.Objects.map((object) => [object.Id, object] as const)),
  );
  const visible: Sector['Polities'] = [];
  const unseen: Sector['Polities'] = [];
  for (const polity of sector.Polities) {
    const homeworld = homeworlds.get(polity.HomeworldId);
    if (!homeworld || homeworld.Kind !== 'Planet' || homeworld.InhabitedInfo === false)
      throw new Error(`Missing inhabited homeworld for polity ${polity.Id}`);
    (homeworld.Visibility.BasicScan ? visible : unseen).push(polity);
  }
  return { visible, unseen };
}
