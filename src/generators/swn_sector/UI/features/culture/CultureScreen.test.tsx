// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { generate } from '../../../Generator/generate';
import { projectCultureScreen } from '../../../Projector/culture_projection';
import { projectWorldTag } from '../../../Projector/world_tag_projection';
import { CultureScreen } from './CultureScreen';
import type { Planet, WorldTag } from '../../../BaseDTO/merged_schema';

afterEach(cleanup);

test('culture tab puts complete worlds first and keeps HPOIs closed', () => {
  const sector = generate({ seed: 'culture-screen-layout' });
  const { container } = render(
    <CultureScreen display={projectCultureScreen(sector)!} onCompleteWorld={() => {}} />,
  );
  const cards = [...container.querySelectorAll('.culture-world')];
  expect(cards.length).toBeGreaterThan(1);
  const statuses = cards.map((card) =>
    card.querySelector('p')?.textContent?.includes(' · Complete · '),
  );
  expect(statuses).toContain(true);
  expect(statuses).toContain(false);
  expect(statuses).toEqual([...statuses].sort((a, b) => Number(b) - Number(a)));
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

test('polity overview ranks current polities by inhabited-world count', () => {
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
  const { container } = render(
    <CultureScreen display={projectCultureScreen(sector)!} onCompleteWorld={() => {}} />,
  );
  const rows = [...container.querySelectorAll('.culture-polity-table tbody tr')];
  expect(rows).toHaveLength(worlds.length);
  const rowWorldIds = rows.map((row) => row.querySelector('a')?.getAttribute('href'));
  expect(new Set(rowWorldIds.slice(0, 4))).toEqual(
    new Set(worlds.slice(0, 4).map((world) => `#culture-world-${world.Id}`)),
  );
  expect(new Set(rowWorldIds.slice(4, 6))).toEqual(
    new Set(worlds.slice(4, 6).map((world) => `#culture-world-${world.Id}`)),
  );
  expect(rowWorldIds[0]).toBe(`#culture-world-${worlds[2]!.Id}`);
  expect(rowWorldIds[1]).toBe(`#culture-world-${worlds[1]!.Id}`);
  expect(rows[0]!.querySelector('.culture-world-status')?.textContent).toBe('★');
  expect(rows[1]!.querySelector('.culture-world-status')?.textContent).toBe('✓');
  expect(rows.slice(6).every((row) => row.children[4]?.textContent === 'None')).toBe(true);
  const contestedRow = rows.find(
    (row) => row.querySelector('a')?.getAttribute('href') === `#culture-world-${worlds[0]!.Id}`,
  )!;
  expect(contestedRow.querySelector('.culture-world-status')?.textContent).toBe('');
  expect(contestedRow.querySelectorAll('td:last-child .polity-flag')).toHaveLength(2);
  expect(contestedRow.children[4]?.firstElementChild?.textContent).toBe(largest!.NiceName);
  expect(container.querySelectorAll('.culture-polity-table thead th')).toHaveLength(6);
});
