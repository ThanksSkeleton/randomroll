import type { StarType } from '../BaseDTO/merged_schema';
import {
  GIANT_STAR_SIZE,
  STAR_PRESENTATION,
  type StarPresentation,
} from '../Data/Projection/star_presentation';

export function starPresentation(starType: StarType): StarPresentation {
  return STAR_PRESENTATION[starType];
}

export function starPresentationClass(starType: StarType): string {
  const presentation = starPresentation(starType);
  return `star-symbol star-color-${presentation.color} star-recipe-${presentation.recipe}`;
}

export function starPresentationStyle(starType: StarType): Record<string, string> {
  const presentation = starPresentation(starType);
  return {
    '--star-size-scale': String(presentation.size / GIANT_STAR_SIZE),
    '--star-core': presentation.core,
    '--star-glow': presentation.glow,
    '--star-accent': presentation.accent,
    '--star-rim': presentation.rim,
    '--star-spike-scale': String(presentation.spikeScale ?? 0.54),
    '--star-spike-width': `${126 * (presentation.spikeScale ?? 0.54)}%`,
  };
}
