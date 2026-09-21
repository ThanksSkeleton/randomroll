import { VisibilityLevel } from '../../../merged_schema';
import type { Sector } from '../../../merged_schema';
import {
  deleteSectorObject,
  relocatePlayerShip,
  updateObjectVisibility,
} from '../../domain/sector/operations';
import { findDetails, objectKindLabel } from '../../domain/sector/selectors';
import type { EditDraft, View } from '../../application/appState';

export function GMEditBar({
  locked,
  setLocked,
  canMove,
  selected,
  sector,
  mutate,
  view: _view,
  draft: _draft,
  beginEdit,
  saveEdit,
}: {
  locked: boolean;
  setLocked: (v: boolean) => void;
  canMove: boolean;
  selected: string | null;
  sector: Sector;
  mutate: (s: Sector) => void;
  view: View;
  draft: EditDraft | null;
  beginEdit: () => void;
  saveEdit: () => void;
}) {
  const info = selected ? findDetails(sector, selected) : undefined;
  const kind = objectKindLabel(sector, selected);
  const move = () => {
    if (!selected || !canMove) return;
    const result = relocatePlayerShip(sector, selected);
    if (result.ok) mutate(result.value);
  };
  return (
    <footer className="edit-bar">
      <div className="edit-title">
        <div>
          <strong className="edit-title-label">GM EDIT</strong>
        </div>
      </div>
      <button
        className={`lock lock-state-button ${locked ? 'button-bold-allowed' : 'button-allowed'}`}
        onClick={() => {
          if (locked) {
            beginEdit();
            setLocked(false);
          } else {
            saveEdit();
            setLocked(true);
          }
        }}
      >
        {locked ? '▣ LOCKED' : '□ UNLOCKED'}
      </button>
      <button
        className={`move-ship-button ${canMove ? 'button-allowed' : 'button-disabled'}`}
        onClick={move}
        disabled={!canMove}
      >
        ⌖ MOVE SHIP TO TARGET
      </button>
      <div className="vis-controls">
        <span className="edit-visibility-label">VISIBILITY</span>
        {(
          [
            VisibilityLevel.NONE,
            VisibilityLevel.BASIC_SCAN,
            VisibilityLevel.CULTURE_PARTIAL,
            VisibilityLevel.CULTURE_FULL,
          ] as const
        ).map((level) => {
          const enabled = !locked && Boolean(info);
          return (
            <button
              key={level}
              disabled={!enabled}
              className={`visibility-level-${level.toLowerCase()} ${!enabled ? 'button-disabled' : info?.VisibilityLevel === level ? 'button-active' : 'button-allowed'}`}
              onClick={() => {
                if (!selected) return;
                const result = updateObjectVisibility(sector, selected, level);
                if (result.ok) mutate(result.value);
              }}
            >
              {level}
            </button>
          );
        })}
      </div>
      <button
        className={`danger delete-target-button ${!locked && Boolean(selected) && kind !== 'PLAYER SHIP' && kind !== 'STAR' ? 'button-scary-allowed' : 'button-disabled'}`}
        disabled={locked || !selected || kind === 'PLAYER SHIP' || kind === 'STAR'}
        onClick={() => {
          if (!selected) return;
          const result = deleteSectorObject(sector, selected);
          if (result.ok) mutate(result.value);
        }}
      >
        ⌫ DELETE TARGET
      </button>
    </footer>
  );
}
