import type { Sector, StarType, Temperature } from './merged_schema';
import {
  directOrbitAuBand,
  directOrbitAuRange,
  directOrbitTemperatures,
  normalTemperatureAuBand,
  systemEdgeAu,
} from './spatial_interpretation';

export type SystemSpatialDisplayDTO = {
  systemId: string;
  starType: StarType;
  hexLocation: { Column: number; Row: number };
  inspectorBasic: string;
  systemEdgeAu: number;
  directOrbitAuRange: readonly [number, number];
  normalTemperatureAuBand: readonly [number, number];
  normalTemperatureBandEmpty: boolean;
  temperatureBands: ReadonlyArray<{
    temperature: Temperature;
    au: readonly [number, number];
  }>;
};

export function projectSystemSpatial(
  sector: Sector,
  systemId: string,
): SystemSpatialDisplayDTO | undefined {
  const system = sector.Systems.find((candidate) => candidate.Id === systemId);
  if (!system) return undefined;
  const starType = system.Star.StarType;
  const normalBand = normalTemperatureAuBand(starType);
  return {
    systemId,
    starType,
    hexLocation: { ...system.HexLocation },
    inspectorBasic: `${starType} Type`,
    systemEdgeAu: systemEdgeAu(starType),
    directOrbitAuRange: directOrbitAuRange(starType),
    normalTemperatureAuBand: normalBand,
    normalTemperatureBandEmpty: normalBand[0] === normalBand[1],
    temperatureBands: directOrbitTemperatures(starType).map((temperature) => ({
      temperature,
      au: directOrbitAuBand(starType, temperature),
    })),
  };
}
