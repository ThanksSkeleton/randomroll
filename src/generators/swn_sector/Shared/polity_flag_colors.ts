import rawColors from '../Data/Raw/Other/polity_flag_colors.json';
import type { PolityFlagColor } from '../BaseDTO/merged_schema';

export const POLITY_FLAG_COLORS = rawColors.colors as readonly PolityFlagColor[];
