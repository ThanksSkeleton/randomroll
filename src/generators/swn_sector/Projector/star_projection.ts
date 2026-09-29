import type { StarDisplayDTO } from '../DisplayDTO/dto';
import type { Sector } from '../BaseDTO/merged_schema';
import { GIANT_STAR_SIZE, STAR_PRESENTATION } from '../Data/Projection/star_presentation';

export function projectStar(sector: Sector, systemId: string): StarDisplayDTO | undefined {
  const star = sector.Systems.find((system) => system.Id === systemId)?.Star;
  if (!star) return undefined;
  const presentation = STAR_PRESENTATION[star.StarType];
  const spikeScale = presentation.spikeScale ?? 0.54;
  return {
    id: star.Id,
    starType: star.StarType,
    color: presentation.color,
    size: presentation.size,
    recipe: presentation.recipe,
    className: `star-symbol star-color-${presentation.color} star-recipe-${presentation.recipe}`,
    styleTokens: {
      '--star-size-scale': String(presentation.size / GIANT_STAR_SIZE),
      '--star-core': presentation.core,
      '--star-glow': presentation.glow,
      '--star-accent': presentation.accent,
      '--star-rim': presentation.rim,
      '--star-spike-scale': String(spikeScale),
      '--star-spike-width': `${126 * spikeScale}%`,
    },
  };
}
