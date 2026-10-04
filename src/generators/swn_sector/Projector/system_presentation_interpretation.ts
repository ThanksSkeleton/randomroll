import type { StarType } from '../BaseDTO/merged_schema';
import { STAR_AU_WIDTHS } from '../Shared/spatial_interpretation';

/** Returns the AU boundaries enclosing all normal temperatures. */
export function normalTemperatureAuBand(starType: StarType): readonly [number, number] {
  const widths = STAR_AU_WIDTHS[starType];
  const inner = widths.FromStar + widths.ExtremeHotRange;
  return [inner, inner + widths.NormalRange];
}

/** The outer system boundary implied by the configured star AU widths. */
export function systemEdgeAu(starType: StarType): number {
  const widths = STAR_AU_WIDTHS[starType];
  return (
    widths.FromStar +
    widths.ExtremeHotRange +
    widths.NormalRange +
    widths.ExtremeColdRange +
    widths.ToSystemEdge
  );
}
