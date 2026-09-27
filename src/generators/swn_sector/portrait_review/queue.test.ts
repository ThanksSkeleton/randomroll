import { describe, expect, it } from 'vitest';
import { getTotalManifest, initialQueueState, queue, wrappedIndex } from './queue';

describe('portrait review queue', () => {
  it('walks the structure and POI sources in a stable order and wraps both ways', () => {
    expect([...new Set(queue.map((item) => item.category.key))]).toEqual([
      'independent-station', 'deep-space-station', 'asteroid-base', 'remote-moon-base',
      'ancient-orbital-ruin', 'research-base', 'asteroid-belt-poi', 'comet-base',
      'comet-belt-poi', 'gas-mine', 'refueling-station',
    ]);
    expect(queue).toHaveLength(33);
    expect(queue.slice(0, 3).map((item) => item.category.key + '/' + item.sourceId)).toEqual([
      'independent-station/01', 'independent-station/02', 'independent-station/03',
    ]);
    expect(wrappedIndex(0, -1, queue.length)).toBe(32);
    expect(wrappedIndex(32, 1, queue.length)).toBe(0);
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
