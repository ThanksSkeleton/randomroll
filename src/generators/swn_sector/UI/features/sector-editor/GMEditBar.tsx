import type { CSSProperties } from 'react';
import type { DisplaySectorDTO, DisplaySelectableDTO } from '../../../DisplayDTO/dto';
import type { EditDraft, View } from '../../application/appState';
import { IconButton } from '../navigation/IconButton';
import { LayeredVisibilitySymbol } from '../navigation/LayeredVisibilitySymbol';
import type { VisibilityGlyphSettings } from '../navigation/LayeredVisibilitySymbol';

type VisibilityChoice = 'noVis' | 'sci1' | 'sci2' | 'pol0' | 'pol1' | 'pol2';
const VISIBILITY_CHOICES: Array<{
  key: VisibilityChoice;
  label: string;
  marks: Array<'beaker' | 'flag' | 'flag-outline'>;
  crossedOut?: boolean;
}> = [
  { key: 'noVis', label: 'NO VIS', marks: [], crossedOut: true },
  { key: 'sci1', label: 'Sci 1', marks: ['beaker'] },
  { key: 'sci2', label: 'Sci 2', marks: ['beaker', 'beaker'] },
  { key: 'pol0', label: 'Pol 0', marks: ['flag-outline'] },
  { key: 'pol1', label: 'Pol 1', marks: ['flag'] },
  { key: 'pol2', label: 'Pol 2', marks: ['flag', 'flag'] },
];
const VISIBILITY_GLYPH_SETTINGS: VisibilityGlyphSettings = {
  noVis: { size: 47, buttonWidth: 104, offsetX: 0, offsetY: 0 },
  sci1: { size: 50, buttonWidth: 62, offsetX: -20, offsetY: 0 },
  sci2: { size: 50, buttonWidth: 60, offsetX: -29, offsetY: 0 },
  pol0: { size: 50, buttonWidth: 62, offsetX: -47, offsetY: 0 },
  pol1: { size: 50, buttonWidth: 62, offsetX: -47, offsetY: 0 },
  pol2: { size: 50, buttonWidth: 62, offsetX: -48, offsetY: 0 },
};

function isChoiceActive(choice: VisibilityChoice, visibility: DisplaySelectableDTO['visibility']) {
  switch (choice) {
    case 'noVis':
      return !visibility.BasicScan && !visibility.PoliticsScan;
    case 'sci1':
      return visibility.BasicScan && !visibility.DetailedScan;
    case 'sci2':
      return visibility.DetailedScan;
    case 'pol0':
      return visibility.BasicScan && !visibility.PoliticsScan;
    case 'pol1':
      return visibility.PoliticsScan && !visibility.DeepPoliticsScan;
    case 'pol2':
      return visibility.DeepPoliticsScan;
  }
}

function toggleChoice(
  choice: VisibilityChoice,
  visibility: DisplaySelectableDTO['visibility'],
): DisplaySelectableDTO['visibility'] {
  const next = { ...visibility };
  switch (choice) {
    case 'noVis':
      if (!visibility.BasicScan) next.BasicScan = true;
      else
        return {
          BasicScan: false,
          DetailedScan: false,
          PoliticsScan: false,
          DeepPoliticsScan: false,
        };
      break;
    case 'sci1':
      if (visibility.BasicScan && !visibility.DetailedScan)
        return {
          BasicScan: false,
          DetailedScan: false,
          PoliticsScan: false,
          DeepPoliticsScan: false,
        };
      next.BasicScan = true;
      next.DetailedScan = false;
      break;
    case 'sci2':
      next.BasicScan = true;
      next.DetailedScan = !visibility.DetailedScan;
      break;
    case 'pol0':
      next.PoliticsScan = !visibility.PoliticsScan;
      next.DeepPoliticsScan = false;
      break;
    case 'pol1':
      next.BasicScan = true;
      if (visibility.PoliticsScan && !visibility.DeepPoliticsScan) {
        next.PoliticsScan = false;
        next.DeepPoliticsScan = false;
      } else {
        next.PoliticsScan = true;
        next.DeepPoliticsScan = false;
      }
      break;
    case 'pol2':
      next.BasicScan = true;
      next.PoliticsScan = true;
      next.DeepPoliticsScan = !visibility.DeepPoliticsScan;
      break;
  }
  return next;
}

export function GMEditBar({
  locked,
  hidden = false,
  setLocked,
  canMove,
  selected,
  display,
  onMove,
  onVisibility,
  onDelete,
  view: _view,
  draft: _draft,
  beginEdit,
  saveEdit,
}: {
  locked: boolean;
  hidden?: boolean;
  setLocked: (v: boolean) => void;
  canMove: boolean;
  selected: string | null;
  display: DisplaySectorDTO;
  onMove: (targetId: string) => void;
  onVisibility: (id: string, visibility: DisplaySelectableDTO['visibility']) => void;
  onDelete: (id: string) => void;
  view: View;
  draft: EditDraft | null;
  beginEdit: () => void;
  saveEdit: () => void;
}) {
  const info = selected ? display.entities[selected] : undefined;
  const kind = info?.kindLabel ?? '';
  const move = () => {
    if (!selected || !canMove) return;
    onMove(selected);
  };
  const renderVisibilityChoice = ({
    key,
    label,
    marks,
    crossedOut,
  }: (typeof VISIBILITY_CHOICES)[number]) => {
    const active = info ? isChoiceActive(key, info.visibility) : false;
    return (
      <button
        key={key}
        type="button"
        aria-label={label}
        aria-pressed={active}
        title={label}
        disabled={
          locked ||
          !info ||
          ((key === 'pol0' || key === 'pol1' || key === 'pol2') && !info.visibility.BasicScan)
        }
        className={`visibility-state-button visibility-choice-${key} icon-button ${active ? 'button-active' : 'button-allowed'}`}
        style={
          {
            '--visibility-button-width': `${VISIBILITY_GLYPH_SETTINGS[key].buttonWidth}px`,
          } as CSSProperties
        }
        onClick={() => {
          if (!selected || !info) return;
          const target = toggleChoice(key, info.visibility);
          onVisibility(selected, target);
        }}
      >
        <LayeredVisibilitySymbol
          marks={[...marks]}
          crossedOut={crossedOut}
          showEye={key === 'noVis'}
          {...VISIBILITY_GLYPH_SETTINGS[key]}
        />
        {key === 'noVis' && <span>{label}</span>}
      </button>
    );
  };
  return (
    <>
      <div className="edit-bar sidebar-group sidebar-group-bottom" hidden={hidden}>
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
        <div className="vis-controls" aria-label="Scan visibility choices">
          {renderVisibilityChoice(VISIBILITY_CHOICES[0])}
          <div className="vis-option-columns" aria-label="Science and culture visibility options">
            {VISIBILITY_CHOICES.slice(1).map(renderVisibilityChoice)}
          </div>
        </div>
        <div className="sidebar-spacer" aria-hidden="true" />
        <IconButton
          icon="delete-target"
          label="⌫ DELETE TARGET"
          title="Delete Target"
          className={`danger delete-target-button ${!locked && Boolean(selected) && kind !== 'PLAYER SHIP' && kind !== 'STAR' && !['ORBITAL STATION', 'STARPORT', 'PLANETARY DEFENSES', 'GARRISON'].includes(kind) ? 'button-scary-allowed' : 'button-disabled'}`}
          disabled={
            locked ||
            !selected ||
            kind === 'PLAYER SHIP' ||
            kind === 'STAR' ||
            ['ORBITAL STATION', 'STARPORT', 'PLANETARY DEFENSES', 'GARRISON'].includes(kind)
          }
          onClick={() => {
            if (!selected) return;
            onDelete(selected);
          }}
        />
      </div>
    </>
  );
}
