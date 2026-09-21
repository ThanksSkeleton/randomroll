import { VisibilityLevel } from '../../../merged_schema';
import type { VisibilityLevel as VisibilityLevelType } from '../../../merged_schema';

export { VisibilityLevel };
export type { VisibilityLevelType };

export function visibilityRank(level: VisibilityLevelType): number {
  return level === VisibilityLevel.NONE
    ? 0
    : level === VisibilityLevel.BASIC_SCAN
      ? 1
      : level === VisibilityLevel.CULTURE_PARTIAL
        ? 2
        : 3;
}
