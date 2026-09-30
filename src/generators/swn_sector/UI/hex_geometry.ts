type HexLocation = { Column: number; Row: number };

/** UI interaction geometry for adjacent hexes in the sector's odd-column grid. */
export function areAdjacentHexes(a: HexLocation, b: HexLocation): boolean {
  const dx = Math.abs(a.Column - b.Column);
  const dy = b.Row - a.Row;
  if (dx === 0) return Math.abs(dy) === 1;
  if (dx !== 1) return false;
  const leftColumn = a.Column < b.Column ? a.Column : b.Column;
  const rowDelta = a.Column < b.Column ? dy : -dy;
  return leftColumn % 2 === 1
    ? rowDelta === 0 || rowDelta === -1
    : rowDelta === 0 || rowDelta === 1;
}
