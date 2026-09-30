import type { SystemSpatialDisplayDTO } from '../DisplayDTO/dto';
import type { Sector } from '../BaseDTO/merged_schema';
import {
  directOrbitAuBand,
  directOrbitAuRange,
  directOrbitTemperatures,
} from '../Shared/spatial_interpretation';
import { normalTemperatureAuBand, systemEdgeAu } from './system_presentation_interpretation';

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
