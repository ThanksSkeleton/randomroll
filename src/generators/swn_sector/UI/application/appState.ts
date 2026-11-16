import type { DisplaySectorDTO } from '../../DisplayDTO/dto';

export type View = 'hex' | 'system' | 'all' | 'culture';
export type Preview = 'gm' | 'player';
export type SystemMode = 'symbolic' | 'topdown';
export type AppState = {
  sectors: DisplaySectorDTO[];
  activeIndex: number;
  view: View;
  preview: Preview;
  selectedId: string | null;
  routeContextSystemId: string | null;
  currentSystemId: string | null;
  systemMode: SystemMode;
};

export type AppAction =
  | { type: 'selectObject'; id: string | null }
  | { type: 'selectRoute'; id: string; contextSystemId: string }
  | { type: 'changePreview'; preview: Preview; sectors: DisplaySectorDTO[] }
  | { type: 'changeView'; view: View }
  | { type: 'openSystem'; systemId: string; mode: SystemMode }
  | { type: 'changeRepresentation'; mode: SystemMode }
  | { type: 'returnToSector'; view: 'hex' | 'all' }
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
  };
}

function clearNavigation(state: AppState): AppState {
  return { ...state, selectedId: null, routeContextSystemId: null };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'selectObject':
      return { ...state, selectedId: action.id, routeContextSystemId: null };
    case 'selectRoute':
      return { ...state, selectedId: action.id, routeContextSystemId: action.contextSystemId };
    case 'changePreview': {
      const playerRestricted =
        action.preview === 'player' && (state.view === 'all' || state.view === 'culture');
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
      };
    case 'changeRepresentation':
      return { ...state, systemMode: action.mode };
    case 'returnToSector':
      return {
        ...state,
        view: action.view,
        currentSystemId: null,
        routeContextSystemId: null,
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
