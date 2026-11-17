import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { generate } from '../../src/generators/swn_sector/Generator/generate';
import { buildVaultNotes, convertJsonToVault } from './convert';

const sector = generate({ seed: 'sector-one-seed' });

it('creates linked notes for the sector hierarchy and relationships', () => {
  const notes = buildVaultNotes(sector);
  expect(notes.has('Sector.md')).toBe(true);

  for (const content of notes.values()) {
    for (const match of content.matchAll(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g)) {
      expect(notes.has(`${match[1]}.md`), `Broken link: ${match[0]}`).toBe(true);
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
