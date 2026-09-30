import type { Guid, Sector, SelectableEntity } from '../BaseDTO/merged_schema';

export type EditableDetailField =
  | 'NiceName'
  | 'InfoboxSummary'
  | 'BasicScan'
  | 'DetailedScan'
  | 'PoliticsScan'
  | 'DeepPoliticsScan'
  | 'GM';
export interface SectorEdits {
  sectorName: string;
  details: Record<Guid, Partial<Record<EditableDetailField, string>>>;
}

const EDITABLE_FIELDS = new Set<EditableDetailField>([
  'NiceName',
  'InfoboxSummary',
  'BasicScan',
  'DetailedScan',
  'PoliticsScan',
  'DeepPoliticsScan',
  'GM',
]);

function editableEntity(sector: Sector, id: Guid): SelectableEntity | undefined {
  for (const system of sector.Systems) {
    const found = [
      system,
      system.Star,
      ...system.Objects,
      ...system.PointsOfInterest,
      ...system.HabitablePointsOfInterest,
    ].find((entity) => entity.Id === id);
    if (found) return found;
  }
  return (
    sector.Routes.find((entity) => entity.Id === id) ??
    sector.RoutePortals.find((entity) => entity.Id === id) ??
    (sector.PlayerShip.Id === id ? sector.PlayerShip : undefined)
  );
}

export function validSectorEdits(sector: Sector, edits: SectorEdits): boolean {
  return (
    edits !== null &&
    typeof edits === 'object' &&
    typeof edits.sectorName === 'string' &&
    edits.sectorName.trim().length > 0 &&
    edits.details !== null &&
    typeof edits.details === 'object' &&
    !Array.isArray(edits.details) &&
    Object.entries(edits.details).every(
      ([id, fields]) =>
        Boolean(editableEntity(sector, id)) &&
        Object.entries(fields).every(
          ([field, value]) =>
            EDITABLE_FIELDS.has(field as EditableDetailField) && typeof value === 'string',
        ),
    )
  );
}

export function applySectorEdits(sector: Sector, edits: SectorEdits): Sector {
  const next = structuredClone(sector);
  next.SectorName = edits.sectorName;
  for (const [id, fields] of Object.entries(edits.details)) {
    const entity = editableEntity(next, id);
    if (!entity) continue;
    for (const [field, value] of Object.entries(fields) as [EditableDetailField, string][]) {
      if (field === 'NiceName') entity.NiceName = value;
      else entity.Intelligence[field] = value;
    }
  }
  return next;
}
