import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { generate } from './generate';
import { projectPortrait } from '../Projector/portrait_projection';
import { projectPolity } from '../Projector/politics_projection';
import type { WorldTag } from '../BaseDTO/merged_schema';

const EXPECTED: Record<string, string> = {
  'sector-one-seed': 'f18435b62c1b3729b45a85e8710dbfbb5ac86108f5ef57f58a729d72cf0b865f',
  'sector-two-seed': 'c427d03b6cd66f94facdc1502911510a23bdd3266fa13e34b894f4586467af34',
  'part-two-regression': 'b01bf56042af4a4bce03d0087ecc4ca151d56ee1d507ff443b3583219c422983',
};

test('fixed seed canonical output stays deterministic through portrait projection', () => {
  const observed: Record<string, string> = {};
  for (const seed of Object.keys(EXPECTED)) {
    const sector = generate(seed);
    expect(generate(seed)).toEqual(sector);
    expect(sector.SchemaVersion).toBe('merged-v9');
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
    observed[seed] = hash;
  }
  expect(observed).toEqual(EXPECTED);
});
