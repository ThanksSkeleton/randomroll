import type { Planet, PointOfInterestType, SystemObject } from '../BaseDTO/merged_schema';

export function isGasPlanet(planet: Planet): boolean {
  return planet.BulkComposition === 'Jovian Gas' || planet.BulkComposition === 'Neptunian Gas';
}
export function isPoiHostCompatible(type: PointOfInterestType, parent: SystemObject): boolean {
  switch (type) {
    case 'Deep-space station':
      return parent.Kind === 'OtherCelestialObject' && parent.ObjectType === 'IndependentStation';
    case 'Asteroid base':
    case 'Asteroid belt':
      return parent.Kind === 'OtherCelestialObject' && parent.ObjectType === 'AsteroidBelt';
    case 'Comet base':
    case 'Comet belt':
      return parent.Kind === 'OtherCelestialObject' && parent.ObjectType === 'KuiperBelt';
    case 'Remote moon base':
      return parent.Kind === 'Planet' && !isGasPlanet(parent);
    case 'Ancient orbital ruin':
    case 'Research base':
      return parent.Kind === 'Planet';
    case 'Gas Mine':
    case 'Refueling station':
      return (
        (parent.Kind === 'Planet' && isGasPlanet(parent)) ||
        (parent.Kind === 'OtherCelestialObject' && parent.ObjectType === 'GasCloud')
      );
  }
}
