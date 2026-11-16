import { useEffect, useMemo, useReducer, useState } from 'react';
import { ensureSeedInUrl, randomSeed, setSeedInUrl } from '../../../framework';
import { appReducer, createAppState } from './application/appState';
import type { Preview, View } from './application/appState';
import { sectorRoleFromPath } from './application/sectorRole';
import { AppChrome, StageNav } from './features/navigation/AppChrome';
import type { StageMode } from './features/navigation/AppChrome';
import { CultureScreen } from './features/culture/CultureScreen';
import { DetailBar as FeatureDetailBar } from './features/object-inspector/DetailBar';
import { HexMap as FeatureHexMap } from './features/sector-map/HexMap';
import { SystemViewer } from './features/system-viewer/SystemViewer';
import { SymbolicSystem as FeatureSymbolicSystem } from './features/system-viewer/SymbolicSystem';
import { TopDown as FeatureTopDown } from './features/system-viewer/TopDown';
import type { DisplaySectorDTO } from '../DisplayDTO/dto';
import { isVisibleToPlayerDisplay } from './visibility_presentation';
import {
  createPrototypeApplication,
  type PrototypeApplication,
} from '../Application/prototypeApplication';

function readDisplays(application: PrototypeApplication, preview: Preview): DisplaySectorDTO[] {
  return application
    .readSectors({ preview, assetBaseUrl: import.meta.env.BASE_URL })
    .map((result) => {
      if (!result.ok) throw new Error(`Sector projection failed at ${result.path}`);
      return result.value;
    });
}

function isVisible(id: string, display: DisplaySectorDTO | null, preview: Preview) {
  return Boolean(display && (preview === 'gm' || isVisibleToPlayerDisplay(display, id)));
}

function objectKind(display: DisplaySectorDTO | null, id: string | null): string {
  return id && display ? (display.entities[id]?.kindLabel ?? '') : '';
}

export default function App() {
  const preview = sectorRoleFromPath(window.location.pathname);
  const [application] = useState(() => createPrototypeApplication(ensureSeedInUrl()));
  const [showTemperatureOverlay, setShowTemperatureOverlay] = useState(false);
  const [showPolityOverlay, setShowPolityOverlay] = useState(false);
  const [state, dispatch] = useReducer(appReducer, undefined, () =>
    createAppState(readDisplays(application, preview)),
  );
  const {
    sectors,
    activeIndex,
    view,
    selectedId: selected,
    routeContextSystemId,
    currentSystemId,
    systemMode,
  } = state;
  const display = sectors[activeIndex] ?? null;
  const currentSystem = display?.systems.find((s) => s.id === currentSystemId) ?? null;
  useEffect(() => {
    if (preview === 'player' && selected && !isVisible(selected, display, preview))
      dispatch({ type: 'selectObject', id: null });
  }, [preview, selected, display]);
  const setSelected = (id: string | null) =>
    dispatch({ type: 'selectObject', id: id && !isVisible(id, display, preview) ? null : id });
  const commandOptions = { preview, assetBaseUrl: import.meta.env.BASE_URL };
  useEffect(() => {
    const restoreSeed = () => {
      const result = application.generateSector(
        { seed: ensureSeedInUrl() },
        {
          preview: sectorRoleFromPath(window.location.pathname),
          assetBaseUrl: import.meta.env.BASE_URL,
        },
      );
      if (result.ok) dispatch({ type: 'replaceSector', display: result.display });
    };
    window.addEventListener('popstate', restoreSeed);
    return () => window.removeEventListener('popstate', restoreSeed);
  }, [application]);
  const selectRoute = (id: string, contextSystemId: string) =>
    isVisible(id, display, preview) && dispatch({ type: 'selectRoute', id, contextSystemId });
  const go = (v: View) => {
    if (preview === 'player' && v === 'culture') return;
    dispatch({ type: 'changeView', view: v });
  };
  const selectedSystemId = useMemo(() => {
    if (!selected || !display) return null;
    const entity = display.entities[selected];
    if (!entity || entity.kind === 'Route') return null;
    if (entity.kind === 'PlayerShip') return display.playerShipSystemId;
    return entity.containingSystemId;
  }, [display, selected]);
  const travelDestinationId = useMemo(() => {
    const kind = objectKind(display, selected);
    if (kind === 'SYSTEM' && view === 'system' && selectedSystemId !== currentSystemId)
      return selectedSystemId;
    if (kind !== 'ROUTE' || (view !== 'system' && view !== 'all') || !selected) return null;
    const contextSystemId = view === 'system' ? currentSystemId : routeContextSystemId;
    return contextSystemId
      ? (display?.entities[selected]?.route?.endpointSystemIds.find(
          (id) => id !== contextSystemId,
        ) ?? null)
      : null;
  }, [currentSystemId, display, routeContextSystemId, selected, selectedSystemId, view]);
  const canTravel = Boolean(
    travelDestinationId && isVisible(travelDestinationId, display, preview),
  );
  const travelToSelectedSystem = () => {
    if (!travelDestinationId || !isVisible(travelDestinationId, display, preview)) return;
    if (view === 'system')
      dispatch({ type: 'openSystem', systemId: travelDestinationId, mode: systemMode });
    else dispatch({ type: 'selectObject', id: travelDestinationId });
    if (view === 'all')
      requestAnimationFrame(() =>
        document
          .getElementById(`symbolic-system-${travelDestinationId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }),
      );
  };
  const stageMode: StageMode =
    view === 'all'
      ? 'multi-symbolic'
      : view === 'hex'
        ? 'multi-map'
        : systemMode === 'symbolic'
          ? 'single-symbolic'
          : 'single-map';
  const switchStageMode = (nextMode: StageMode) => {
    const enteringSingle = nextMode.startsWith('single');
    // A representation change inside an already-open system must not replace a
    // selected world, POI, route, or ship with the system itself.
    if (enteringSingle && view === 'system') {
      dispatch({
        type: 'changeRepresentation',
        mode: nextMode.endsWith('symbolic') ? 'symbolic' : 'topdown',
      });
      return;
    }
    if (enteringSingle) {
      const systemId = selectedSystemId ?? currentSystemId;
      if (!systemId || !display?.systems.some((system) => system.id === systemId)) return;
      dispatch({
        type: 'openSystem',
        systemId,
        mode: nextMode.endsWith('symbolic') ? 'symbolic' : 'topdown',
      });
      return;
    }
    // Returning to the sector preserves ships, systems, and routes. A star, world,
    // moon, or POI is represented by its containing system at sector scope.
    if (view === 'system' && selected) {
      const kind = objectKind(display, selected);
      if (!['PLAYER SHIP', 'SYSTEM', 'ROUTE'].includes(kind))
        dispatch({
          type: 'selectObject',
          id: display?.entities[selected]?.containingSystemId ?? null,
        });
    }
    dispatch({ type: 'returnToSector', view: nextMode.endsWith('symbolic') ? 'all' : 'hex' });
  };
  return (
    <div className={`app ${preview === 'player' ? 'player-mode' : ''}`}>
      <AppChrome
        view={view}
        preview={preview}
        go={go}
        seed={application.readSeed(activeIndex) ?? '—'}
        onReroll={() => {
          const seed = randomSeed();
          const result = application.generateSector({ seed }, commandOptions);
          if (result.ok) {
            setSeedInUrl(seed);
            dispatch({ type: 'replaceSector', display: result.display });
          }
        }}
      />
      {view === 'culture' && preview === 'gm' ? (
        display ? (
          <CultureScreen display={display.culture} />
        ) : (
          <main role="alert">Sector display unavailable.</main>
        )
      ) : (
        <>
          <main className="workspace">
            <aside className="control-sidebar" aria-label="Sector controls">
              <StageNav
                mode={stageMode}
                singleReady={Boolean(selectedSystemId || currentSystem)}
                shipSelected={selected === display?.playerShipId}
                travelReady={canTravel}
                showTemperatureOverlay={showTemperatureOverlay}
                temperatureOverlayReady={view === 'system' && systemMode === 'topdown'}
                onTemperatureOverlay={() => setShowTemperatureOverlay((current) => !current)}
                showPolityOverlay={showPolityOverlay}
                polityOverlayReady={view === 'hex' || view === 'system' || view === 'all'}
                onPolityOverlay={() => setShowPolityOverlay((current) => !current)}
                onMode={switchStageMode}
                onSelectShip={() => setSelected(display?.playerShipId ?? null)}
                onTravel={travelToSelectedSystem}
              />
            </aside>
            <section
              className={`stage ${
                view === 'hex'
                  ? 'stage-hex'
                  : view === 'system' && systemMode === 'topdown'
                    ? 'stage-topdown'
                    : ''
              }`}
            >
              {view === 'hex' && display && (
                <FeatureHexMap
                  display={display}
                  selected={selected}
                  select={setSelected}
                  preview={preview}
                  showPolityOverlay={showPolityOverlay}
                />
              )}
              {view === 'system' && currentSystem && (
                <SystemViewer
                  visible={isVisible(currentSystem.id, display, preview)}
                  mode={systemMode}
                  symbolic={
                    display ? (
                      <FeatureSymbolicSystem
                        systemId={currentSystem.id}
                        display={display}
                        selected={selected}
                        select={setSelected}
                        selectRoute={selectRoute}
                        preview={preview}
                        defaultOpen
                        showHeader={false}
                        showPolityOverlay={showPolityOverlay}
                      />
                    ) : null
                  }
                  topdown={
                    display ? (
                      <FeatureTopDown
                        systemId={currentSystem.id}
                        display={display}
                        selected={selected}
                        select={setSelected}
                        preview={preview}
                        showTemperatureOverlay={showTemperatureOverlay}
                        showPolityOverlay={showPolityOverlay}
                      />
                    ) : null
                  }
                />
              )}
              {view === 'all' && display && (
                <div className="all-systems">
                  {display.systems
                    .filter((s) => isVisible(s.id, display, preview))
                    .map((s) => (
                      <FeatureSymbolicSystem
                        key={s.id}
                        systemId={s.id}
                        display={display}
                        selected={selected}
                        select={setSelected}
                        selectRoute={selectRoute}
                        preview={preview}
                        defaultOpen={false}
                        showPolityOverlay={showPolityOverlay}
                      />
                    ))}
                </div>
              )}
            </section>
            {display ? (
              <FeatureDetailBar display={display} selectedId={selected} preview={preview} />
            ) : (
              <aside className="detail-bar" role="alert">
                Sector display unavailable.
              </aside>
            )}
          </main>
        </>
      )}
    </div>
  );
}
