/** Shared sector-coordinate and tag-reference types used by supported generator versions. */
export const SECTOR_GRID = {
  columns: 8,
  rows: 10,
} as const;

export type SectorHex = {
  column: number;
  row: number;
};

export type WorldTagReference = {
  roll: number;
  tag: string;
};
