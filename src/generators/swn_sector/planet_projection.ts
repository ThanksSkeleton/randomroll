import type { Planet, Sector } from './merged_schema';
import { displayBulkComposition, planetColor, planetColorClass } from './planet_presentation';
import {
  formatPlanetAu,
  isTidallyLocked,
  planetHabitability,
  POPULATION_TIER,
  STAR_HABITABILITY,
  TECH_LEVEL,
} from './planet_interpretation';
import { projectObjectSpatial } from './object_spatial_projection';

export type PlanetStockText = {
  basic: string;
  detailed: string;
  politics: string;
  deep: string;
  gm: string;
};

export type PlanetDisplayDTO = {
  id: string;
  displayedComposition: Planet['BulkComposition'] | 'Ice';
  color: ReturnType<typeof planetColor>;
  colorClass: string;
  starHabitability: number;
  habitabilityRating: number | null;
  habitabilityColor: string | null;
  tidallyLocked: boolean;
  populationTier: number | null;
  population: string | null;
  technologyRating: number | null;
  technologyLevel: string | null;
  technologyColorClass: string | null;
  stock: PlanetStockText;
};

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

function claimText(sector: Sector, planet: Planet): string {
  const names = planet.ClaimedByPolityIds.map(
    (id) => sector.Polities.find((polity) => polity.Id === id)?.NiceName,
  ).filter((name): name is string => name !== undefined);
  return `ClaimedBy: ${names.length === 0 ? 'None' : names.join(', ')}`;
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
  const moonFact = hostName ? `\nMoon of ${hostName}` : '';
  const displayedComposition = displayBulkComposition(planet.BulkComposition, spatial.temperature);
  const basic = `${formatPlanetAu(spatial.effectiveAu)} AU - ${spatial.temperature} - ${planet.Size}-Class${moonFact}\nAtmosphere: ${planet.Atmosphere} Composition: ${displayedComposition}`;
  const claim = claimText(sector, planet);
  const signalsDetected = system.PointsOfInterest.filter(
    (poi) => poi.ParentObjectId === planet.Id,
  ).length;
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
          deep:
            planet.Complete && planet.Culture
              ? `Cultural Template: ${planet.Culture.culturalTemplate}\nOutsider Opinion: ${planet.Culture.outsiderOpinion}\nLaw Enforcement: ${planet.Culture.lawEnforcement.amount}; ${planet.Culture.lawEnforcement.style}; ${planet.Culture.lawEnforcement.specialLaw}\nBiggest Conflict: ${planet.Culture.biggestConflict.category}; ${planet.Culture.biggestConflict.details}`
              : '-',
          gm: inhabited.WorldTags.join(', '),
        };
  return {
    id: planet.Id,
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
