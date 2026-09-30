import type { ObjectSpatialDisplayDTO } from '../DisplayDTO/dto';
import type { Sector } from '../BaseDTO/merged_schema';
import { effectiveOrbit } from '../Shared/spatial_interpretation';
import {
  projectOtherObjectGlyphClass,
  projectOtherObjectTypeLabel,
} from './object_kind_projection';
import { formatPlanetAu } from './planet_presentation_interpretation';

export function projectObjectSpatial(
  sector: Sector,
  objectId: string,
): ObjectSpatialDisplayDTO | undefined {
  const system = sector.Systems.find((candidate) =>
    candidate.Objects.some((object) => object.Id === objectId),
  );
  const object = system?.Objects.find((candidate) => candidate.Id === objectId);
  if (!system || !object) return undefined;
  const effective = effectiveOrbit(system, objectId);
  if (!effective) return undefined;
  const typeLabel =
    object.Kind === 'OtherCelestialObject' ? projectOtherObjectTypeLabel(object.ObjectType) : null;
  return {
    id: object.Id,
    kind: object.Kind,
    parentId: object.Orbit.ParentObjectId,
    angleDegrees: object.Orbit.AngleDegrees,
    effectiveAu: effective.au,
    temperature: effective.temperature,
    kindLabel:
      object.Kind === 'Planet'
        ? object.Orbit.ParentObjectId === null
          ? 'WORLD'
          : 'MOON'
        : 'OTHERCELESTIALOBJECT',
    typeLabel,
    glyphClass:
      object.Kind === 'OtherCelestialObject'
        ? projectOtherObjectGlyphClass(object.ObjectType)
        : null,
    inspectorBasic: typeLabel === null ? null : `${formatPlanetAu(effective.au)} AU - ${typeLabel}`,
  };
}
