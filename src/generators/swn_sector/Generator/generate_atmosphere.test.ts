import { expect, test } from 'vitest';
import { generateAtmosphere, presetAtmosphere } from './generate_atmosphere';
import rawDetails from '../Data/Raw/Details/atmosphere.json';
import {
  formatAtmosphere,
  isAtmosphere,
  resolveAtmosphere,
} from '../Shared/atmosphere_interpretation';

test('atmosphere rolls retain a valid class and only its conditional result', () => {
  const categories = new Set<string>();
  for (let index = 0; index < 500; index += 1) {
    const outcome = generateAtmosphere(`atmosphere-${index}`, 'world');
    categories.add(outcome.Category);
    expect(isAtmosphere(outcome)).toBe(true);
    expect(resolveAtmosphere(outcome).HabRating).toBeGreaterThanOrEqual(0);
    if (outcome.Category === 'Pressure') {
      expect(outcome).toHaveProperty('PressureResult');
      expect(outcome).not.toHaveProperty('SelectedGas');
    } else if (outcome.Category === 'Vacuum') {
      expect(outcome).toEqual({ Category: 'Vacuum' });
    } else {
      expect(outcome).toHaveProperty('SelectedGas');
      expect(outcome).not.toHaveProperty('PressureResult');
    }
  }
  expect(categories).toEqual(
    new Set([
      'Vacuum',
      'Corrosive',
      'Toxic',
      'Filter',
      'Pressure',
      'Flammable',
      'Inert',
      'Breathable',
    ]),
  );
});

test('presets resolve composition and keep subscripted display formulas', () => {
  for (const name of Object.keys(rawDetails.presetAtmospheres) as Array<
    keyof typeof rawDetails.presetAtmospheres
  >) {
    const outcome = presetAtmosphere(name);
    expect(isAtmosphere(outcome)).toBe(true);
    expect(resolveAtmosphere(outcome).Bar).toBeGreaterThanOrEqual(0);
  }
  expect(presetAtmosphere('Martian')).toEqual({ Category: 'Inert', SelectedGas: 'N2' });
  expect(resolveAtmosphere(presetAtmosphere('Martian'))).toMatchObject({
    HabRating: 0,
    Bar: 1,
    Gases: [{ Gas: { ChemicalFormula: 'N₂', LongName: 'Nitrogen' }, Percent: 99 }],
  });
  expect(formatAtmosphere(presetAtmosphere('Titanian'))).toBe('Flammable (CH₄)');
  expect(resolveAtmosphere(presetAtmosphere('Jovian'))).toMatchObject({
    Bar: 10,
    Gases: [
      { Gas: { ChemicalFormula: 'H₂' }, Percent: 90 },
      { Gas: { ChemicalFormula: 'He' }, Percent: 10 },
    ],
  });
  expect(resolveAtmosphere({ Category: 'Pressure', PressureResult: 'Low' }).Bar).toBe(0.5);
  expect(resolveAtmosphere({ Category: 'Pressure', PressureResult: 'High' }).Bar).toBe(4);
  expect(isAtmosphere('Vacuum')).toBe(false);
  expect(isAtmosphere({ Category: 'toString' })).toBe(false);
  expect(isAtmosphere({ Category: 'Toxic', SelectedGas: 'N2' })).toBe(false);
});
