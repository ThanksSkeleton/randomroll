import type { Preview, View } from '../../application/appState';
import { IconButton } from './IconButton';

export function AppChrome({
  view,
  preview,
  setPreview,
  go,
}: {
  view: View;
  preview: Preview;
  setPreview: (p: Preview) => void;
  go: (v: View) => void;
}) {
  return (
    <header className="chrome">
      <button className="brand" onClick={() => go('hex')}>
        <span className="brand-title">SECTOR NAVIGATION</span>
      </button>
      <nav aria-label="GM navigation">
        {preview === 'gm' && (
          <>
            <button
              className={`nav-item nav-item-sector ${view !== 'sectors' ? 'button-active' : 'button-allowed'}`}
              onClick={() => go('hex')}
            >
              SECTOR
            </button>
            <button
              className={`nav-item nav-item-archive ${view === 'sectors' ? 'button-active' : 'button-allowed'}`}
              onClick={() => go('sectors')}
            >
              SECTOR ARCHIVE
            </button>
          </>
        )}
      </nav>
      <div className="role-controls">
        <div className="segmented" aria-label="Preview mode">
          <button
            className={`preview-option preview-option-gm ${preview === 'gm' ? 'button-active' : 'button-allowed'}`}
            onClick={() => setPreview('gm')}
          >
            GM VIEW
          </button>
          <button
            className={`preview-option preview-option-player ${preview === 'player' ? 'button-active' : 'button-allowed'}`}
            onClick={() => setPreview('player')}
          >
            PLAYER VIEW
          </button>
        </div>
      </div>
    </header>
  );
}

export type StageMode = 'multi-symbolic' | 'multi-map' | 'single-symbolic' | 'single-map';

export function StageNav({
  mode,
  singleReady,
  shipSelected,
  travelReady,
  showTemperatureOverlay,
  temperatureOverlayReady,
  onTemperatureOverlay,
  onMode,
  onSelectShip,
  onTravel,
}: {
  mode: StageMode;
  singleReady: boolean;
  shipSelected: boolean;
  travelReady: boolean;
  showTemperatureOverlay: boolean;
  temperatureOverlayReady: boolean;
  onTemperatureOverlay: () => void;
  onMode: (mode: StageMode) => void;
  onSelectShip: () => void;
  onTravel: () => void;
}) {
  const isSystem = mode.startsWith('single');
  const isSymbolic = mode.endsWith('symbolic');
  const selectScope = (system: boolean) =>
    onMode(
      system
        ? isSymbolic
          ? 'single-symbolic'
          : 'single-map'
        : isSymbolic
          ? 'multi-symbolic'
          : 'multi-map',
    );
  const selectRepresentation = (symbolic: boolean) =>
    onMode(
      isSystem
        ? symbolic
          ? 'single-symbolic'
          : 'single-map'
        : symbolic
          ? 'multi-symbolic'
          : 'multi-map',
    );
  return (
    <div className="stage-nav sidebar-group sidebar-group-top">
      <div className="stage-nav-controls" aria-label="View mode">
        <IconButton
          icon="view-system"
          label="VIEW SYSTEM"
          title="View System"
          className={`stage-nav-travel ${travelReady ? 'button-bold-allowed' : 'button-disabled'}`}
          disabled={!travelReady}
          onClick={onTravel}
        />
        <div className="third-spacer" aria-hidden="true" />
        <IconButton
          icon="sector-view"
          label="SECTOR"
          title="Sector View"
          className={!isSystem ? 'button-active' : 'button-allowed'}
          onClick={() => selectScope(false)}
        />
        <IconButton
          icon="system-view"
          label="SYSTEM"
          title="System View"
          className={
            isSystem ? 'button-active' : singleReady ? 'button-bold-allowed' : 'button-disabled'
          }
          disabled={!singleReady && !isSystem}
          onClick={() => selectScope(true)}
        />
        <div className="third-spacer" aria-hidden="true" />
        <div className="stage-nav-pair stage-nav-representation" aria-label="Representation">
          <IconButton
            icon="symbolic-view"
            label="SYMBOLIC"
            title="Symbolic View"
            className={isSymbolic ? 'button-active' : 'button-allowed'}
            onClick={() => selectRepresentation(true)}
          />
          <IconButton
            icon="map-view"
            label="MAP"
            title="Map View"
            className={!isSymbolic ? 'button-active' : 'button-allowed'}
            onClick={() => selectRepresentation(false)}
          />
        </div>
        <div className="third-spacer" aria-hidden="true" />
        <IconButton
          icon="temperate-overlay"
          label="TEMPERATE OVERLAY"
          title="Temperate Overlay"
          className={`temperature-sidebar-button ${showTemperatureOverlay ? 'button-active' : 'button-allowed'}`}
          disabled={!temperatureOverlayReady}
          pressed={showTemperatureOverlay}
          onClick={onTemperatureOverlay}
        />
        <IconButton
          icon="select-ship"
          label="SELECT SHIP"
          title="Select Ship"
          className={`stage-nav-select-ship ${shipSelected ? 'button-active' : 'button-allowed'}`}
          onClick={onSelectShip}
        />
      </div>
    </div>
  );
}
