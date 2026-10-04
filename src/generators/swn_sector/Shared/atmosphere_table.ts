import type { AtmosphereCategory } from '../BaseDTO/merged_schema';
import rawWorldAttributes from '../Data/Raw/Tables/world_attributes.json';

type AtmosphereTable = {
  rows: Array<{ roll: string; result: AtmosphereCategory }>;
  flammableGas: string[];
  corrosiveGas: string[];
  poison: string[];
  inertGas: string[];
  breathableBackgroundGas: Array<{ gasId: string; weight: number }>;
  pressureResult: Array<'Low' | 'High'>;
};

const rawAtmosphereTable = rawWorldAttributes.tables.find((table) => table.id === 'atmosphere');
if (!rawAtmosphereTable) throw new Error('Missing atmosphere table');

export const ATMOSPHERE_DATA = rawAtmosphereTable as AtmosphereTable;
