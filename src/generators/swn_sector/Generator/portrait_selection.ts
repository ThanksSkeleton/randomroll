import { randomFor, rollDie } from './generation_random';
import { PORTRAIT_VARIANT_COUNT } from '../Helpers/Domain/portrait_index';

export function assignPortraitIndex(seed: string, entityId: string): number {
  return rollDie(randomFor(seed, `${entityId}:portrait`), PORTRAIT_VARIANT_COUNT) - 1;
}
