import type { HabitablePointOfInterestType } from '../../BaseDTO/merged_schema';

export const HPOI_MARKER: Readonly<Record<HabitablePointOfInterestType, string>> = {
  'Orbital Station': '◈',
  Starport: '✦',
  'Planetary Defenses': '⬡',
  Garrison: '▣',
};
