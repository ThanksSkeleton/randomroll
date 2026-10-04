import type { AtmosphereCategory } from '../BaseDTO/merged_schema';
import rawAtmosphereDetails from '../Data/Raw/Details/atmosphere.json';
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

type GasCategory = 'Corrosive' | 'Toxic' | 'Inert' | 'Flammable';
const gasDetails = rawAtmosphereDetails.gases as Record<
  string,
  { chemicalFormula: string; longName: string }
>;
export const ATMOSPHERE_DATA = rawAtmosphereTable as unknown as AtmosphereTable;
export const GAS_CATEGORIES_BY_ID: Record<string, GasCategory> = {};
const categorizedGasIds = [
  ...ATMOSPHERE_DATA.flammableGas.map((gasId) => [gasId, 'Flammable'] as const),
  ...ATMOSPHERE_DATA.corrosiveGas.map((gasId) => [gasId, 'Corrosive'] as const),
  ...ATMOSPHERE_DATA.poison.map((gasId) => [gasId, 'Toxic'] as const),
  ...ATMOSPHERE_DATA.inertGas.map((gasId) => [gasId, 'Inert'] as const),
];
for (const [gasId, category] of categorizedGasIds) {
  if (!Object.hasOwn(gasDetails, gasId)) throw new Error(`Unknown atmosphere gas ID ${gasId}`);
  if (Object.hasOwn(GAS_CATEGORIES_BY_ID, gasId))
    throw new Error(`Atmosphere gas ${gasId} has multiple categories`);
  GAS_CATEGORIES_BY_ID[gasId] = category;
}
for (const gasId of Object.keys(gasDetails)) {
  if (!Object.hasOwn(GAS_CATEGORIES_BY_ID, gasId))
    throw new Error(`Atmosphere gas ${gasId} has no selectable category`);
}
for (const { gasId } of ATMOSPHERE_DATA.breathableBackgroundGas) {
  if (!Object.hasOwn(gasDetails, gasId)) throw new Error(`Unknown atmosphere gas ID ${gasId}`);
}
