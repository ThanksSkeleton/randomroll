import type { DisplaySectorDTO } from '../DisplayDTO/dto';

export function isVisibleToPlayerDisplay(display: DisplaySectorDTO, id: string): boolean {
  const entity = display.entities[id];
  if (!entity) return false;
  if (entity.kind === 'HabitablePointOfInterest') {
    const hostId = entity.habitablePoi?.hostId;
    return (
      !entity.habitablePoi?.absent &&
      entity.visibility.BasicScan &&
      Boolean(hostId && display.entities[hostId]?.visibility.BasicScan)
    );
  }
  return entity.visibility.BasicScan;
}
