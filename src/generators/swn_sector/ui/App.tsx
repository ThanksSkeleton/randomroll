import { useEffect, useMemo, useReducer, useState } from 'react';
import { appReducer, createAppState } from './application/appState';
import type { EditDraft, Preview, View } from './application/appState';
import { AppChrome, StageNav } from './features/navigation/AppChrome';
import type { StageMode } from './features/navigation/AppChrome';
import { SectorArchive } from './features/sector-archive/SectorArchive';
import { DetailBar as FeatureDetailBar } from './features/object-inspector/DetailBar';
import { GMEditBar as FeatureGMEditBar } from './features/sector-editor/GMEditBar';
import { HexMap as FeatureHexMap } from './features/sector-map/HexMap';
import { SystemViewer } from './features/system-viewer/SystemViewer';
import { SymbolicSystem as FeatureSymbolicSystem } from './features/system-viewer/SymbolicSystem';
import { TopDown as FeatureTopDown } from './features/system-viewer/TopDown';
import { VisibilityLevel, visibilityRank } from './domain/sector/model';
import type { DetailsAndVisibility, Sector } from './domain/sector/model';
import { applySectorEdits } from './domain/sector/operations';
import {
  findContainingSystem,
  findDetails,
  findObject,
  isVisibleToPlayer,
  objectKindLabel,
  resolveTravelDestination,
} from './domain/sector/selectors';
import { createPrototypeApplication } from './application/prototypeApplication';

function isVisible(id: string, sector: Sector, preview: Preview) {
  return preview === 'gm' || isVisibleToPlayer(sector, id);
}

function details(id: string, sector: Sector) {
  return findDetails(sector, id);
}

function displayName(info: DetailsAndVisibility | undefined, preview: Preview): string | undefined {
  if (!info) return undefined;
  return preview === 'player' &&
    visibilityRank(info.VisibilityLevel) < visibilityRank(VisibilityLevel.CULTURE_PARTIAL)
    ? info.ProceduralName
    : info.NiceName;
}

function EditableText({
  value,
  multiline = false,
  className = '',
  onChange,
}: {
  value: string;
  multiline?: boolean;
  className?: string;
  onChange: (value: string) => void;
}) {
  return multiline ? (
    <textarea className={className} value={value} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input className={className} value={value} onChange={(e) => onChange(e.target.value)} />
  );
}

function objectKind(sector: Sector, id: string | null): string {
  return objectKindLabel(sector, id);
}

export default function App() {
  const [application] = useState(createPrototypeApplication);
  const [state, dispatch] = useReducer(appReducer, undefined, () =>
    createAppState(application.listSectors()),
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
  const sector = sectors[activeIndex];
  const currentSystem = sector.Systems.find((s) => s.Id === currentSystemId) ?? null;
  useEffect(() => {
    if (preview === 'player' && selected && !isVisible(selected, sector, preview))
      dispatch({ type: 'selectObject', id: null });
  }, [preview, selected, sector]);
  const mutate = (next: Sector) => dispatch({ type: 'updateSector', sector: next });
  const setSelected = (id: string | null) => dispatch({ type: 'selectObject', id });
  const setLocked = (next: boolean) => {
    if (next) dispatch({ type: 'discardEditing' });
  };
  const updateDraft = (update: (draft: EditDraft) => EditDraft) =>
    dispatch({
      type: 'updateDraft',
      draft: update(editDraft ?? { sectorName: sector.SectorName, details: {} }),
    });
  const discardEdit = () => dispatch({ type: 'discardEditing' });
  const beginEdit = () =>
    dispatch({ type: 'beginEditing', draft: { sectorName: sector.SectorName, details: {} } });
  const saveEdit = () => {
    if (!editDraft) return;
    const saved = application.saveSector(activeIndex, applySectorEdits(sector, editDraft));
    if (saved) dispatch({ type: 'saveEditing', sectors: saved });
  };
  const selectRoute = (id: string, contextSystemId: string) =>
    dispatch({ type: 'selectRoute', id, contextSystemId });
  const go = (v: View) => dispatch({ type: 'changeView', view: v });
  const setPreviewMode = (next: Preview) => dispatch({ type: 'changePreview', preview: next });
  const canMove = useMemo(() => {
    const k = objectKind(sector, selected);
    const targetIsMovable =
      view === 'hex'
        ? k === 'SYSTEM'
        : view === 'system' || view === 'all'
          ? ['SYSTEM', 'WORLD', 'MOON'].includes(k)
          : false;
    return !locked && targetIsMovable;
  }, [locked, sector, selected, view]);
  const selectedSystem = useMemo(() => {
    if (!selected) return null;
    const kind = objectKind(sector, selected);
    if (kind === 'SYSTEM') return sector.Systems.find((system) => system.Id === selected) ?? null;
    if (kind === 'PLAYER SHIP')
      return (
        sector.Systems.find((system) => system.Id === sector.PlayerShip.CurrentSystemId) ?? null
      );
    if (kind === 'ROUTE') return null;
    return findContainingSystem(sector, selected) ?? null;
  }, [sector, selected]);
  const travelDestination = useMemo(() => {
    const kind = objectKind(sector, selected);
    if (kind === 'SYSTEM' && view === 'system' && selectedSystem?.Id !== currentSystem?.Id)
      return selectedSystem;
    if (kind !== 'ROUTE' || (view !== 'system' && view !== 'all') || !selected) return null;
    const contextSystemId = view === 'system' ? currentSystem?.Id : routeContextSystemId;
    return contextSystemId
      ? (resolveTravelDestination(sector, selected, contextSystemId) ?? null)
      : null;
  }, [currentSystem, routeContextSystemId, sector, selected, selectedSystem, view]);
  const canTravel = Boolean(travelDestination);
  const travelToSelectedSystem = () => {
    if (!travelDestination) return;
    discardEdit();
    if (view === 'system')
      dispatch({ type: 'openSystem', systemId: travelDestination.Id, mode: systemMode });
    else dispatch({ type: 'selectObject', id: travelDestination.Id });
    if (view === 'all')
      requestAnimationFrame(() =>
        document
          .getElementById(`symbolic-system-${travelDestination.Id}`)
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
      const system =
        selectedSystem ??
        (currentSystemId
          ? (sector.Systems.find((candidate) => candidate.Id === currentSystemId) ?? null)
          : null);
      if (!system) return;
      dispatch({
        type: 'openSystem',
        systemId: system.Id,
        mode: nextMode.endsWith('symbolic') ? 'symbolic' : 'topdown',
      });
      return;
    }
    // Returning to the sector preserves ships, systems, and routes. A star, world,
    // moon, or POI is represented by its containing system at sector scope.
    if (view === 'system' && selected) {
      const kind = objectKind(sector, selected);
      if (!['PLAYER SHIP', 'SYSTEM', 'ROUTE'].includes(kind))
        dispatch({ type: 'selectObject', id: findContainingSystem(sector, selected)?.Id ?? null });
    }
    dispatch({ type: 'returnToSector', view: nextMode.endsWith('symbolic') ? 'all' : 'hex' });
  };
  const stageName =
    view === 'system' && currentSystem ? (
      (displayName(details(currentSystem.Id, sector), preview) ?? currentSystem.Id)
    ) : preview === 'gm' && !locked ? (
      <EditableText
        className="stage-name-editor"
        value={editDraft?.sectorName ?? sector.SectorName}
        onChange={(value) => updateDraft((old) => ({ ...old, sectorName: value }))}
      />
    ) : (
      sector.SectorName
    );
  return (
    <div className={`app ${preview === 'player' ? 'player-mode' : ''}`}>
      <AppChrome view={view} preview={preview} setPreview={setPreviewMode} go={go} />
      {view === 'sectors' ? (
        <main className="workspace no-inspector">
          <SectorArchive
            sectors={sectors}
            selectedIndex={archiveIndex}
            setSelectedIndex={(index) => dispatch({ type: 'setArchiveIndex', index })}
            load={() => {
              if (application.loadSector(archiveIndex))
                dispatch({ type: 'loadSector', index: archiveIndex });
            }}
            generate={(seed) => {
              application.generateSector(seed);
              dispatch({
                type: 'replaceSectors',
                sectors: application.listSectors(),
                archiveIndex: sectors.length,
              });
            }}
            rename={(name) => {
              const next = application.renameSector(archiveIndex, name);
              if (next) dispatch({ type: 'replaceSectors', sectors: next });
            }}
            remove={() => {
              const result = application.deleteSector(archiveIndex);
              if (result.ok)
                dispatch({
                  type: 'replaceSectors',
                  sectors: result.sectors,
                  archiveIndex: result.nextIndex,
                  activeIndex: activeIndex === archiveIndex ? result.nextIndex : activeIndex,
                });
            }}
          />
        </main>
      ) : (
        <>
          <main className="workspace">
            <section className="stage">
              <StageNav
                name={stageName}
                mode={stageMode}
                singleReady={Boolean(selectedSystem || currentSystem)}
                shipSelected={selected === sector.PlayerShip.Id}
                travelReady={canTravel}
                onMode={switchStageMode}
                onSelectShip={() => setSelected(sector.PlayerShip.Id)}
                onTravel={travelToSelectedSystem}
              />
              {view === 'hex' && (
                <FeatureHexMap
                  sector={sector}
                  selected={selected}
                  select={setSelected}
                  preview={preview}
                />
              )}
              {view === 'system' && currentSystem && (
                <SystemViewer
                  system={currentSystem}
                  sector={sector}
                  preview={preview}
                  visible={isVisible(currentSystem.Id, sector, preview)}
                  mode={systemMode}
                  symbolic={
                    <FeatureSymbolicSystem
                      system={currentSystem}
                      sector={sector}
                      selected={selected}
                      select={setSelected}
                      selectRoute={selectRoute}
                      preview={preview}
                      defaultOpen
                      showHeader={false}
                    />
                  }
                  topdown={
                    <FeatureTopDown
                      system={currentSystem}
                      sector={sector}
                      selected={selected}
                      select={setSelected}
                      preview={preview}
                    />
                  }
                />
              )}
              {view === 'all' && (
                <div className="all-systems">
                  {sector.Systems.filter((s) => isVisible(s.Id, sector, preview)).map((s) => (
                    <FeatureSymbolicSystem
                      key={s.Id}
                      system={s}
                      sector={sector}
                      selected={selected}
                      select={setSelected}
                      selectRoute={selectRoute}
                      preview={preview}
                      defaultOpen={false}
                    />
                  ))}
                </div>
              )}
            </section>
            <FeatureDetailBar
              sector={sector}
              selectedId={selected}
              preview={preview}
              locked={locked}
              draft={editDraft}
              setDraft={updateDraft}
            />
          </main>
          {preview === 'gm' && isGmSession ? (
            <FeatureGMEditBar
              locked={locked}
              setLocked={setLocked}
              canMove={canMove}
              selected={selected}
              sector={sector}
              mutate={(next) => {
                mutate(next);
                if (selected && !findObject(next, selected)) setSelected(null);
              }}
              view={view}
              draft={editDraft}
              beginEdit={beginEdit}
              saveEdit={saveEdit}
            />
          ) : (
            <footer className="edit-bar player-edit-bar" aria-hidden="true" />
          )}
        </>
      )}
    </div>
  );
}
