import { expect, test } from 'vitest';
import {
  angleDegrees,
  chooseWeighted,
  deterministicId,
  randomFor,
  rollDie,
  shuffled,
} from './generation_random';

test('namespaced streams and IDs are deterministic', () => {
  expect([...Array(5)].map(() => rollDie(randomFor('seed', 'system:01'), 100))).toEqual(
    [...Array(5)].map(() => rollDie(randomFor('seed', 'system:01'), 100)),
  );
  expect(deterministicId('seed', 'system:01')).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  expect(deterministicId('seed', 'system:01')).not.toBe(deterministicId('seed', 'star:01'));
});

test('random helpers preserve domains and weights', () => {
  const random = randomFor('seed', 'helpers');
  expect(shuffled(random, [1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
  expect(angleDegrees(random)).toBeGreaterThanOrEqual(0);
  expect(angleDegrees(random)).toBeLessThan(360);
  expect(chooseWeighted(random, [{ Value: 'only', Weight: 1 }]).Value).toBe('only');
});
