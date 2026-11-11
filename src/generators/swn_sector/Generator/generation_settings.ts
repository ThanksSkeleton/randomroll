export type GenerationSettings = Readonly<{ seed: string }>;

export type SectorGenerationDefaults = Readonly<{
  sectorWidth?: number;
  sectorHeight?: number;
  inhabSystemsMin?: number;
  inhabSystemsMax?: number;
  uninhabSystemsMin?: number;
  uninhabSystemsMax?: number;
}>;

export const DEFAULT_GENERATION_SETTINGS: Required<SectorGenerationDefaults> = {
  sectorWidth: 11,
  sectorHeight: 7,
  inhabSystemsMin: 21,
  inhabSystemsMax: 30,
  uninhabSystemsMin: 0,
  uninhabSystemsMax: 0,
};
