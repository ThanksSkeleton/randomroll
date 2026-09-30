import { useEffect, useMemo, useReducer, useState } from 'react';
import { appReducer, createAppState } from './application/appState';
import type { EditDraft, Preview, View } from './application/appState';
import { AppChrome, StageNav } from './features/navigation/AppChrome';
import type { StageMode } from './features/navigation/AppChrome';
import { SectorArchive } from './features/sector-archive/SectorArchive';
import { CultureScreen } from './features/culture/CultureScreen';
import { DetailBar as FeatureDetailBar } from './features/object-inspector/DetailBar';
import { GMEditBar as FeatureGMEditBar } from './features/sector-editor/GMEditBar';
import { HexMap as FeatureHexMap } from './features/sector-map/HexMap';
import { SystemViewer } from './features/system-viewer/SystemViewer';
import { SymbolicSystem as FeatureSymbolicSystem } from './features/system-viewer/SymbolicSystem';
import { TopDown as FeatureTopDown } from './features/system-viewer/TopDown';
import type { DisplaySectorDTO } from '../DisplayDTO/dto';
import { isVisibleToPlayerDisplay } from './visibility_presentation';
import {
  createPrototypeApplication,
  type PrototypeApplication,
  type SectorCommandResult,
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
  const [application] = useState(createPrototypeApplication);
  const [showTemperatureOverlay, setShowTemperatureOverlay] = useState(false);
  const [showPolityOverlay, setShowPolityOverlay] = useState(false);
  const [state, dispatch] = useReducer(appReducer, undefined, () =>
    createAppState(readDisplays(application, 'gm')),
  );
  const isGmSession = application.getCurrentSession().role === 'gm';
  const {
    sectors,
    activeIndex,
    archiveIndex,
    view,
    preview,
    selectedId: selected,
    routeContextSystemId,
    currentSystemId,
    systemMode,
    locked,
    editDraft,
  } = state;
  const display = sectors[activeIndex] ?? null;
  const currentSystem = display?.systems.find((s) => s.id === currentSystemId) ?? null;
  useEffect(() => {
    if (preview === 'player' && selected && !isVisible(selected, display, preview))
      dispatch({ type: 'selectObject', id: null });
  }, [preview, selected, display]);
  const setSelected = (id: string | null) => dispatch({ type: 'selectObject', id });
  const commandOptions = { preview, assetBaseUrl: import.meta.env.BASE_URL };
  const applyCommand = (result: SectorCommandResult) => {
    if (!result.ok) return;
    dispatch({ type: 'updateSector', display: result.display });
    if (selected && !result.display.entities[selected]) setSelected(null);
  };
  const setLocked = (next: boolean) => {
    if (next) dispatch({ type: 'discardEditing' });
  };
  const updateDraft = (update: (draft: EditDraft) => EditDraft) =>
    dispatch({
      type: 'updateDraft',
      draft: update(editDraft ?? { sectorName: display?.name ?? '', details: {} }),
    });
  const discardEdit = () => dispatch({ type: 'discardEditing' });
  const beginEdit = () =>
    dispatch({ type: 'beginEditing', draft: { sectorName: display?.name ?? '', details: {} } });
  const saveEdit = () => {
    if (!editDraft) return;
    const result = application.editSector(activeIndex, editDraft, {
      preview,
      assetBaseUrl: import.meta.env.BASE_URL,
    });
    if (result.ok) dispatch({ type: 'saveEditing', display: result.display });
  };
  const selectRoute = (id: string, contextSystemId: string) =>
    dispatch({ type: 'selectRoute', id, contextSystemId });
  const go = (v: View) => dispatch({ type: 'changeView', view: v });
  const setPreviewMode = (next: Preview) =>
    dispatch({ type: 'changePreview', preview: next, sectors: readDisplays(application, next) });
  const canMove = useMemo(() => {
    const k = objectKind(display, selected);
    const targetIsMovable =
      view === 'hex'
        ? k === 'SYSTEM'
        : view === 'system' || view === 'all'
          ? ['SYSTEM', 'WORLD', 'MOON'].includes(k)
          : false;
    return !locked && targetIsMovable;
  }, [locked, display, selected, view]);
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
  const canTravel = Boolean(travelDestinationId);
  const travelToSelectedSystem = () => {
    if (!travelDestinationId) return;
    discardEdit();
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
    discardEdit();
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
      <AppChrome view={view} preview={preview} setPreview={setPreviewMode} go={go} />
      {view === 'culture' && preview === 'gm' && isGmSession ? (
        display ? (
          <CultureScreen
            display={display.culture}
            onCompleteWorld={(worldId) => {
              const result = application.completeWorld(activeIndex, worldId, commandOptions);
              if (result.ok) dispatch({ type: 'updateSector', display: result.display });
            }}
          />
        ) : (
          <main role="alert">Sector display unavailable.</main>
        )
      ) : view === 'sectors' ? (
        <main className="workspace no-inspector">
          <SectorArchive
            sectors={application.readArchiveSectors()}
            selectedIndex={archiveIndex}
            setSelectedIndex={(index) => dispatch({ type: 'setArchiveIndex', index })}
            load={() => {
              if (application.readSector(archiveIndex, commandOptions).ok)
                dispatch({ type: 'loadSector', index: archiveIndex });
            }}
            generate={(seed, mode) => {
              const result = application.generateSector(seed, mode, commandOptions);
              if (result.ok)
                dispatch({
                  type: 'replaceSectors',
                  sectors: [...sectors, result.display],
                  archiveIndex: sectors.length,
                });
            }}
            rename={(name) => {
              const result = application.renameSector(archiveIndex, name, commandOptions);
              if (result.ok)
                dispatch({
                  type: 'replaceSectors',
                  sectors: sectors.map((sector, index) =>
                    index === archiveIndex ? result.display : sector,
                  ),
                });
            }}
            remove={() => {
              const result = application.deleteSector(archiveIndex);
              if (result.ok) {
                const nextActiveIndex =
                  activeIndex === archiveIndex
                    ? result.nextIndex
                    : activeIndex > archiveIndex
                      ? activeIndex - 1
                      : activeIndex;
                dispatch({
                  type: 'replaceSectors',
                  sectors: sectors.filter((_, index) => index !== archiveIndex),
                  archiveIndex: result.nextIndex,
                  activeIndex: nextActiveIndex,
                });
              }
            }}
          />
        </main>
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
              {isGmSession && display ? (
                <FeatureGMEditBar
                  hidden={preview !== 'gm'}
                  locked={locked}
                  setLocked={setLocked}
                  canMove={canMove}
                  selected={selected}
                  display={display}
                  onMove={(targetId) =>
                    applyCommand(application.moveShip(activeIndex, targetId, commandOptions))
                  }
                  onVisibility={(id, visibility) =>
                    applyCommand(
                      application.setScanVisibility(activeIndex, id, visibility, commandOptions),
                    )
                  }
                  onDelete={(id) =>
                    applyCommand(application.deleteObject(activeIndex, id, commandOptions))
                  }
                  view={view}
                  draft={editDraft}
                  beginEdit={beginEdit}
                  saveEdit={saveEdit}
                />
              ) : null}
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
              <FeatureDetailBar
                display={display}
                selectedId={selected}
                preview={preview}
                locked={locked}
                draft={editDraft}
                setDraft={updateDraft}
              />
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
