import { describe, expect, it } from 'vitest';
import { getTotalManifest, initialQueueState, queue, wrappedIndex } from './queue';

describe('portrait review queue', () => {
  it('walks only the three route sources and wraps in both directions', () => {
    expect(queue.map((item) => item.category.key + '/' + item.sourceId)).toEqual([
      'Route/01',
      'Route/02',
      'Route/03',
    ]);
    expect(queue).toHaveLength(3);
    expect(wrappedIndex(0, -1, queue.length)).toBe(2);
    expect(wrappedIndex(2, 1, queue.length)).toBe(0);
  });

  it('exports only accepted source paths and their two HSV settings', () => {
    const state = initialQueueState();
    state.entries[queue[0]!.path]!.decision = 'accepted';
    state.entries[queue[0]!.path]!.a.h = 72;
    state.entries[queue[1]!.path]!.decision = 'skipped';

    expect(getTotalManifest(state)).toEqual({
      [queue[0]!.path]: {
        a: { h: 72, s: 100, v: 100 },
        b: { h: 0, s: 100, v: 100 },
      },
    });

    state.entries[queue[0]!.path]!.decision = 'skipped';
    expect(getTotalManifest(state)).toEqual({});
  });
});
