import type { HexLocation } from '../BaseDTO/merged_schema';

/** Distance between two odd-column-offset sector hexes. */
export function hexDistance(first: HexLocation, second: HexLocation): number {
  const firstQ = first.Column - 1;
  const secondQ = second.Column - 1;
  const firstR = first.Row - 1 - Math.floor(firstQ / 2);
  const secondR = second.Row - 1 - Math.floor(secondQ / 2);
  const firstY = -firstQ - firstR;
  const secondY = -secondQ - secondR;
  return Math.max(
    Math.abs(firstQ - secondQ),
    Math.abs(firstY - secondY),
    Math.abs(firstR - secondR),
  );
}
