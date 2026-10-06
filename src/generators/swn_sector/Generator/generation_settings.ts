export type GenerationPresetId = 'default' | 'plus-uninhab';

export type GenerationSettings = Readonly<{
  seed: string;
  sectorWidth?: number;
  sectorHeight?: number;
  inhabSystemsMin?: number;
  inhabSystemsMax?: number;
  uninhabSystemsMin?: number;
  uninhabSystemsMax?: number;
}>;

export const GENERATION_PRESETS = {
  default: {
    sectorWidth: 11,
    sectorHeight: 7,
    inhabSystemsMin: 21,
    inhabSystemsMax: 30,
    uninhabSystemsMin: 0,
    uninhabSystemsMax: 0,
  },
  'plus-uninhab': {
    sectorWidth: 11,
    sectorHeight: 7,
    inhabSystemsMin: 21,
    inhabSystemsMax: 30,
    uninhabSystemsMin: 5,
    uninhabSystemsMax: 10,
  },
} as const;

export const DEFAULT_GENERATION_SETTINGS = GENERATION_PRESETS.default;
