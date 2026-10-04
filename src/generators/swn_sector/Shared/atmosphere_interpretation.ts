import type { Atmosphere, AtmosphereCategory } from '../BaseDTO/merged_schema';
import rawDetails from '../Data/Raw/Details/atmosphere.json';
import { ATMOSPHERE_DATA, GAS_CATEGORIES_BY_ID } from './atmosphere_table';

export type GasCategory = 'Corrosive' | 'Toxic' | 'Inert' | 'Flammable';
export type Gas = {
  ChemicalFormula: string;
  LongName: string;
  Category: GasCategory;
};
export type ResolvedAtmosphere = {
  LongName: string;
  HabRating: number;
  Bar: number;
  Gases: Array<{ Gas: Gas; Percent: number }>;
};

type RawGas = { chemicalFormula: string; longName: string };
type RawGasShare = { gasId?: string; selectedGas?: boolean; percent: number };
type RawTemplate = { bar: number; gases: RawGasShare[] };
const gases = rawDetails.gases as Record<string, RawGas>;
const templates = rawDetails.templates as Record<
  string,
  RawTemplate | Record<'Low' | 'High', RawTemplate>
>;
const habRatings = rawDetails.habRatings as Record<AtmosphereCategory, number>;
const selectedGasTables: Partial<Record<AtmosphereCategory, readonly string[]>> = {
  Corrosive: ATMOSPHERE_DATA.corrosiveGas,
  Toxic: ATMOSPHERE_DATA.poison,
  Filter: ATMOSPHERE_DATA.poison,
  Flammable: ATMOSPHERE_DATA.flammableGas,
  Inert: ATMOSPHERE_DATA.inertGas,
  Breathable: ATMOSPHERE_DATA.breathableBackgroundGas.map((row) => row.gasId),
};

export function isAtmosphere(value: unknown): value is Atmosphere {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const category = candidate.Category;
  if (typeof category !== 'string' || !Object.hasOwn(habRatings, category)) return false;
  if (category === 'Pressure')
    return (
      Object.keys(candidate).length === 2 &&
      (candidate.PressureResult === 'Low' || candidate.PressureResult === 'High')
    );
  const validGases = selectedGasTables[category as AtmosphereCategory];
  if (validGases)
    return (
      Object.keys(candidate).length === 2 &&
      typeof candidate.SelectedGas === 'string' &&
      validGases.includes(candidate.SelectedGas)
    );
  return Object.keys(candidate).length === 1;
}

export function resolveAtmosphere(atmosphere: Atmosphere): ResolvedAtmosphere {
  if (!isAtmosphere(atmosphere)) throw new Error('Invalid atmosphere outcome');
  const category = atmosphere.Category;
  const source = templates[category];
  const template =
    category === 'Pressure'
      ? (source as Record<'Low' | 'High', RawTemplate>)[atmosphere.PressureResult]
      : (source as RawTemplate);
  const selectedGas = 'SelectedGas' in atmosphere ? atmosphere.SelectedGas : undefined;
  return {
    LongName:
      category === 'Pressure'
        ? `${atmosphere.PressureResult} Pressure`
        : selectedGas
          ? `${category} (${gases[selectedGas]!.longName})`
          : category,
    HabRating: habRatings[category],
    Bar: template.bar,
    Gases: template.gases.map((share) => {
      const id = share.selectedGas ? selectedGas : share.gasId;
      const gas = id && gases[id];
      if (!gas) throw new Error(`Missing atmosphere gas ${id}`);
      return {
        Gas: {
          ChemicalFormula: gas.chemicalFormula,
          LongName: gas.longName,
          Category: GAS_CATEGORIES_BY_ID[id]!,
        },
        Percent: share.percent,
      };
    }),
  };
}

export function formatAtmosphere(atmosphere: Atmosphere): string {
  if ('SelectedGas' in atmosphere)
    return `${atmosphere.Category} (${gases[atmosphere.SelectedGas]?.chemicalFormula ?? atmosphere.SelectedGas})`;
  if (atmosphere.Category === 'Pressure') return `${atmosphere.PressureResult} Pressure`;
  return atmosphere.Category;
}
