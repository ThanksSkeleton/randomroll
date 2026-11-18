import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { generate } from '../../src/generators/swn_sector/Generator/generate';
import type { Planet } from '../../src/generators/swn_sector/BaseDTO/merged_schema';
import { buildFlagAssets, buildVaultNotes, convertJsonToVault } from './convert';

const sector = generate({ seed: 'sector-one-seed' });

it('creates linked notes for the sector hierarchy and relationships', () => {
  const originalJson = JSON.stringify(sector);
  const notes = buildVaultNotes(sector);
  const assets = buildFlagAssets(sector);
  expect(buildVaultNotes(sector)).toEqual(notes);
  expect(buildFlagAssets(sector)).toEqual(assets);
  expect(JSON.stringify(sector)).toBe(originalJson);
  expect(notes.has('Sector.md')).toBe(true);

  for (const content of notes.values()) {
    for (const match of content.matchAll(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g)) {
      const target = match[1]!.endsWith('.svg') ? match[1]! : `${match[1]}.md`;
      expect(notes.has(target) || assets.has(target), `Broken link: ${match[0]}`).toBe(true);
    }
  }

  const moon = sector.Systems.flatMap((system) => system.Objects).find(
    (object) => object.Kind === 'Planet' && object.Orbit.ParentObjectId !== null,
  );
  expect(moon).toBeDefined();
  const moonNote = [...notes.entries()].find(([path]) => path.endsWith(`/Planets/${moon!.Id}.md`));
  expect(moonNote?.[1]).toContain(`moon of [[`);
  expect(moonNote?.[0]).not.toContain(`${moon!.Orbit.ParentObjectId}/Planets`);

  const system = sector.Systems[0]!;
  const poi = system.PointsOfInterest[0]!;
  const hostPath = [...notes.keys()].find((path) => path.endsWith(`/${poi.ParentObjectId}.md`));
  const poiPath = [...notes.keys()].find((path) => path.endsWith(`/POIs/${poi.Id}.md`));
  expect(poiPath).toBe(hostPath!.replace(/\.md$/, `/POIs/${poi.Id}.md`));
  expect(notes.get(poiPath!)).toContain(`[[Systems/${system.Id}/System|`);

  expect([...notes.keys()].some((path) => path.includes('Conquest'))).toBe(false);
  const polity = sector.Polities[0]!;
  const polityNote = notes.get(`Polities/${polity.Id}.md`)!;
  expect(polityNote).toContain('## LoreBuilderForWorldPolity');
  expect(polityNote).toContain('### NPCs');
  expect(polityNote).toContain('### Habitable points of interest');
  expect(assets.get(`Assets/Flags/${polity.Id}.svg`)).toContain('<circle');
  const homeworld = sector.Systems.flatMap((system) => system.Objects).find(
    (object): object is Planet => object.Id === polity.HomeworldId && object.Kind === 'Planet',
  );
  expect(homeworld?.Culture).toBeTruthy();
  expect(polityNote).toContain(homeworld!.Culture!.npcLocationBank.npcs[0]!.name);
  expect(JSON.stringify(homeworld!.Culture)).not.toContain('description');
});

it('refuses to overwrite an existing vault', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'swn-obsidian-test-'));
  try {
    const input = join(temporary, 'sector.json');
    const vault = join(temporary, 'vault');
    await writeFile(input, JSON.stringify(sector));
    await convertJsonToVault(input, vault);
    await writeFile(join(vault, 'Sector.md'), 'My edited notes');

    await expect(convertJsonToVault(input, vault)).rejects.toThrow();
    expect(await readFile(join(vault, 'Sector.md'), 'utf8')).toBe('My edited notes');
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
