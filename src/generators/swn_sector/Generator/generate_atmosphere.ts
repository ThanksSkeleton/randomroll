import type { Atmosphere, AtmosphereCategory } from '../BaseDTO/merged_schema';
import rawDetails from '../Data/Raw/Details/atmosphere.json';
import { ATMOSPHERE_DATA } from '../Shared/atmosphere_table';
import { choose, chooseWeighted, randomFor } from './generation_random';
import type { GenerationSettings } from './generation_settings';
import { ATMOSPHERE_TABLE } from './generation_rules';

export function generateAtmosphere(
  generationSettings: GenerationSettings,
  path: string,
): Atmosphere {
  const category = chooseWeighted(
    randomFor(generationSettings, `${path}:atmosphere`),
    ATMOSPHERE_TABLE,
    'atmosphere classes',
  ).Value;
  const random = randomFor(generationSettings, `${path}:atmosphere-detail`);
  if (category === 'Pressure')
    return {
      Category: category,
      PressureResult: choose(random, ATMOSPHERE_DATA.pressureResult),
    };
  const gasTables: Partial<Record<AtmosphereCategory, readonly string[]>> = {
    Corrosive: ATMOSPHERE_DATA.corrosiveGas,
    Toxic: ATMOSPHERE_DATA.poison,
    Filter: ATMOSPHERE_DATA.poison,
    Flammable: ATMOSPHERE_DATA.flammableGas,
    Inert: ATMOSPHERE_DATA.inertGas,
  };
  if (category === 'Breathable') {
    const gas = chooseWeighted(
      random,
      ATMOSPHERE_DATA.breathableBackgroundGas.map((row) => ({
        Value: row.gasId,
        Weight: row.weight,
      })),
      'breathable background gases',
    );
    return { Category: category, SelectedGas: gas.Value };
  }
  const gasTable = gasTables[category];
  if (gasTable) return { Category: category, SelectedGas: choose(random, gasTable) };
  if (category === 'Vacuum' || category === 'GasGiant' || category === 'IceGiant')
    return { Category: category };
  throw new Error(`Missing gas table for atmosphere class ${category}`);
}

export function presetAtmosphere(template: keyof typeof rawDetails.presetAtmospheres): Atmosphere {
  return rawDetails.presetAtmospheres[template] as Atmosphere;
}
