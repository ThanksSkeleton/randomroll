import { categories, defaultState, sourcePath } from './catalog';
import type { Category, Tuning, Tunings } from './catalog';

export type QueueItem = { category: Category; sourceId: string; path: string };
export type Decision = 'pending' | 'accepted' | 'skipped';
export type QueueEntry = Tunings & { decision: Decision };
export type QueueState = { cursor: number; entries: Record<string, QueueEntry> };
export type TotalManifest = Record<string, { a: Tuning; b: Tuning }>;

// The second production batch contains the independent station and ten POI banks.
const reviewCategoryKeys = [
  'independent-station',
  'deep-space-station',
  'asteroid-base',
  'remote-moon-base',
  'ancient-orbital-ruin',
  'research-base',
  'asteroid-belt-poi',
  'comet-base',
  'comet-belt-poi',
  'gas-mine',
  'refueling-station',
];
const reviewCategories = reviewCategoryKeys.map(
  (key) => categories.find((category) => category.key === key)!,
);

export const queue: QueueItem[] = reviewCategories.flatMap(
  (category) =>
    category.initial.images.map((image) => ({
      category,
      sourceId: image.sourceId,
      path: sourcePath(category, image.sourceId),
    })),
);

export function wrappedIndex(index: number, step: number, length: number): number {
  return (((index + step) % length) + length) % length;
}

export function initialQueueState(): QueueState {
  return {
    cursor: 0,
    entries: Object.fromEntries(
      queue.map((item) => {
        const tuning = defaultState(item.category)[item.sourceId]!;
        return [item.path, { decision: 'pending', a: tuning.a, b: tuning.b }];
      }),
    ),
  };
}

export function getTotalManifest(state: QueueState): TotalManifest {
  return Object.fromEntries(
    queue
      .filter((item) => state.entries[item.path]?.decision === 'accepted')
      .map((item) => {
        const entry = state.entries[item.path]!;
        return [item.path, { a: { ...entry.a }, b: { ...entry.b } }];
      }),
  );
}
