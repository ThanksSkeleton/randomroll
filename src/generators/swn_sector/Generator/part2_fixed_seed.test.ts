import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { generate } from './generate';
import { projectPortrait } from '../Projector/portrait_projection';

const EXPECTED: Record<string, string> = {
  'sector-one-seed': 'd450b8e7ed53451af36fd47677cb191ad100a218c8cd33fe1b4b24af12670dbb',
  'sector-two-seed': 'b884c7905a4569208dc32485c7238f9de1d25cef28129023c9c50502e934ce12',
  'part-two-regression': 'd264addc605ce1bb92e6610588135fe105a70f81f3be5c92269942e76af23ecf',
};

test('fixed seed canonical output retains earlier choices through portrait projection', () => {
  for (const [seed, expected] of Object.entries(EXPECTED)) {
    const sector = generate(seed);
    expect(sector.SchemaVersion).toBe('merged-v6');
    for (const system of sector.Systems)
      for (const object of system.Objects) {
        expect(object).not.toHaveProperty('Temperature');
        const orbit = object.Orbit;
        if (orbit.ParentObjectId !== null) expect(orbit).not.toHaveProperty('AU');
      }
    for (const portal of sector.RoutePortals) expect(portal).not.toHaveProperty('RouteId');
    const priorShape = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(priorShape);
      if (value === null || typeof value !== 'object') return value;
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => {
          if (key === 'SchemaVersion') return [key, 'merged-v5'];
          if (key === 'PortraitIndex') {
            const entity = value as { Id: string };
            const projected = projectPortrait(sector, entity.Id, 'gm', '');
            expect(projected?.portraitIndex).toBe(item);
            return ['PortraitAssetId', projected?.variantId];
          }
          return [key, priorShape(item)];
        }),
      );
    };
    const hash = createHash('sha256')
      .update(JSON.stringify(priorShape(sector)))
      .digest('hex');
    expect(hash).toBe(expected);
  }
});
