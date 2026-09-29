import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { generate } from './generate';

const EXPECTED: Record<string, string> = {
  'sector-one-seed': 'd450b8e7ed53451af36fd47677cb191ad100a218c8cd33fe1b4b24af12670dbb',
  'sector-two-seed': 'b884c7905a4569208dc32485c7238f9de1d25cef28129023c9c50502e934ce12',
  'part-two-regression': 'd264addc605ce1bb92e6610588135fe105a70f81f3be5c92269942e76af23ecf',
};

test('fixed seed canonical output retains the pre-migration choices', () => {
  for (const [seed, expected] of Object.entries(EXPECTED)) {
    const sector = generate(seed) as unknown as Record<string, unknown>;
    sector.SchemaVersion = 'merged-v5';
    for (const system of sector.Systems as Array<{ Objects: Array<Record<string, unknown>> }>)
      for (const object of system.Objects) {
        expect(object).not.toHaveProperty('Temperature');
        const orbit = object.Orbit as { AU?: number; ParentObjectId: string | null };
        if (orbit.ParentObjectId !== null) expect(orbit).not.toHaveProperty('AU');
      }
    for (const portal of sector.RoutePortals as Array<Record<string, unknown>>)
      expect(portal).not.toHaveProperty('RouteId');
    const hash = createHash('sha256').update(JSON.stringify(sector)).digest('hex');
    expect(hash).toBe(expected);
  }
});
