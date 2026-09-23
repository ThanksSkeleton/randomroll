import type { StarType } from '../../../merged_schema';
import { starPresentation } from '../../../star_presentation';

/** Shared helper markup for the CSS star recipes. The button remains the glyph's host. */
export function StarGlyph({ starType }: { starType: StarType }) {
  const recipe = starPresentation(starType).recipe;

  if (recipe === 'a-type') {
    return (
      <span className="star-flare" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className={`star-petal star-petal-${index + 1}`} />
        ))}
      </span>
    );
  }

  if (recipe === 'neutron-star') return <span className="star-spikes" aria-hidden="true" />;
  if (recipe === 'black-hole') return <span className="star-shadow-core" aria-hidden="true" />;
  return null;
}
