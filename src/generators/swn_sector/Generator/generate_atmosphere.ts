import type { Atmosphere, AtmosphereCategory } from '../BaseDTO/merged_schema';
import rawDetails from '../Data/Raw/Details/atmosphere.json';
import rawTables from '../Data/Raw/Tables/atmosphere.json';
import { choose, chooseWeighted, randomFor } from './generation_random';
import { ATMOSPHERE_TABLE } from './generation_rules';

export function generateAtmosphere(seed: string, path: string): Atmosphere {
  const category = chooseWeighted(
    randomFor(seed, `${path}:atmosphere`),
    ATMOSPHERE_TABLE,
    'atmosphere classes',
  ).Value;
  const random = randomFor(seed, `${path}:atmosphere-detail`);
  if (category === 'Pressure')
    return {
      Category: category,
      PressureResult: choose(random, rawTables.pressureResult) as 'Low' | 'High',
    };
  const gasTables: Partial<Record<AtmosphereCategory, readonly string[]>> = {
    Corrosive: rawTables.corrosiveGas,
    Toxic: rawTables.poison,
    Filter: rawTables.poison,
    Flammable: rawTables.flammableGas,
    Inert: rawTables.inertGas,
  };
  if (category === 'Breathable') {
    const gas = chooseWeighted(
      random,
      rawTables.breathableBackgroundGas.map((row) => ({ Value: row.gasId, Weight: row.weight })),
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
