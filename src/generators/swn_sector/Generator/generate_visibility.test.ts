import { describe, expect, it } from 'vitest';
import { generate } from './generate';

describe('generated route visibility', () => {
  it('gives every revealed starting-system route Politics 1', () => {
    const sector = generate({ seed: 'ROUTE-POLITICS-ONE' });
    const revealedRoutes = sector.Routes.filter((route) => route.Visibility.BasicScan);

    expect(revealedRoutes.length).toBeGreaterThan(0);
    for (const route of revealedRoutes) {
      expect(route.Visibility).toEqual({
        BasicScan: true,
        DetailedScan: false,
        PoliticsScan: true,
        DeepPoliticsScan: false,
      });
    }
    for (const route of sector.Routes.filter((candidate) => !candidate.Visibility.BasicScan)) {
      expect(route.Visibility).toEqual({
        BasicScan: false,
        DetailedScan: false,
        PoliticsScan: false,
        DeepPoliticsScan: false,
      });
    }
  });
});
