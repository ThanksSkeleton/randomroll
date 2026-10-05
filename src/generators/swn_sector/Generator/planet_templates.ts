import type { OtherCelestialObjectType, StarType, Temperature } from '../BaseDTO/merged_schema';
import type {
  GeneratedOrbit as Orbit,
  GeneratedPlanet as Planet,
  GeneratedOtherCelestialObject as OtherCelestialObject,
} from './generation_model';
import { choose, deterministicId, randomFor } from './generation_random';
import type { GenerationSettings } from './generation_settings';
import { directOrbitTemperatures } from '../Shared/spatial_interpretation';
import { assignPortraitIndex } from './portrait_selection';
import { presetAtmosphere } from './generate_atmosphere';
import { GAS_COMPOSITION_BY_SIZE } from './data_tables';

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
  generationSettings: GenerationSettings;
  entityPath: string;
  starType: StarType;
  orbit: Orbit;
  template: ExtraPlanetTemplate;
  /** Used by callers that will derive temperature after choosing AU. */
  temperature?: Temperature;
};

export type OtherCelestialObjectTemplate = Extract<
  OtherCelestialObjectType,
  'AsteroidBelt' | 'KuiperBelt' | 'GasCloud'
>;

type TemplateFacts = Pick<
  Planet,
  'Size' | 'BulkComposition' | 'SurfaceWaterPresent' | 'Atmosphere' | 'NativeBiosphere'
>;

function gasCompositionForTemplate(size: Planet['Size']): Planet['BulkComposition'] {
  const composition = GAS_COMPOSITION_BY_SIZE[size];
  if (composition === undefined) throw new Error(`Missing gas composition for ${size} template`);
  return composition;
}

const TEMPLATE_FACTS: Readonly<Record<ExtraPlanetTemplate, TemplateFacts>> = {
  Mercurian: {
    Size: 'Luna',
    BulkComposition: 'Iron',
    SurfaceWaterPresent: false,
    Atmosphere: presetAtmosphere('Mercurian'),
    NativeBiosphere: 1,
  },
  'Europan / Plutonic': {
    Size: 'Luna',
    BulkComposition: 'Water',
    SurfaceWaterPresent: true,
    Atmosphere: presetAtmosphere('Europan / Plutonic'),
    NativeBiosphere: 1,
  },
  Lunar: {
    Size: 'Luna',
    BulkComposition: 'Silicon',
    SurfaceWaterPresent: false,
    Atmosphere: presetAtmosphere('Lunar'),
    NativeBiosphere: 1,
  },
  Ioan: {
    Size: 'Mars',
    BulkComposition: 'Sulfur',
    SurfaceWaterPresent: false,
    Atmosphere: presetAtmosphere('Ioan'),
    NativeBiosphere: 1,
  },
  Titanian: {
    Size: 'Mars',
    BulkComposition: 'Carbon',
    SurfaceWaterPresent: false,
    Atmosphere: presetAtmosphere('Titanian'),
    NativeBiosphere: 2,
  },
  Martian: {
    Size: 'Mars',
    BulkComposition: 'Silicon',
    SurfaceWaterPresent: false,
    Atmosphere: presetAtmosphere('Martian'),
    NativeBiosphere: 1,
  },
  Venusian: {
    Size: 'Earth',
    BulkComposition: 'Silicon',
    SurfaceWaterPresent: false,
    Atmosphere: presetAtmosphere('Venusian'),
    NativeBiosphere: 1,
  },
  Jovian: {
    Size: 'Jupiter',
    BulkComposition: gasCompositionForTemplate('Jupiter'),
    SurfaceWaterPresent: false,
    Atmosphere: presetAtmosphere('Jovian'),
    NativeBiosphere: 1,
  },
  Neptunian: {
    Size: 'Neptune',
    BulkComposition: gasCompositionForTemplate('Neptune'),
    SurfaceWaterPresent: false,
    Atmosphere: presetAtmosphere('Neptunian'),
    NativeBiosphere: 1,
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
      `No usable temperature for ${options.template} at ${options.generationSettings.seed}:${options.entityPath}`,
    );
  const temperature =
    options.temperature ??
    choose(
      randomFor(options.generationSettings, `${options.entityPath}:temperature`),
      usableTemperatures,
      `${options.template} temperatures`,
    );
  const surfaceWaterPresent =
    facts.SurfaceWaterPresent &&
    temperature !== 'Cryogenic' &&
    temperature !== 'Furance' &&
    facts.Atmosphere.Category !== 'Vacuum';
  const name = `${options.template} ${options.entityPath}`;
  return {
    Id: deterministicId(options.generationSettings, options.entityPath),
    ProceduralName: name,
    NiceName: name,
    Visibility: {
      BasicScan: false,
      DetailedScan: false,
      PoliticsScan: false,
      DeepPoliticsScan: false,
    },
    Intelligence: {
      InfoboxSummary: '-',
      BasicScan: '-',
      DetailedScan: '-',
      PoliticsScan: '-',
      DeepPoliticsScan: '-',
      GM: '-',
    },
    Orbit: options.orbit,
    Temperature: temperature,
    Kind: 'Planet',
    PortraitIndex: assignPortraitIndex(options.generationSettings, options.entityPath),
    Size: facts.Size,
    BulkComposition: facts.BulkComposition,
    SurfaceWaterPresent: surfaceWaterPresent,
    Atmosphere: facts.Atmosphere,
    NativeBiosphere: facts.NativeBiosphere,
    ClaimedByPolityIds: [],
    InhabitedInfo: false,
  };
}

export function generateTemplateOtherCelestialObject(options: {
  generationSettings: GenerationSettings;
  entityPath: string;
  starType: StarType;
  orbit: Orbit;
  template: OtherCelestialObjectTemplate;
  /** Used by callers that will derive temperature after choosing AU. */
  temperature?: Temperature;
}): OtherCelestialObject {
  const allowedTemperatures = directOrbitTemperatures(options.starType).filter((temperature) =>
    options.template === 'AsteroidBelt'
      ? !['Cryogenic', 'Deepfrozen', 'Polar', 'Subarctic', 'Boreal'].includes(temperature)
      : ['Cryogenic', 'Deepfrozen', 'Polar', 'Subarctic', 'Boreal'].includes(temperature),
  );
  if (allowedTemperatures.length === 0)
    throw new Error(
      `No usable temperature for ${options.template} at ${options.generationSettings.seed}:${options.entityPath}`,
    );
  const temperature =
    options.temperature ??
    choose(
      randomFor(options.generationSettings, `${options.entityPath}:temperature`),
      allowedTemperatures,
      `${options.template} temperatures`,
    );
  const name = `${options.template} ${options.entityPath}`;
  return {
    Id: deterministicId(options.generationSettings, options.entityPath),
    ProceduralName: name,
    NiceName: name,
    Visibility: {
      BasicScan: false,
      DetailedScan: false,
      PoliticsScan: false,
      DeepPoliticsScan: false,
    },
    Intelligence: {
      InfoboxSummary: '-',
      BasicScan: '-',
      DetailedScan: '-',
      PoliticsScan: '-',
      DeepPoliticsScan: '-',
      GM: '-',
    },
    Orbit: options.orbit,
    Temperature: temperature,
    ClaimedByPolityIds: [],
    Kind: 'OtherCelestialObject',
    ObjectType: options.template,
    PortraitIndex: assignPortraitIndex(
      options.generationSettings,
      deterministicId(options.generationSettings, options.entityPath),
    ),
  };
}
