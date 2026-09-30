import type { ScanVisibility } from '../BaseDTO/merged_schema';

export type ScanField = keyof ScanVisibility;

export function hasAnyScan(visibility: ScanVisibility): boolean {
  return visibility.BasicScan;
}

export function isValidScanVisibility(value: unknown): value is ScanVisibility {
  if (typeof value !== 'object' || value === null) return false;
  const visibility = value as Record<string, unknown>;
  return (
    typeof visibility.BasicScan === 'boolean' &&
    typeof visibility.DetailedScan === 'boolean' &&
    typeof visibility.PoliticsScan === 'boolean' &&
    typeof visibility.DeepPoliticsScan === 'boolean' &&
    (!visibility.DetailedScan || visibility.BasicScan) &&
    (!visibility.PoliticsScan || visibility.BasicScan) &&
    (!visibility.DeepPoliticsScan || visibility.PoliticsScan)
  );
}
