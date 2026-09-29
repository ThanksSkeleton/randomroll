import type { Sector, StarType } from './merged_schema';
import { GIANT_STAR_SIZE, STAR_PRESENTATION, type StarPresentation } from './star_presentation';

export type StarDisplayDTO = {
  id: string;
  starType: StarType;
  color: StarPresentation['color'];
  size: number;
  recipe: StarPresentation['recipe'];
  className: string;
  styleTokens: Record<string, string>;
};

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
