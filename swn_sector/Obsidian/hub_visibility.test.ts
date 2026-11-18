import { describe, expect, it } from 'vitest';
import type { Sector } from '../../src/generators/swn_sector/BaseDTO/merged_schema';
import { cultureRealizationTiers } from '../../src/generators/swn_sector/Shared/culture_realization_tiers';
import { partitionHubPolities } from './hub_visibility';

describe('vault hub visibility', () => {
  it('follows homeworld scan visibility even when culture tier stays the same', () => {
    const world = {
      Id: 'world',
      Kind: 'Planet',
      InhabitedInfo: {},
      ClaimedByPolityIds: [],
      Visibility: {
        BasicScan: false,
        DetailedScan: false,
        PoliticsScan: false,
        DeepPoliticsScan: false,
      },
    };
    const polity = { Id: 'polity', HomeworldId: world.Id };
    const sector = {
      StartingWorldId: world.Id,
      Systems: [{ Id: 'system', Objects: [world] }],
      Routes: [],
      RoutePortals: [],
      Polities: [polity],
    } as unknown as Sector;
    const tiersBefore = cultureRealizationTiers(sector);

    world.Visibility.BasicScan = false;
    world.Visibility.DetailedScan = false;
    world.Visibility.PoliticsScan = false;
    world.Visibility.DeepPoliticsScan = false;
    expect(partitionHubPolities(sector).unseen).toContain(polity);

    world.Visibility.BasicScan = true;
    expect(partitionHubPolities(sector).visible).toContain(polity);
    expect(cultureRealizationTiers(sector)).toEqual(tiersBefore);
  });
});
