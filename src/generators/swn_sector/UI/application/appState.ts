import type { DisplaySectorDTO } from '../../DisplayDTO/dto';

export type View = 'hex' | 'system' | 'all' | 'culture';
export type Preview = 'gm' | 'player';
export type SystemMode = 'symbolic' | 'topdown';
export type EditableDetailField =
  'NiceName' | 'BasicScan' | 'DetailedScan' | 'PoliticsScan' | 'DeepPoliticsScan' | 'GM';
export type EditDraft = {
  sectorName: string;
  details: Record<string, Partial<Record<EditableDetailField, string>>>;
};

export type AppState = {
  sectors: DisplaySectorDTO[];
  activeIndex: number;
  view: View;
  preview: Preview;
  selectedId: string | null;
  routeContextSystemId: string | null;
  currentSystemId: string | null;
  systemMode: SystemMode;
  locked: boolean;
  editDraft: EditDraft | null;
};

export type AppAction =
  | { type: 'selectObject'; id: string | null }
  | { type: 'selectRoute'; id: string; contextSystemId: string }
  | { type: 'changePreview'; preview: Preview; sectors: DisplaySectorDTO[] }
  | { type: 'changeView'; view: View }
  | { type: 'openSystem'; systemId: string; mode: SystemMode }
  | { type: 'changeRepresentation'; mode: SystemMode }
  | { type: 'returnToSector'; view: 'hex' | 'all' }
  | { type: 'beginEditing'; draft: EditDraft }
  | { type: 'updateDraft'; draft: EditDraft }
  | { type: 'discardEditing' }
  | { type: 'saveEditing'; display: DisplaySectorDTO }
  | { type: 'updateSector'; display: DisplaySectorDTO }
  | { type: 'replaceSector'; display: DisplaySectorDTO };

export function createAppState(sectors: DisplaySectorDTO[]): AppState {
  return {
    sectors,
    activeIndex: 0,
    view: 'hex',
    preview: 'gm',
    selectedId: null,
    routeContextSystemId: null,
    currentSystemId: null,
    systemMode: 'symbolic',
    locked: true,
    editDraft: null,
  };
}

function clearNavigation(state: AppState): AppState {
  return { ...state, selectedId: null, routeContextSystemId: null, editDraft: null, locked: true };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'selectObject':
      return { ...state, selectedId: action.id, routeContextSystemId: null };
    case 'selectRoute':
      return { ...state, selectedId: action.id, routeContextSystemId: action.contextSystemId };
    case 'changePreview': {
      const playerRestricted =
        action.preview === 'player' &&
        (state.view === 'all' || state.view === 'culture');
      if (playerRestricted)
        return {
          ...clearNavigation(state),
          preview: action.preview,
          sectors: action.sectors,
          view: 'hex',
          currentSystemId: null,
        };
      return {
        ...state,
        preview: action.preview,
        sectors: action.sectors,
        editDraft: null,
        locked: true,
      };
    }
    case 'changeView':
      return {
        ...clearNavigation(state),
        view: action.view,
        currentSystemId: action.view === 'system' ? state.currentSystemId : null,
      };
    case 'openSystem':
      return {
        ...state,
        view: 'system',
        currentSystemId: action.systemId,
        systemMode: action.mode,
        selectedId: action.systemId,
        routeContextSystemId: null,
        editDraft: null,
        locked: true,
      };
    case 'changeRepresentation':
      return { ...state, systemMode: action.mode, editDraft: null, locked: true };
    case 'returnToSector':
      return {
        ...state,
        view: action.view,
        currentSystemId: null,
        routeContextSystemId: null,
        editDraft: null,
        locked: true,
      };
    case 'beginEditing':
      return { ...state, editDraft: action.draft, locked: false };
    case 'updateDraft':
      return { ...state, editDraft: action.draft };
    case 'discardEditing':
      return { ...state, editDraft: null, locked: true };
    case 'saveEditing':
      return {
        ...state,
        sectors: state.sectors.map((sector, index) =>
          index === state.activeIndex ? action.display : sector,
        ),
        editDraft: null,
        locked: true,
      };
    case 'updateSector':
      return {
        ...state,
        sectors: state.sectors.map((sector, index) =>
          index === state.activeIndex ? action.display : sector,
        ),
      };
    case 'replaceSector':
      return {
        ...clearNavigation(state),
        sectors: [action.display],
        activeIndex: 0,
        view: 'hex',
        currentSystemId: null,
      };
  }
}
