export type GenerationSettings = Readonly<{ seed: string }>;

export type SectorGenerationDefaults = Readonly<{
  sectorWidth?: number;
  sectorHeight?: number;
  inhabSystemsMin?: number;
  inhabSystemsMax?: number;
  uninhabSystemsMin?: number;
  uninhabSystemsMax?: number;
}>;
