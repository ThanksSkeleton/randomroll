import type { SectorGenerationDefaults } from './generation_settings';
import type { StartingWorldMode } from '../BaseDTO/merged_schema';

/** Default sector dimensions and system counts used when generation settings omit them. */
export const DEFAULT_GENERATION_SETTINGS: Required<SectorGenerationDefaults> = {
  sectorWidth: 11,
  sectorHeight: 7,
  inhabSystemsMin: 21,
  inhabSystemsMax: 30,
  uninhabSystemsMin: 0,
  uninhabSystemsMax: 0,
};

/** The current selection mode allows any inhabited planet or moon to start on. */
export const DEFAULT_STARTING_WORLD_MODE: StartingWorldMode = 'UNRESTRICTED';

/** Alien-dependent world tags are currently left out of generated world tag pairs. */
export const DEFAULT_HAS_ALIENS = false;
