import type { PlanetDisplayDTO, PlanetStockText } from '../DisplayDTO/dto';
import type { Planet, Sector } from '../BaseDTO/merged_schema';
import { planetColor, planetColorClass } from './planet_presentation';
import { planetHabitability, STAR_HABITABILITY, TECH_LEVEL } from '../Shared/planet_interpretation';
import {
  formatPlanetAu,
  isTidallyLocked,
  POPULATION_TIER,
} from './planet_presentation_interpretation';
import { displayBulkComposition } from './composition_presentation';
import { projectObjectSpatial } from './object_spatial_projection';
import { projectClaims } from './politics_projection';
import { projectPoiCount } from './poi_projection';
import { resolveAtmosphere } from '../Shared/atmosphere_interpretation';

const HABITABILITY_COLOR: Readonly<Record<number, string>> = {
  0: '#858b90',
  1: '#e34b4b',
  2: '#e3c84b',
  3: '#55c96b',
};

function visibleName(sector: Sector, id: string, preview: 'gm' | 'player'): string | undefined {
  for (const system of sector.Systems) {
    const object = system.Objects.find((candidate) => candidate.Id === id);
    if (!object) continue;
    return preview === 'player' && !object.Visibility.PoliticsScan
      ? object.ProceduralName
      : object.NiceName;
  }
  return undefined;
}

/** Project one canonical planet for the symbolic view and object inspector. */
export function projectPlanet(
  sector: Sector,
  planetId: string,
  context: { preview: 'gm' | 'player' },
): PlanetDisplayDTO | undefined {
  const system = sector.Systems.find((candidate) =>
    candidate.Objects.some((object) => object.Kind === 'Planet' && object.Id === planetId),
  );
  const planet = system?.Objects.find(
    (object): object is Planet => object.Kind === 'Planet' && object.Id === planetId,
  );
  if (!system || !planet) return undefined;
  const spatial = projectObjectSpatial(sector, planetId);
  if (!spatial) return undefined;

  const starHabitability = STAR_HABITABILITY[system.Star.StarType];
  const habitabilityRating = planetHabitability(planet, starHabitability, spatial.temperature);
  const inhabited = planet.InhabitedInfo;
  const populationTier = inhabited === false ? null : POPULATION_TIER[inhabited.Population];
  const technologyRating = inhabited === false ? null : TECH_LEVEL[inhabited.TechLevel];
  const hostName = planet.Orbit.ParentObjectId
    ? visibleName(sector, planet.Orbit.ParentObjectId, context.preview)
    : undefined;
  const moonFact = hostName ? `Moon of ${hostName}` : null;
  const displayedComposition = displayBulkComposition(planet.BulkComposition, spatial.temperature);
  const atmosphere = resolveAtmosphere(planet.Atmosphere);
  const atmosphereSummary = `Type - ${planet.Atmosphere.Category}`;
  const basicScan = {
    simple: [
      `${formatPlanetAu(spatial.effectiveAu)} AU - ${spatial.temperature} - ${planet.Size}-Class`,
      ...(moonFact ? [moonFact] : []),
      `Composition: ${displayedComposition}`,
      ...(planet.Atmosphere.Category === 'Vacuum' ? [atmosphereSummary] : []),
    ],
    complex:
      planet.Atmosphere.Category === 'Vacuum'
        ? []
        : [
            {
              summary: atmosphereSummary,
              lines: atmosphere.Gases.map(
                ({ Gas, Percent }) => `${Gas.ChemicalFormula} ${Percent}%`,
              ),
            },
          ],
  };
  const basic = basicScan.simple.join('\n');
  const claim = projectClaims(sector, planet)?.stockText ?? 'ClaimedBy: None';
  const signalsDetected = projectPoiCount(sector, system.Id, planet.Id) ?? 0;
  const stock: PlanetStockText =
    inhabited === false
      ? {
          basic,
          detailed: `Signals Detected: ${signalsDetected}`,
          politics: claim,
          deep: '-',
          gm: '-',
        }
      : {
          basic,
          detailed: `Life, Native: ${planet.NativeBiosphere}\nLife, Terran: ${inhabited.TerranBiosphere}\nPopulation: ${inhabited.Population}`,
          politics: `Tech Level: ${technologyRating} - ${inhabited.TechLevel}\n${claim}`,
          deep: planet.Culture
            ? `Cultural Template: ${planet.Culture.culturalTemplate}\nOutsider Opinion: ${planet.Culture.outsiderOpinion}\nLaw Enforcement: ${planet.Culture.lawEnforcement.amount}; ${planet.Culture.lawEnforcement.style}; ${planet.Culture.lawEnforcement.specialLaw}\nBiggest Conflict: ${planet.Culture.biggestConflict.category}; ${planet.Culture.biggestConflict.details}`
            : '-',
          gm: inhabited.WorldTags.join(', '),
        };
  return {
    id: planet.Id,
    basicScan,
    atmosphere,
    displayedComposition,
    color: planetColor(planet),
    colorClass: planetColorClass(planet),
    starHabitability,
    habitabilityRating,
    habitabilityColor:
      habitabilityRating === null
        ? null
        : (HABITABILITY_COLOR[habitabilityRating] ?? HABITABILITY_COLOR[0]),
    tidallyLocked: isTidallyLocked(planet, system.Star.StarType),
    populationTier,
    population: inhabited === false ? null : inhabited.Population,
    technologyRating,
    technologyLevel: inhabited === false ? null : inhabited.TechLevel,
    technologyColorClass:
      technologyRating === null
        ? null
        : technologyRating === 5
          ? 'summary-rating-tech-purple'
          : technologyRating === 4 || technologyRating === 4.1
            ? 'summary-rating-tech-blue'
            : 'summary-rating-tech-white',
    stock,
  };
}
