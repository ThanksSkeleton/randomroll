// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { generate } from '../../../Generator/generate';
import { projectCultureScreen } from '../../../Projector/culture_projection';
import { projectWorldTag } from '../../../Projector/world_tag_projection';
import { CultureScreen } from './CultureScreen';
import type { Planet, WorldTag } from '../../../BaseDTO/merged_schema';

afterEach(cleanup);

test('culture tab shows every generated world by visibility status and keeps HPOIs closed', () => {
  const sector = generate({ seed: 'culture-screen-layout' });
  const display = projectCultureScreen(sector)!;
  const { container } = render(<CultureScreen display={display} />);
  const cards = [...container.querySelectorAll('.culture-world')];
  expect(cards.length).toBeGreaterThan(1);
  expect(cards).toHaveLength(
    sector.Systems.flatMap((system) => system.Objects).filter(
      (object) => object.Kind === 'Planet' && object.InhabitedInfo !== false,
    ).length,
  );
  expect(cards.every((card) => card.querySelector('.culture-info-grid'))).toBe(true);
  const labeledGroup = container.querySelector(
    '[aria-label="Visibility status: Visible"]',
  )!;
  const unlabeledGroup = container.querySelector('[aria-label="Visibility status: Unlabeled"]')!;
  expect(labeledGroup.querySelectorAll('.culture-world')).toHaveLength(
    display.worlds.filter((world) => world.realizationTier !== null).length,
  );
  expect(unlabeledGroup.querySelectorAll('.culture-world')).toHaveLength(
    display.worlds.filter((world) => world.realizationTier === null).length,
  );
  for (const table of container.querySelectorAll('.culture-polity-table')) {
    expect(table.querySelector('thead')?.textContent).toContain('Visibility status');
    expect(table.querySelector('thead')?.textContent).toContain('System');
    expect(table.querySelector('thead')?.textContent).toContain('Polity Name');
    expect(table.querySelector('thead')?.textContent).toContain('Claimants');
    expect(table.querySelectorAll('thead th')).toHaveLength(5);
  }
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

test('polity overview keeps starting-world priority and groups worlds by visibility status', () => {
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
  const labeledGroup = container.querySelector(
    '[aria-label="Visibility status: Visible"]',
  )!;
  const unlabeledGroup = container.querySelector('[aria-label="Visibility status: Unlabeled"]')!;
  const labeledRows = [...labeledGroup.querySelectorAll('.culture-polity-table tbody tr')];
  const unlabeledRows = [...unlabeledGroup.querySelectorAll('.culture-polity-table tbody tr')];
  const projected = projectCultureScreen(sector)!;
  expect(labeledRows).toHaveLength(
    projected.overview.filter((row) => row.realizationTier !== null).length,
  );
  expect(unlabeledRows).toHaveLength(
    projected.overview.filter((row) => row.realizationTier === null).length,
  );
  expect(labeledRows[0]!.querySelector('th[scope="row"]')?.textContent).toBe(
    projected.overview.find((row) => row.worldId === worlds[2]!.Id)?.worldName,
  );
  expect(labeledRows[0]!.querySelector('.culture-world-status')?.textContent).toBe('Primary');
  expect(
    labeledRows.map((row) => row.querySelector('.culture-world-status')?.textContent),
  ).toEqual(['Primary', 'Secondary', 'Tertiary'].filter((tier) =>
    projected.overview.some((row) => row.realizationTier === tier),
  ).flatMap((tier) =>
    projected.overview
      .filter((row) => row.realizationTier === tier)
      .map(() => tier),
  ));
  for (const tier of ['Primary', 'Secondary', 'Tertiary'] as const) {
    const systemsInGrid = labeledRows
      .filter((row) => row.querySelector('.culture-world-status')?.textContent === tier)
      .map((row) => row.children[1]?.textContent);
    expect(systemsInGrid).toEqual(
      projected.overview
        .filter((row) => row.realizationTier === tier)
        .map((row) => row.systemName)
        .sort((a, b) => a.localeCompare(b)),
    );
  }
  expect(
    unlabeledRows.map((row) => row.children[1]?.textContent),
  ).toEqual(
    projected.overview
      .filter((row) => row.realizationTier === null)
      .map((row) => row.systemName)
      .sort((a, b) => a.localeCompare(b)),
  );
  const contestedRow = [...labeledRows, ...unlabeledRows].find(
    (row) =>
      row.querySelector('th[scope="row"]')?.textContent ===
      projected.overview.find((entry) => entry.worldId === worlds[0]!.Id)?.worldName,
  )!;
  expect(contestedRow.querySelector('.culture-world-status')?.textContent).toBe(
    projected.overview.find((row) => row.worldId === worlds[0]!.Id)?.realizationTier ?? '—',
  );
  expect(contestedRow.querySelectorAll('.culture-overview-claimants .polity-flag')).toHaveLength(2);
  expect(contestedRow.querySelector('.culture-overview-claimants')?.textContent).toContain(
    largest!.NiceName,
  );
  expect(contestedRow.querySelector('.culture-overview-claimants')?.textContent).toContain(
    second!.NiceName,
  );
  expect(unlabeledGroup.querySelector('thead')?.textContent).toContain('Visibility status');
  expect(unlabeledGroup.querySelectorAll('thead th')).toHaveLength(5);
  expect(labeledGroup.querySelectorAll('thead th')).toHaveLength(5);
});
