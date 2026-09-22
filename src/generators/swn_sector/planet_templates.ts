import type {
  Orbit,
  OtherCelestialObject,
  OtherCelestialObjectType,
  Planet,
  StarType,
} from './merged_schema';
import { choose, deterministicId, randomFor } from './generation_random';
import { directOrbitTemperatures } from './generation_rules';

export type ExtraPlanetTemplate =
  | 'Mercurian'
  | 'Europan / Plutonic'
  | 'Lunar'
  | 'Ioan'
  | 'Titanian'
  | 'Martian'
  | 'Venusian'
  | 'Jovian'
  | 'Neptunian';

export type TemplatePlanetOptions = {
  seed: string;
  entityPath: string;
  starType: StarType;
  orbit: Orbit;
  template: ExtraPlanetTemplate;
};

export type OtherCelestialObjectTemplate = Extract<
  OtherCelestialObjectType,
  'AsteroidBelt' | 'KuiperBelt' | 'GasCloud'
>;

type TemplateFacts = Pick<
  Planet,
  'Size' | 'BulkComposition' | 'SurfaceWaterPresent' | 'Atmosphere' | 'NativeBiosphere'
>;

const TEMPLATE_FACTS: Readonly<Record<ExtraPlanetTemplate, TemplateFacts>> = {
  Mercurian: {
    Size: 'Luna',
    BulkComposition: 'Iron',
    SurfaceWaterPresent: false,
    Atmosphere: 'Vacuum',
    NativeBiosphere: 'None',
  },
  'Europan / Plutonic': {
    Size: 'Luna',
    BulkComposition: 'Water',
    SurfaceWaterPresent: true,
    Atmosphere: 'Inert gas',
    NativeBiosphere: 'None',
  },
  Lunar: {
    Size: 'Luna',
    BulkComposition: 'Silicon',
    SurfaceWaterPresent: false,
    Atmosphere: 'Vacuum',
    NativeBiosphere: 'None',
  },
  Ioan: {
    Size: 'Mars',
    BulkComposition: 'Sulfur',
    SurfaceWaterPresent: false,
    Atmosphere: 'Corrosive',
    NativeBiosphere: 'None',
  },
  Titanian: {
    Size: 'Mars',
    BulkComposition: 'Carbon',
    SurfaceWaterPresent: false,
    Atmosphere: 'Inert gas',
    NativeBiosphere: 'Microbial',
  },
  Martian: {
    Size: 'Mars',
    BulkComposition: 'Silicon',
    SurfaceWaterPresent: false,
    Atmosphere: 'Breathable: Thin/Thick',
    NativeBiosphere: 'None',
  },
  Venusian: {
    Size: 'Earth',
    BulkComposition: 'Silicon',
    SurfaceWaterPresent: false,
    Atmosphere: 'Corrosive',
    NativeBiosphere: 'None',
  },
  Jovian: {
    Size: 'Jupiter',
    BulkComposition: 'Jovian Gas',
    SurfaceWaterPresent: false,
    Atmosphere: 'Inert gas',
    NativeBiosphere: 'None',
  },
  Neptunian: {
    Size: 'Neptune',
    BulkComposition: 'Neptunian Gas',
    SurfaceWaterPresent: false,
    Atmosphere: 'Inert gas',
    NativeBiosphere: 'None',
  },
};

export function templateHasUsableTemperature(
  _template: ExtraPlanetTemplate,
  starType: StarType,
): boolean {
  return directOrbitTemperatures(starType).length > 0;
}

export function generateTemplatePlanet(options: TemplatePlanetOptions): Planet {
  const facts = TEMPLATE_FACTS[options.template];
  const usableTemperatures = directOrbitTemperatures(options.starType);
  if (usableTemperatures.length === 0)
    throw new Error(
      `No usable temperature for ${options.template} at ${options.seed}:${options.entityPath}`,
    );
  const temperature = choose(
    randomFor(options.seed, `${options.entityPath}:temperature`),
    usableTemperatures,
    `${options.template} temperatures`,
  );
  const surfaceWaterPresent =
    facts.SurfaceWaterPresent &&
    temperature !== 'Cryogenic' &&
    temperature !== 'Furance' &&
    facts.Atmosphere !== 'Vacuum';
  const name = `${options.template} ${options.entityPath}`;
  return {
    Id: deterministicId(options.seed, options.entityPath),
    ProceduralName: name,
    NiceName: name,
    VisibilityLevel: 'NONE',
    Intelligence: {
      InfoboxSummary: '-',
      BasicScan: '-',
      CulturePartial: '-',
      CultureFull: '-',
      GM: '-',
    },
    Orbit: options.orbit,
    Temperature: temperature,
    Kind: 'Planet',
    Size: facts.Size,
    BulkComposition: facts.BulkComposition,
    SurfaceWaterPresent: surfaceWaterPresent,
    TidallyLocked: options.orbit.ParentObjectId === null && options.starType === 'M-type',
    Atmosphere: facts.Atmosphere,
    NativeBiosphere: facts.NativeBiosphere,
    InhabitedInfo: false,
  };
}

export function generateTemplateOtherCelestialObject(options: {
  seed: string;
  entityPath: string;
  starType: StarType;
  orbit: Orbit;
  template: OtherCelestialObjectTemplate;
}): OtherCelestialObject {
  const allowedTemperatures = directOrbitTemperatures(options.starType).filter((temperature) =>
    options.template === 'AsteroidBelt'
      ? !['Cryogenic', 'Deepfrozen', 'Polar', 'Subarctic', 'Boreal'].includes(temperature)
      : ['Cryogenic', 'Deepfrozen', 'Polar', 'Subarctic', 'Boreal'].includes(temperature),
  );
  if (allowedTemperatures.length === 0)
    throw new Error(
      `No usable temperature for ${options.template} at ${options.seed}:${options.entityPath}`,
    );
  const temperature = choose(
    randomFor(options.seed, `${options.entityPath}:temperature`),
    allowedTemperatures,
    `${options.template} temperatures`,
  );
  const name = `${options.template} ${options.entityPath}`;
  return {
    Id: deterministicId(options.seed, options.entityPath),
    ProceduralName: name,
    NiceName: name,
    VisibilityLevel: 'NONE',
    Intelligence: {
      InfoboxSummary: '-',
      BasicScan: '-',
      CulturePartial: '-',
      CultureFull: '-',
      GM: '-',
    },
    Orbit: options.orbit,
    Temperature: temperature,
    Kind: 'OtherCelestialObject',
    ObjectType: options.template,
  };
}
