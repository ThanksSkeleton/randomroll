import { describe, expect, it } from 'vitest';
import { getTotalManifest, initialQueueState, queue, wrappedIndex } from './queue';

describe('portrait review queue', () => {
  it('walks all nine sources in a stable order and wraps in both directions', () => {
    expect(queue.map((item) => item.category.key + '/' + item.sourceId)).toEqual([
      'mercurian/01',
      'mercurian/02',
      'mercurian/03',
      'europan-water/01',
      'europan-water/02',
      'europan-water/03',
      'europan-ice/01',
      'europan-ice/02',
      'europan-ice/03',
    ]);
    expect(wrappedIndex(0, -1, queue.length)).toBe(8);
    expect(wrappedIndex(8, 1, queue.length)).toBe(0);
  });

  it('exports only accepted source paths and their two HSV settings', () => {
    const state = initialQueueState();
    state.entries[queue[0]!.path]!.decision = 'accepted';
    state.entries[queue[0]!.path]!.a.h = 72;
    state.entries[queue[1]!.path]!.decision = 'skipped';

    expect(getTotalManifest(state)).toEqual({
      [queue[0]!.path]: {
        a: { h: 72, s: 110, v: 100 },
        b: { h: -35, s: 90, v: 110 },
      },
    });

    state.entries[queue[0]!.path]!.decision = 'skipped';
    expect(getTotalManifest(state)).toEqual({});
  });
});
