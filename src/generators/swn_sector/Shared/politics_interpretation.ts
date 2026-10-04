import type { Population, TechLevel } from '../BaseDTO/merged_schema';

export interface Capability {
  Attack: number;
  Defense: number;
  Projection: number;
}

function allPopulations(capability: Capability): Record<Population, Capability> {
  return {
    'Fewer than 500': capability,
    'Fewer than a million inhabitants': capability,
    'Several million inhabitants': capability,
    'Hundreds of millions of inhabitants': capability,
    'Billions of inhabitants': capability,
  };
}

const CAPABILITIES: Record<TechLevel, Record<Population, Capability>> = {
  0: allPopulations({ Attack: 0, Defense: 0, Projection: -1 }),
  1: allPopulations({ Attack: 0, Defense: 0, Projection: -1 }),
  2: allPopulations({ Attack: 0, Defense: 0, Projection: -1 }),
  3: {
    'Fewer than 500': { Attack: 0, Defense: 0, Projection: 0 },
    'Fewer than a million inhabitants': { Attack: 0, Defense: 0, Projection: 0 },
    'Several million inhabitants': { Attack: 0, Defense: 0, Projection: 0 },
    'Hundreds of millions of inhabitants': { Attack: 1, Defense: 1, Projection: 0 },
    'Billions of inhabitants': { Attack: 1, Defense: 1, Projection: 0 },
  },
  4: {
    'Fewer than 500': { Attack: 1, Defense: 1, Projection: 0 },
    'Fewer than a million inhabitants': { Attack: 2, Defense: 2, Projection: 1 },
    'Several million inhabitants': { Attack: 2, Defense: 2, Projection: 1 },
    'Hundreds of millions of inhabitants': { Attack: 2, Defense: 3, Projection: 1 },
    'Billions of inhabitants': { Attack: 2, Defense: 3, Projection: 1 },
  },
  4.1: {
    'Fewer than 500': { Attack: 1, Defense: 1, Projection: 0 },
    'Fewer than a million inhabitants': { Attack: 2, Defense: 2, Projection: 1 },
    'Several million inhabitants': { Attack: 2, Defense: 2, Projection: 1 },
    'Hundreds of millions of inhabitants': { Attack: 2, Defense: 3, Projection: 1 },
    'Billions of inhabitants': { Attack: 2, Defense: 3, Projection: 1 },
  },
  5: {
    'Fewer than 500': { Attack: 2, Defense: 2, Projection: 1 },
    'Fewer than a million inhabitants': { Attack: 3, Defense: 3, Projection: 2 },
    'Several million inhabitants': { Attack: 3, Defense: 4, Projection: 2 },
    'Hundreds of millions of inhabitants': { Attack: 3, Defense: 4, Projection: 2 },
    'Billions of inhabitants': { Attack: 4, Defense: 4, Projection: 3 },
  },
};

export function capabilityFor(techLevel: TechLevel, population: Population): Capability {
  return CAPABILITIES[techLevel][population];
}
