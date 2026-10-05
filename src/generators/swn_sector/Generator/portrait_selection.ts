import { randomFor, rollDie } from './generation_random';
import type { GenerationSettings } from './generation_settings';
import { PORTRAIT_VARIANT_COUNT } from '../Shared/portrait_index';

export function assignPortraitIndex(
  generationSettings: GenerationSettings,
  entityId: string,
): number {
  return rollDie(randomFor(generationSettings, `${entityId}:portrait`), PORTRAIT_VARIANT_COUNT) - 1;
}
