import type { Polity } from '../BaseDTO/merged_schema';
import { POLITY_FLAG_COLORS } from '../Data/Raw/polity_flag_colors';

export function validPolityFlag(polity: Polity, polities: readonly Polity[]): boolean {
  return (
    /^#[0-9a-f]{6}$/i.test(polity.Flag.FieldColor) &&
    POLITY_FLAG_COLORS.includes(polity.Flag.CircleColor) &&
    polity.Flag.FieldColor !== polity.Flag.CircleColor &&
    !polities.some(
      (candidate) =>
        candidate.Id !== polity.Id && candidate.Flag.FieldColor === polity.Flag.FieldColor,
    )
  );
}
