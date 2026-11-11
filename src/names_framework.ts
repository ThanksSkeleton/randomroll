import { random_multi } from './framework';
import type { NamesRow } from './table_data/names';
import rawNames from './table_data/names.json';
import seedrandom from 'seedrandom';

const names: NamesRow[] = rawNames;

const SURNAME = 'Surname';

export function full_name(
  rng: seedrandom.PRNG,
  gender: string,
  firstNameGroups: string | readonly string[],
  surnameGroups: string | readonly string[] = firstNameGroups,
): [string, string] {
  const firstGroups = toGroups(firstNameGroups);
  const lastGroups = toGroups(surnameGroups);
  const first = chooseName(rng, gender, firstGroups, 'first name');
  const surname = chooseName(rng, SURNAME, lastGroups, 'surname');
  return [first, surname];
}

function toGroups(groups: string | readonly string[]): readonly string[] {
  return typeof groups === 'string' ? [groups] : groups;
}

function chooseName(
  rng: seedrandom.PRNG,
  type: string,
  groups: readonly string[],
  label: string,
): string {
  const groupPools = [...new Set(groups)]
    .map((group) =>
      names.filter(
        (row) =>
          row.Group === group &&
          (row.Type === type || (type !== SURNAME && row.Type === 'Unisex')),
      ),
    )
    .filter((pool) => pool.length > 0);
  if (groupPools.length === 0) {
    throw new Error(`No ${label} names found for groups: ${groups.join(', ')}`);
  }
  const pool =
    groupPools.length === 1
      ? groupPools[0]!
      : groupPools[Math.floor(rng() * groupPools.length)]!;
  return random_multi(rng, pool).Name;
}
