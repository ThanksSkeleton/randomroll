import type { ReactNode } from 'react';
import type { Preview, View } from '../../application/appState';

export function AppChrome({ view, preview, setPreview, go }: { view: View; preview: Preview; setPreview: (p: Preview) => void; go: (v: View) => void }) {
  return <header className="chrome">
    <button className="brand" onClick={() => go('hex')}><span className="brand-title">SECTOR NAVIGATION</span></button>
    <nav aria-label="GM navigation">
      {preview === 'gm' && <>
        <button className={`nav-item nav-item-sector ${view !== 'sectors' ? 'button-active' : 'button-allowed'}`} onClick={() => go('hex')}>SECTOR</button>
        <button className={`nav-item nav-item-archive ${view === 'sectors' ? 'button-active' : 'button-allowed'}`} onClick={() => go('sectors')}>SECTOR ARCHIVE</button>
      </>}
    </nav>
    <div className="role-controls">
      <div className="segmented" aria-label="Preview mode">
        <button className={`preview-option preview-option-gm ${preview === 'gm' ? 'button-active' : 'button-allowed'}`} onClick={() => setPreview('gm')}>GM VIEW</button>
        <button className={`preview-option preview-option-player ${preview === 'player' ? 'button-active' : 'button-allowed'}`} onClick={() => setPreview('player')}>PLAYER VIEW</button>
      </div>
    </div>
  </header>;
}

export type StageMode = 'multi-symbolic' | 'multi-map' | 'single-symbolic' | 'single-map';

export function StageNav({ name, mode, singleReady, shipSelected, travelReady, onMode, onSelectShip, onTravel }: { name: ReactNode; mode: StageMode; singleReady: boolean; shipSelected: boolean; travelReady: boolean; onMode: (mode: StageMode) => void; onSelectShip: () => void; onTravel: () => void }) {
  const isSystem = mode.startsWith('single');
  const isSymbolic = mode.endsWith('symbolic');
  const selectScope = (system: boolean) => onMode(system ? (isSymbolic ? 'single-symbolic' : 'single-map') : (isSymbolic ? 'multi-symbolic' : 'multi-map'));
  const selectRepresentation = (symbolic: boolean) => onMode(isSystem ? (symbolic ? 'single-symbolic' : 'single-map') : (symbolic ? 'multi-symbolic' : 'multi-map'));
  return <header className="stage-nav">
    <div className="stage-nav-name">{name}</div>
    <div className="stage-nav-controls" aria-label="View mode">
      <button className={`stage-nav-select-ship ${shipSelected ? 'button-active' : 'button-allowed'}`} onClick={onSelectShip}>SELECT SHIP</button>
      <button className={`stage-nav-travel ${travelReady ? 'button-bold-allowed' : 'button-disabled'}`} disabled={!travelReady} onClick={onTravel}>TRAVEL TO</button>
      <div className="stage-nav-pair stage-nav-scope" aria-label="Scope"><button className={!isSystem ? 'button-active' : 'button-allowed'} onClick={() => selectScope(false)}>SECTOR</button><button className={isSystem ? 'button-active' : singleReady ? 'button-bold-allowed' : 'button-disabled'} disabled={!singleReady && !isSystem} onClick={() => selectScope(true)}>SYSTEM</button></div>
      <div className="stage-nav-pair stage-nav-representation" aria-label="Representation"><button className={isSymbolic ? 'button-active' : 'button-allowed'} onClick={() => selectRepresentation(true)}>SYMBOLIC</button><button className={!isSymbolic ? 'button-active' : 'button-allowed'} onClick={() => selectRepresentation(false)}>MAP</button></div>
    </div>
  </header>;
}
