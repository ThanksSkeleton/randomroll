import { VisibilityLevel, visibilityRank } from '../../domain/sector/visibility';
import { TECH_LEVEL } from '../../../tables';
import type { Planet, SelectableEntity, Sector } from '../../../merged_schema';
import {
  findDetails,
  findObject,
  objectKindLabel,
  routeSystems,
  type FoundObject,
} from '../../domain/sector/selectors';
import type { EditDraft, Preview, EditableDetailField } from '../../application/appState';
import { formatAu } from '../../formatters';
import { starPresentationClass, starPresentationStyle } from '../../../star_presentation';
import { displayBulkComposition } from '../../../planet_presentation';
import { resolvePlanetPortrait } from '../../../planet_portraits';
import { StarGlyph } from '../system-viewer/StarGlyph';

function displayName(info: SelectableEntity | undefined, preview: Preview) {
  if (!info) return undefined;
  return preview === 'player' &&
    visibilityRank(info.VisibilityLevel) < visibilityRank(VisibilityLevel.CULTURE_PARTIAL)
    ? info.ProceduralName
    : info.NiceName;
}
function showProceduralName(info: SelectableEntity, preview: Preview) {
  return (
    preview === 'gm' ||
    visibilityRank(info.VisibilityLevel) >= visibilityRank(VisibilityLevel.CULTURE_PARTIAL)
  );
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
      deep: `Signals Detected: ${signalsDetected}`,
      gm: '-',
    };
  }
  const inhabited = planet.InhabitedInfo;
  return {
    basic,
    deep: `Life, Native: ${planet.NativeBiosphere}\nLife, Terran: ${inhabited.TerranBiosphere}\nPopulation: ${inhabited.Population}\nTech Level: ${TECH_LEVEL[inhabited.TechLevel]} - ${inhabited.TechLevel}`,
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
      deep: `Signals Detected: ${associatedPoiCount(sector, found.containingSystem?.Id, found.object.Id)}`,
      gm: '-',
    };
  }
  if (found.kind === 'System') {
    return {
      basic: `${found.object.Star.StarType} Type`,
      deep: '-',
      gm: '-',
    };
  }
  if (found.kind === 'Route') {
    const systems = routeSystems(sector, found.object);
    return {
      basic: systems
        ? `${systems[0].NiceName} <=> ${systems[1].NiceName}\nSpike Length: ${hexDistance(systems[0].HexLocation, systems[1].HexLocation)}`
        : '-',
      deep: '-',
      gm: '-',
    };
  }
  if (found.kind === 'PointOfInterest') {
    return {
      basic: found.object.POIType,
      deep: '-',
      gm: found.object.Intelligence.GM || '-',
    };
  }
  return { basic: '-', deep: '-', gm: '-' };
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
  const portrait =
    found?.kind === 'Planet' &&
    (preview === 'gm' || visibilityRank(found.object.VisibilityLevel) >= 1) &&
    found.object.PortraitAssetId
      ? resolvePlanetPortrait(found.object.PortraitAssetId)
      : undefined;
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
                className="portrait-image"
                src={import.meta.env.BASE_URL + portrait.sourcePath}
                style={portrait.css}
                alt={`Portrait of ${displayName(info, preview) ?? info.ProceduralName}, uninhabited planet`}
                onError={(event) => {
                  event.currentTarget.hidden = true;
                  event.currentTarget.nextElementSibling?.setAttribute('aria-hidden', 'false');
                }}
              />
            )}
            <div
              className="object-art-glyph"
              aria-hidden={!!portrait}
              role={portrait ? 'img' : undefined}
              aria-label={portrait ? 'Planet portrait unavailable' : undefined}
            >
              {kind === 'STAR' && found.kind === 'Star' ? (
                <div
                  className={`detail-star-glyph ${starPresentationClass(found.object.StarType)}`}
                  style={starPresentationStyle(found.object.StarType)}
                  aria-hidden="true"
                >
                  <StarGlyph starType={found.object.StarType} />
                </div>
              ) : kind === 'PLAYER SHIP' ? (
                '▰'
              ) : kind === 'ROUTE' ? (
                '╱'
              ) : kind.includes('POINT') ? (
                '◆'
              ) : (
                '●'
              )}
            </div>
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
  const edit = (field: EditableDetailField) => (value: string) =>
    setDraft((old) => ({
      ...old,
      details: { ...old.details, [info.Id]: { ...old.details[info.Id], [field]: value } },
    }));
  const stock = stockSignals(found, sector, preview);
  if (preview === 'player' && info.VisibilityLevel === VisibilityLevel.NONE)
    return (
      <section className="detail-section warning">
        <h3 className="detail-section-title restricted-title">RESTRICTED</h3>
        <p className="detail-section-description">
          This object is not available in the player view.
        </p>
      </section>
    );
  return (
    <div className="details-stack">
      {(preview === 'gm' || visibilityRank(info.VisibilityLevel) >= 1) && (
        <section className="detail-section basic-signal">
          <h3>BasicSignal</h3>
          <StockField content={stock.basic} />
          <div className="detail-small-divider" aria-hidden="true" />
          {preview === 'gm' && !locked ? (
            <EditableText
              className="detail-editable"
              multiline
              value={draftValue(draft, info, 'BasicScan')}
              onChange={edit('BasicScan')}
            />
          ) : (
            <p className="detail-section-description">
              <ContentText content={info.Intelligence.BasicScan} />
            </p>
          )}
        </section>
      )}
      {(preview === 'gm' || visibilityRank(info.VisibilityLevel) >= 3) && (
        <section className="detail-section deep-scan">
          <h3>DeepScan</h3>
          <StockField content={stock.deep} />
          <div className="detail-small-divider" aria-hidden="true" />
          {preview === 'gm' && !locked ? (
            <EditableText
              className="detail-editable"
              multiline
              value={draftValue(draft, info, 'CultureFull')}
              onChange={edit('CultureFull')}
            />
          ) : (
            <p className="detail-section-description">
              <ContentText content={info.Intelligence.CultureFull} />
            </p>
          )}
        </section>
      )}
      {preview === 'gm' && (
        <section className="detail-section gm-note">
          <h3>GMNote</h3>
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
