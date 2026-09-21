import type { Orbit, Planet, StarType } from "./merged_schema";
import { choose, deterministicId, randomFor } from "./generation_random";
import { directOrbitTemperatures } from "./generation_rules";

export type ExtraPlanetTemplate = "Mercurian" | "Europan / Plutonic" | "Lunar" | "Ioan" | "Titanian" | "Martian" | "Venusian" | "Jovian" | "Neptunian";

export type TemplatePlanetOptions = {
  seed: string;
  entityPath: string;
  starType: StarType;
  orbit: Orbit;
  template: ExtraPlanetTemplate;
};

type TemplateFacts = Pick<Planet, "Size" | "BulkComposition" | "SurfaceWaterPresent" | "Atmosphere" | "NativeBiosphere"> & {
  temperatures: readonly Planet["Temperature"][];
};

const TEMPLATE_FACTS: Readonly<Record<ExtraPlanetTemplate, TemplateFacts>> = {
  Mercurian: { Size: "Mars", BulkComposition: "Iron", SurfaceWaterPresent: false, Atmosphere: "Vacuum", NativeBiosphere: "None", temperatures: ["Infernal", "Arid", "Equatorial", "Volcanic"] },
  "Europan / Plutonic": { Size: "Mars", BulkComposition: "Water", SurfaceWaterPresent: true, Atmosphere: "Inert gas", NativeBiosphere: "None", temperatures: ["Glacial", "Polar"] },
  Lunar: { Size: "Luna", BulkComposition: "Silicon", SurfaceWaterPresent: false, Atmosphere: "Vacuum", NativeBiosphere: "None", temperatures: ["Cryogenic", "Glacial", "Polar", "Subarctic", "Boreal", "Alpine", "Arid", "Infernal", "Volcanic"] },
  Ioan: { Size: "Mars", BulkComposition: "Sulfur", SurfaceWaterPresent: false, Atmosphere: "Corrosive", NativeBiosphere: "None", temperatures: ["Volcanic"] },
  Titanian: { Size: "Mars", BulkComposition: "Carbon", SurfaceWaterPresent: false, Atmosphere: "Inert gas", NativeBiosphere: "Microbial", temperatures: ["Cryogenic", "Glacial", "Polar"] },
  Martian: { Size: "Mars", BulkComposition: "Silicon", SurfaceWaterPresent: false, Atmosphere: "Breathable: Thin/Thick", NativeBiosphere: "None", temperatures: ["Glacial", "Polar", "Subarctic", "Boreal", "Alpine", "Arid"] },
  Venusian: { Size: "Earth", BulkComposition: "Silicon", SurfaceWaterPresent: false, Atmosphere: "Corrosive", NativeBiosphere: "None", temperatures: ["Equatorial", "Arid", "Infernal"] },
  Jovian: { Size: "Jupiter", BulkComposition: "Jovian Gas", SurfaceWaterPresent: false, Atmosphere: "Inert gas", NativeBiosphere: "None", temperatures: ["Cryogenic", "Glacial", "Polar", "Subarctic", "Boreal", "Alpine", "Temperate", "Arid", "Infernal"] },
  Neptunian: { Size: "Neptune", BulkComposition: "Neptunian Gas", SurfaceWaterPresent: false, Atmosphere: "Inert gas", NativeBiosphere: "None", temperatures: ["Cryogenic", "Glacial", "Polar", "Subarctic", "Boreal", "Alpine", "Temperate"] },
};

export function templateHasUsableTemperature(template: ExtraPlanetTemplate, starType: StarType): boolean {
  return TEMPLATE_FACTS[template].temperatures.some(temperature => directOrbitTemperatures(starType).includes(temperature));
}

export function generateTemplatePlanet(options: TemplatePlanetOptions): Planet {
  const facts = TEMPLATE_FACTS[options.template];
  const usableTemperatures = facts.temperatures.filter(temperature => directOrbitTemperatures(options.starType).includes(temperature));
  if (usableTemperatures.length === 0) throw new Error(`No usable temperature for ${options.template} at ${options.seed}:${options.entityPath}`);
  const temperature = choose(randomFor(options.seed, `${options.entityPath}:temperature`), usableTemperatures, `${options.template} temperatures`);
  const name = `${options.template} ${options.entityPath}`;
  return {
    Id: deterministicId(options.seed, options.entityPath),
    ProceduralName: name,
    NiceName: name,
    VisibilityLevel: "NONE",
    Intelligence: { InfoboxSummary: `Uninhabited ${options.template} planet.`, BasicScan: `${temperature}, ${facts.Atmosphere}.`, CulturePartial: "", CultureFull: "", GM: "" },
    Orbit: options.orbit,
    Temperature: temperature,
    Kind: "Planet",
    Size: facts.Size,
    BulkComposition: facts.BulkComposition,
    SurfaceWaterPresent: facts.SurfaceWaterPresent,
    TidallyLocked: options.orbit.ParentObjectId === null && options.starType === "M-type",
    Atmosphere: facts.Atmosphere,
    NativeBiosphere: facts.NativeBiosphere,
    InhabitedInfo: false,
  };
}
