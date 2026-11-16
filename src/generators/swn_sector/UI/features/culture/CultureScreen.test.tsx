// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { generate } from '../../../Generator/generate';
import { projectCultureScreen } from '../../../Projector/culture_projection';
import { projectWorldTag } from '../../../Projector/world_tag_projection';
import { CultureScreen } from './CultureScreen';
import type { Planet, WorldTag } from '../../../BaseDTO/merged_schema';

afterEach(cleanup);

test('culture tab shows every generated world as complete and keeps HPOIs closed', () => {
  const sector = generate({ seed: 'culture-screen-layout' });
  const { container } = render(<CultureScreen display={projectCultureScreen(sector)!} />);
  const cards = [...container.querySelectorAll('.culture-world')];
  expect(cards.length).toBeGreaterThan(1);
  expect(cards).toHaveLength(
    sector.Systems.flatMap((system) => system.Objects).filter(
      (object) => object.Kind === 'Planet' && object.InhabitedInfo !== false,
    ).length,
  );
  expect(cards.every((card) => card.querySelector('.culture-info-grid'))).toBe(true);
  expect(container.querySelector('[aria-label="Incomplete Worlds"] .culture-world')).toBeNull();
  expect(container.querySelectorAll('.culture-visibility, input')).toHaveLength(0);
  const first = cards[0]!;
  const boxes = first.querySelectorAll('.culture-tag-box');
  expect(boxes).toHaveLength(2);
  const firstTag = boxes[0]!.querySelector('h5')!.textContent!;
  expect(boxes[0]!.textContent).toContain(projectWorldTag(firstTag as WorldTag).description);
  expect(first.querySelector('.culture-polity-name .polity-flag')).not.toBeNull();
  const drawer = first.querySelector('details.culture-hpoi-drawer') as HTMLDetailsElement;
  expect(drawer.open).toBe(false);
  fireEvent.click(drawer.querySelector('summary')!);
  expect(drawer.open).toBe(true);
});

test('polity overview keeps starting-world priority and groups incomplete worlds', () => {
  const sector = generate({ seed: 'culture-polity-overview' });
  const worlds = sector.Systems.flatMap((system) => system.Objects).filter(
    (object): object is Planet => object.Kind === 'Planet' && object.InhabitedInfo !== false,
  );
  expect(worlds.length).toBeGreaterThan(5);
  const [largest, second] = sector.Polities;
  for (const world of worlds) world.ClaimedByPolityIds = [];
  worlds[0]!.ClaimedByPolityIds = [largest!.Id, second!.Id];
  for (const world of worlds.slice(1, 4)) world.ClaimedByPolityIds = [largest!.Id];
  for (const world of worlds.slice(4, 6)) world.ClaimedByPolityIds = [second!.Id];
  sector.StartingWorldId = worlds[2]!.Id;
  const sampleCulture = structuredClone(worlds.find((world) => world.Culture)!.Culture);
  worlds[0]!.Culture = null;
  worlds[1]!.Culture = structuredClone(sampleCulture);
  worlds[2]!.Culture = structuredClone(sampleCulture);
  worlds[3]!.Culture = null;
  const { container } = render(<CultureScreen display={projectCultureScreen(sector)!} />);
  const completedGroup = container.querySelector('[aria-label="Completed Worlds"]')!;
  const incompleteGroup = container.querySelector('[aria-label="Incomplete Worlds"]')!;
  const completedRows = [...completedGroup.querySelectorAll('.culture-polity-table tbody tr')];
  const incompleteRows = [...incompleteGroup.querySelectorAll('.culture-polity-table tbody tr')];
  expect(completedRows).toHaveLength(worlds.length - 2);
  expect(incompleteRows).toHaveLength(2);
  expect(completedRows[0]!.querySelector('a')?.getAttribute('href')).toBe(
    `#culture-world-${worlds[2]!.Id}`,
  );
  expect(completedRows[0]!.querySelector('.culture-world-status')?.textContent).toBe('Primary');
  expect(
    new Set(incompleteRows.map((row) => row.querySelector('a')?.getAttribute('href'))),
  ).toEqual(new Set([worlds[0], worlds[3]].map((world) => `#culture-world-${world!.Id}`)));
  const contestedRow = incompleteRows.find(
    (row) => row.querySelector('a')?.getAttribute('href') === `#culture-world-${worlds[0]!.Id}`,
  )!;
  expect(contestedRow.querySelector('.culture-world-status')).toBeNull();
  expect(contestedRow.querySelectorAll('td:last-child .polity-flag')).toHaveLength(2);
  expect(
    new Set(
      [...contestedRow.children[3]!.querySelectorAll('div')].map((entry) => entry.textContent),
    ),
  ).toEqual(new Set([largest!.NiceName, second!.NiceName]));
  expect(incompleteGroup.querySelector('thead')?.textContent).not.toContain('Status');
  expect(incompleteGroup.querySelectorAll('thead th')).toHaveLength(5);
  expect(completedGroup.querySelectorAll('thead th')).toHaveLength(6);
});
