import type { OtherCelestialObject, Orbit, Planet, StarSystem, Temperature } from './merged_schema';

/** Generation keeps rolled temperature and inherited AU until assembly is finished. */
export type GeneratedOrbit = Orbit & { AU: number };
export type GeneratedPlanet = Omit<Planet, 'Orbit'> & {
  Orbit: GeneratedOrbit;
  Temperature: Temperature;
};
export type GeneratedOtherCelestialObject = Omit<OtherCelestialObject, 'Orbit'> & {
  Orbit: GeneratedOrbit;
  Temperature: Temperature;
};
export type GeneratedSystemObject = GeneratedPlanet | GeneratedOtherCelestialObject;
export type GeneratedStarSystem = Omit<StarSystem, 'Objects'> & {
  Objects: GeneratedSystemObject[];
};

export function canonicalSystem(generated: GeneratedStarSystem): StarSystem {
  for (const object of generated.Objects) {
    delete (object as Partial<GeneratedSystemObject>).Temperature;
    if (object.Orbit.ParentObjectId !== null) delete (object.Orbit as Partial<GeneratedOrbit>).AU;
  }
  return generated as StarSystem;
}
