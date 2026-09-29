import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { generate } from './generate';
import { projectPortrait } from '../Projector/portrait_projection';
import { projectPolity } from '../Projector/politics_projection';
import type { WorldTag } from '../BaseDTO/merged_schema';

const EXPECTED: Record<string, string> = {
  'sector-one-seed': 'd450b8e7ed53451af36fd47677cb191ad100a218c8cd33fe1b4b24af12670dbb',
  'sector-two-seed': 'b884c7905a4569208dc32485c7238f9de1d25cef28129023c9c50502e934ce12',
  'part-two-regression': 'd264addc605ce1bb92e6610588135fe105a70f81f3be5c92269942e76af23ecf',
};

test('fixed seed canonical output retains earlier choices through portrait projection', () => {
  for (const [seed, expected] of Object.entries(EXPECTED)) {
    const sector = generate(seed);
    expect(sector.SchemaVersion).toBe('merged-v7');
    for (const system of sector.Systems)
      for (const object of system.Objects) {
        expect(object).not.toHaveProperty('Temperature');
        const orbit = object.Orbit;
        if (orbit.ParentObjectId !== null) expect(orbit).not.toHaveProperty('AU');
      }
    for (const portal of sector.RoutePortals) expect(portal).not.toHaveProperty('RouteId');
    const priorShape = (value: unknown, tags?: [WorldTag, WorldTag]): unknown => {
      if (Array.isArray(value)) return value.map((item) => priorShape(item, tags));
      if (value === null || typeof value !== 'object') return value;
      const record = value as Record<string, unknown>;
      if ('HomeworldId' in record && 'Flag' in record) {
        const polity = projectPolity(sector, record.Id as string)!;
        return {
          Id: record.Id,
          NiceName: record.NiceName,
          HomeworldId: record.HomeworldId,
          Attack: polity.attack,
          Defense: polity.defense,
          Projection: polity.projection,
          Flag: priorShape(record.Flag),
        };
      }
      if ('AttackerPolityId' in record) {
        return {
          ...Object.fromEntries(
            Object.entries(record).map(([key, item]) => [key, priorShape(item)]),
          ),
          Outcome: (record.Attack as number) > (record.Defense as number) ? 'CONQUEST' : 'DEFENSE',
        };
      }
      if ('adventureComponents' in record && tags) {
        return {
          worldTags: tags,
          ...Object.fromEntries(
            Object.entries(record).map(([key, item]) => [key, priorShape(item, tags)]),
          ),
        };
      }
      if ('prompts' in record && tags) {
        return Object.fromEntries(
          Object.entries(record).map(([key, item]) => [
            key,
            key === 'prompts'
              ? (item as Array<{ prompt: string }>).map((prompt, index) => ({
                  prompt: prompt.prompt,
                  sourceTag: tags[index],
                }))
              : priorShape(item, tags),
          ]),
        );
      }
      return Object.fromEntries(
        Object.entries(value).flatMap(([key, item]) => {
          if (key === 'SchemaVersion') return [[key, 'merged-v5']];
          if (key === 'PortraitIndex') {
            const entity = value as { Id: string };
            const projected = projectPortrait(sector, entity.Id, 'gm', '');
            expect(projected?.portraitIndex).toBe(item);
            return [['PortraitAssetId', projected?.variantId]];
          }
          if (key === 'Culture' && record.Kind === 'Planet') {
            const worldTags = (record.InhabitedInfo as { WorldTags?: [WorldTag, WorldTag] })
              .WorldTags;
            return [
              ['Complete', Boolean(item)],
              [key, priorShape(item, worldTags)],
            ];
          }
          return [[key, priorShape(item, tags)]];
        }),
      );
    };
    const hash = createHash('sha256')
      .update(JSON.stringify(priorShape(sector)))
      .digest('hex');
    expect(hash).toBe(expected);
  }
});
