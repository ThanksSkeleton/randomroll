import { VisibilityLevel } from '../../../merged_schema';
import type { Sector } from '../../../merged_schema';
import {
  deleteSectorObject,
  relocatePlayerShip,
  updateObjectVisibility,
} from '../../domain/sector/operations';
import { findDetails, objectKindLabel } from '../../domain/sector/selectors';
import type { EditDraft, View } from '../../application/appState';
import { IconButton } from '../navigation/IconButton';

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
    <div className="edit-bar sidebar-group sidebar-group-bottom">
      <IconButton
        icon="gm-lock"
        label={locked ? '▣ LOCKED' : '□ UNLOCKED'}
        title="GM Lock"
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
      />
      <div className="third-spacer" aria-hidden="true" />
      <IconButton
        icon="move-ship"
        label="MOVE SHIP TO TARGET"
        title="Move Ship"
        className={`move-ship-button ${canMove ? 'button-allowed' : 'button-disabled'}`}
        onClick={move}
        disabled={!canMove}
      />
      <div className="third-spacer" aria-hidden="true" />
      <div className="vis-controls">
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
            <IconButton
              key={level}
              icon={
                level === VisibilityLevel.NONE
                  ? 'visibility-none'
                  : level === VisibilityLevel.BASIC_SCAN
                    ? 'visibility-basic'
                    : level === VisibilityLevel.CULTURE_PARTIAL
                      ? 'visibility-cultural-partial'
                      : 'visibility-cultural-full'
              }
              label={`VISIBILITY: ${level}`}
              title={`Visibility: ${
                level === VisibilityLevel.NONE
                  ? 'None'
                  : level === VisibilityLevel.BASIC_SCAN
                    ? 'Basic'
                    : level === VisibilityLevel.CULTURE_PARTIAL
                      ? 'Cultural Partial'
                      : 'Cultural Full'
              }`}
              disabled={!enabled}
              className={`visibility-level-${level.toLowerCase()} ${info?.VisibilityLevel === level ? 'button-active' : !enabled ? 'button-disabled' : 'button-allowed'}`}
              onClick={() => {
                if (!selected) return;
                const result = updateObjectVisibility(sector, selected, level);
                if (result.ok) mutate(result.value);
              }}
            />
          );
        })}
      </div>
      <div className="sidebar-spacer" aria-hidden="true" />
      <IconButton
        icon="delete-target"
        label="⌫ DELETE TARGET"
        title="Delete Target"
        className={`danger delete-target-button ${!locked && Boolean(selected) && kind !== 'PLAYER SHIP' && kind !== 'STAR' ? 'button-scary-allowed' : 'button-disabled'}`}
        disabled={locked || !selected || kind === 'PLAYER SHIP' || kind === 'STAR'}
        onClick={() => {
          if (!selected) return;
          const result = deleteSectorObject(sector, selected);
          if (result.ok) mutate(result.value);
        }}
      />
    </div>
  );
}
