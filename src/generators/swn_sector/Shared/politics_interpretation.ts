import type { Population, TechLevel } from '../BaseDTO/merged_schema';

export interface Capability {
  Attack: number;
  Defense: number;
  Projection: number;
}

function allPopulations(capability: Capability): Record<Population, Capability> {
  return {
    1: capability,
    2: capability,
    3: capability,
    4: capability,
    5: capability,
  };
}

const CAPABILITIES: Record<TechLevel, Record<Population, Capability>> = {
  0: allPopulations({ Attack: 0, Defense: 0, Projection: -1 }),
  1: allPopulations({ Attack: 0, Defense: 0, Projection: -1 }),
  2: allPopulations({ Attack: 0, Defense: 0, Projection: -1 }),
  3: {
    1: { Attack: 0, Defense: 0, Projection: 0 },
    2: { Attack: 0, Defense: 0, Projection: 0 },
    3: { Attack: 0, Defense: 0, Projection: 0 },
    4: { Attack: 1, Defense: 1, Projection: 0 },
    5: { Attack: 1, Defense: 1, Projection: 0 },
  },
  4: {
    1: { Attack: 1, Defense: 1, Projection: 0 },
    2: { Attack: 2, Defense: 2, Projection: 1 },
    3: { Attack: 2, Defense: 2, Projection: 1 },
    4: { Attack: 2, Defense: 3, Projection: 1 },
    5: { Attack: 2, Defense: 3, Projection: 1 },
  },
  4.1: {
    1: { Attack: 1, Defense: 1, Projection: 0 },
    2: { Attack: 2, Defense: 2, Projection: 1 },
    3: { Attack: 2, Defense: 2, Projection: 1 },
    4: { Attack: 2, Defense: 3, Projection: 1 },
    5: { Attack: 2, Defense: 3, Projection: 1 },
  },
  5: {
    1: { Attack: 2, Defense: 2, Projection: 1 },
    2: { Attack: 3, Defense: 3, Projection: 2 },
    3: { Attack: 3, Defense: 4, Projection: 2 },
    4: { Attack: 3, Defense: 4, Projection: 2 },
    5: { Attack: 4, Defense: 4, Projection: 3 },
  },
};

export function capabilityFor(techLevel: TechLevel, population: Population): Capability {
  return CAPABILITIES[techLevel][population];
}
