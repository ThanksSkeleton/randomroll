import { TECH_LEVEL } from '../../../tables';
import type { Planet, SelectableEntity, Sector } from '../../../merged_schema';
import {
  findDetails,
  findObject,
  objectKindLabel,
  routeSystems,
  systemPoliticalClaimIds,
  type FoundObject,
} from '../../domain/sector/selectors';
import type { EditDraft, Preview, EditableDetailField } from '../../application/appState';
import { formatAu } from '../../formatters';
import { displayBulkComposition } from '../../../planet_presentation';
import { resolvePortrait } from '../../../portrait_assets';
import { useState } from 'react';
import { PolityFlagList } from '../politics/PolityFlag';

function displayName(info: SelectableEntity | undefined, preview: Preview) {
  if (!info) return undefined;
  return preview === 'player' && !info.Visibility.PoliticsScan
    ? info.ProceduralName
    : info.NiceName;
}
function showProceduralName(info: SelectableEntity, preview: Preview) {
  return preview === 'gm' || info.Visibility.PoliticsScan;
}
function draftValue(draft: EditDraft | null, info: SelectableEntity, field: EditableDetailField) {
  return (
    draft?.details[info.Id]?.[field] ??
    (field === 'NiceName' ? info.NiceName : info.Intelligence[field])
  );
}
function ContentText({ content }: { content: string }) {
  return <>{content}</>;
}

type StockSignals = {
  basic: string;
  detailed: string;
  politics: string;
  deep: string;
  gm: string;
};

function hexDistance(
  first: { Column: number; Row: number },
  second: { Column: number; Row: number },
) {
  const firstQ = first.Column - 1;
  const secondQ = second.Column - 1;
  const firstR = first.Row - 1 - Math.floor(firstQ / 2);
  const secondR = second.Row - 1 - Math.floor(secondQ / 2);
  const firstX = firstQ;
  const firstZ = firstR;
  const firstY = -firstX - firstZ;
  const secondX = secondQ;
  const secondZ = secondR;
  const secondY = -secondX - secondZ;
  return Math.max(
    Math.abs(firstX - secondX),
    Math.abs(firstY - secondY),
    Math.abs(firstZ - secondZ),
  );
}

function associatedPoiCount(sector: Sector, systemId: string | undefined, objectId: string) {
  return (
    sector.Systems.find((system) => system.Id === systemId)?.PointsOfInterest.filter(
      (poi) => poi.ParentObjectId === objectId,
    ).length ?? 0
  );
}

function objectTypeLabel(objectType: string) {
  return objectType.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function polityClaims(sector: Sector, polityIds: readonly string[]) {
  const names = polityIds
    .map((id) => sector.Polities.find((polity) => polity.Id === id)?.NiceName)
    .filter((name): name is string => name !== undefined);
  return `ClaimedBy: ${names.length === 0 ? 'None' : names.join(', ')}`;
}

function politicalClaimIds(found: FoundObject, sector: Sector): string[] | undefined {
  if (found.kind === 'Planet' || found.kind === 'OtherCelestialObject')
    return found.object.ClaimedByPolityIds;
  if (found.kind !== 'System') return undefined;
  return systemPoliticalClaimIds(found.object, sector);
}

function planetStock(
  planet: Planet,
  sector: Sector,
  systemId: string | undefined,
  preview: Preview,
): StockSignals {
  const host = planet.Orbit.ParentObjectId
    ? sector.Systems.find((system) => system.Id === systemId)?.Objects.find(
        (object): object is Planet =>
          object.Kind === 'Planet' && object.Id === planet.Orbit.ParentObjectId,
      )
    : undefined;
  const hostName = host
    ? (displayName(findDetails(sector, host.Id), preview) ?? host.ProceduralName)
    : undefined;
  const moonFact = hostName ? `\nMoon of ${hostName}` : '';
  const basic = `${formatAu(planet.Orbit.AU)} AU - ${planet.Temperature} - ${planet.Size}-Class${moonFact}\nAtmosphere: ${planet.Atmosphere} Composition: ${displayBulkComposition(planet.BulkComposition, planet.Temperature)}`;
  const signalsDetected = associatedPoiCount(sector, systemId, planet.Id);
  if (planet.InhabitedInfo === false) {
    return {
      basic,
      detailed: `Signals Detected: ${signalsDetected}`,
      politics: polityClaims(sector, planet.ClaimedByPolityIds),
      deep: '-',
      gm: '-',
    };
  }
  const inhabited = planet.InhabitedInfo;
  return {
    basic,
    detailed: `Life, Native: ${planet.NativeBiosphere}\nLife, Terran: ${inhabited.TerranBiosphere}\nPopulation: ${inhabited.Population}`,
    politics: `Tech Level: ${TECH_LEVEL[inhabited.TechLevel]} - ${inhabited.TechLevel}\n${polityClaims(sector, planet.ClaimedByPolityIds)}`,
    deep: '-',
    gm: inhabited.WorldTags.join(', '),
  };
}

function stockSignals(found: FoundObject, sector: Sector, preview: Preview): StockSignals {
  if (found.kind === 'Planet') {
    return planetStock(found.object, sector, found.containingSystem?.Id, preview);
  }
  if (found.kind === 'OtherCelestialObject') {
    return {
      basic: `${formatAu(found.object.Orbit.AU)} AU - ${objectTypeLabel(found.object.ObjectType)}`,
      detailed: `Signals Detected: ${associatedPoiCount(sector, found.containingSystem?.Id, found.object.Id)}`,
      politics: polityClaims(sector, found.object.ClaimedByPolityIds),
      deep: '-',
      gm: '-',
    };
  }
  if (found.kind === 'System') {
    const claimIds = politicalClaimIds(found, sector) ?? [];
    return {
      basic: `${found.object.Star.StarType} Type`,
      detailed: '-',
      politics: polityClaims(sector, claimIds),
      deep: '-',
      gm: '-',
    };
  }
  if (found.kind === 'Route') {
    const systems = routeSystems(sector, found.object);
    const showNiceNames = preview === 'gm' || found.object.Visibility.PoliticsScan;
    const routeSystemName = (system: NonNullable<typeof systems>[number]) =>
      showNiceNames ? system.NiceName : system.ProceduralName;
    return {
      basic: systems
        ? `${routeSystemName(systems[0])} <=> ${routeSystemName(systems[1])}\nSpike Length: ${hexDistance(systems[0].HexLocation, systems[1].HexLocation)}`
        : '-',
      detailed: '-',
      politics: '-',
      deep: '-',
      gm: '-',
    };
  }
  if (found.kind === 'PointOfInterest') {
    return {
      basic: found.object.POIType,
      detailed: '-',
      politics: '-',
      deep: '-',
      gm: found.object.Intelligence.GM || '-',
    };
  }
  return { basic: '-', detailed: '-', politics: '-', deep: '-', gm: '-' };
}

function StockField({ content }: { content: string }) {
  return (
    <div className="stock-field">
      <p className="detail-section-description detail-stock-content">{content}</p>
    </div>
  );
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

export function DetailBar({
  sector,
  selectedId,
  preview,
  locked,
  draft,
  setDraft,
}: {
  sector: Sector;
  selectedId: string | null;
  preview: Preview;
  locked: boolean;
  draft: EditDraft | null;
  setDraft: (update: (draft: EditDraft) => EditDraft) => void;
}) {
  const info = selectedId ? findDetails(sector, selectedId) : undefined;
  const found = selectedId ? findObject(sector, selectedId) : undefined;
  const kind = objectKindLabel(sector, selectedId);
  const portraitId =
    found?.kind === 'RoutePortal'
      ? sector.Routes.find((route) => route.Id === found.object.RouteId)?.PortraitAssetId
      : found?.kind === 'System'
        ? found.object.Star.PortraitAssetId
        : found?.object.PortraitAssetId;
  const portrait =
    found && (preview === 'gm' || found.object.Visibility.BasicScan) && portraitId
      ? resolvePortrait(portraitId)
      : undefined;
  const portraitName = displayName(info, preview) ?? info?.ProceduralName ?? 'object';
  const showNoData =
    found?.kind === 'PlayerShip' ||
    (found?.kind === 'Planet' &&
      found.object.InhabitedInfo !== false &&
      (preview === 'gm' || found.object.Visibility.BasicScan));
  const portraitDescription =
    found?.kind === 'System'
      ? `${found.object.Star.StarType} star`
      : found?.kind === 'Planet'
        ? 'uninhabited planet'
        : found?.kind === 'PointOfInterest'
          ? `${found.object.POIType} point of interest`
          : found?.kind === 'OtherCelestialObject'
            ? objectTypeLabel(found.object.ObjectType)
            : (found?.kind ?? 'object');
  return (
    <aside className="detail-bar">
      {!info || !found ? (
        <div className="empty-state">
          <div className="reticle">+</div>
          <h2 className="empty-state-title">NO TARGET</h2>
        </div>
      ) : (
        <>
          <div className={`object-art art-${kind.toLowerCase().replaceAll(' ', '-')}`}>
            {portrait && (
              <img
                key={portraitId}
                className="portrait-image"
                src={import.meta.env.BASE_URL + portrait.sourcePath}
                style={portrait.css}
                alt={`Portrait of ${portraitName}, ${portraitDescription}`}
                onError={(event) => {
                  event.currentTarget.hidden = true;
                  event.currentTarget.nextElementSibling?.setAttribute('aria-hidden', 'false');
                }}
              />
            )}
            {showNoData && <div className="portrait-no-data">NO DATA</div>}
          </div>
          <h1
            className={`object-name object-name-${kind.toLowerCase().replaceAll(' ', '-')}`}
            aria-label={displayName(info, preview)}
          >
            {preview === 'gm' && !locked ? (
              <EditableText
                className="object-name-editor"
                value={draftValue(draft, info, 'NiceName')}
                onChange={(value) =>
                  setDraft((old) => ({
                    ...old,
                    details: {
                      ...old.details,
                      [info.Id]: { ...old.details[info.Id], NiceName: value },
                    },
                  }))
                }
              />
            ) : (
              displayName(info, preview)
            )}
            {showProceduralName(info, preview) && (
              <span
                className={`object-procedural-name object-procedural-name-${kind.toLowerCase().replaceAll(' ', '-')}`}
              >
                {' - '}
                {info.ProceduralName}
              </span>
            )}
          </h1>
          <DetailBox
            info={info}
            found={found}
            sector={sector}
            preview={preview}
            locked={locked}
            draft={draft}
            setDraft={setDraft}
          />
        </>
      )}
    </aside>
  );
}

function DetailBox({
  info,
  found,
  sector,
  preview,
  locked,
  draft,
  setDraft,
}: {
  info: SelectableEntity;
  found: FoundObject;
  sector: Sector;
  preview: Preview;
  locked: boolean;
  draft: EditDraft | null;
  setDraft: (update: (draft: EditDraft) => EditDraft) => void;
}) {
  const [activeTab, setActiveTab] = useState<'player' | 'gm'>('player');
  const claimIds = politicalClaimIds(found, sector);
  const edit = (field: EditableDetailField) => (value: string) =>
    setDraft((old) => ({
      ...old,
      details: { ...old.details, [info.Id]: { ...old.details[info.Id], [field]: value } },
    }));
  const stock = stockSignals(found, sector, preview);
  if (preview === 'player' && !info.Visibility.BasicScan)
    return (
      <section className="detail-section warning">
        <h3 className="detail-section-title restricted-title">RESTRICTED</h3>
        <p className="detail-section-description">
          This object is not available in the player view.
        </p>
      </section>
    );
  return (
    <div className="detail-pane-tabs">
      <div className="detail-tab-list" role="tablist" aria-label="Object information">
        <button
          className={`detail-tab${activeTab === 'player' ? ' active' : ''}`}
          id="detail-tab-player"
          type="button"
          role="tab"
          aria-selected={activeTab === 'player' || preview !== 'gm'}
          aria-controls="detail-panel-player"
          onClick={() => setActiveTab('player')}
        >
          SCAN INFO
        </button>
        {preview === 'gm' ? (
          <button
            className={`detail-tab${activeTab === 'gm' ? ' active' : ''}`}
            id="detail-tab-gm"
            type="button"
            role="tab"
            aria-selected={activeTab === 'gm'}
            aria-controls="detail-panel-gm"
            onClick={() => setActiveTab('gm')}
          >
            GM INFO
          </button>
        ) : (
          <span className="detail-tab detail-tab-placeholder" aria-hidden="true" />
        )}
      </div>
      {activeTab === 'player' || preview !== 'gm' ? (
        <div
          className="details-stack"
          id="detail-panel-player"
          role="tabpanel"
          aria-labelledby="detail-tab-player"
        >
          {(
            [
              ['BasicScan', 'Basic Scan'],
              ['DetailedScan', 'Detailed Scan'],
              ['PoliticsScan', 'Politics Scan'],
              ['DeepPoliticsScan', 'Deep Politics Scan'],
            ] as const
          ).map(([field, title]) =>
            preview === 'gm' || info.Visibility[field] ? (
              <section className={`detail-section scan-${field.toLowerCase()}`} key={field}>
                <h3>{title}</h3>
                {field === 'BasicScan' && <StockField content={stock.basic} />}
                {field === 'DetailedScan' && <StockField content={stock.detailed} />}
                {field === 'PoliticsScan' && (
                  <>
                    <StockField content={stock.politics} />
                    {claimIds !== undefined && (
                      <PolityFlagList
                        sector={sector}
                        polityIds={claimIds}
                        className="politics-scan-flags"
                      />
                    )}
                  </>
                )}
                {field === 'DeepPoliticsScan' && <StockField content={stock.deep} />}
                {(field === 'DetailedScan' || field === 'DeepPoliticsScan') && (
                  <div className="detail-small-divider" aria-hidden="true" />
                )}
                {(field === 'DetailedScan' || field === 'DeepPoliticsScan') &&
                preview === 'gm' &&
                !locked ? (
                  <EditableText
                    className="detail-editable"
                    multiline
                    value={draftValue(draft, info, field)}
                    onChange={edit(field)}
                  />
                ) : field === 'DetailedScan' || field === 'DeepPoliticsScan' ? (
                  <p className="detail-section-description">
                    <ContentText content={info.Intelligence[field]} />
                  </p>
                ) : null}
              </section>
            ) : null,
          )}
        </div>
      ) : (
        <section
          className="detail-section gm-note"
          id="detail-panel-gm"
          role="tabpanel"
          aria-labelledby="detail-tab-gm"
        >
          <h3>GM Information</h3>
          {found.kind !== 'PointOfInterest' && (
            <>
              <StockField content={stock.gm} />
              <div className="detail-small-divider" aria-hidden="true" />
            </>
          )}
          {!locked ? (
            <EditableText
              className="detail-editable"
              multiline
              value={draftValue(draft, info, 'GM')}
              onChange={edit('GM')}
            />
          ) : (
            <p className="detail-section-description">
              <ContentText content={info.Intelligence.GM} />
            </p>
          )}
        </section>
      )}
    </div>
  );
}
