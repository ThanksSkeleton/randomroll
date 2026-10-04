import type {
  BasicScanContent,
  DisplaySectorDTO,
  DisplaySelectableDTO,
} from '../../../DisplayDTO/dto';
import type { EditDraft, Preview, EditableDetailField } from '../../application/appState';
import { useState } from 'react';
import { PolityFlagList } from '../politics/PolityFlag';

function displayName(info: DisplaySelectableDTO | undefined, preview: Preview) {
  if (!info) return undefined;
  return preview === 'player' && !info.visibility.PoliticsScan
    ? info.proceduralName
    : info.niceName;
}
function showProceduralName(info: DisplaySelectableDTO, preview: Preview) {
  return preview === 'gm' || info.visibility.PoliticsScan;
}
function draftValue(
  draft: EditDraft | null,
  info: DisplaySelectableDTO,
  field: EditableDetailField,
) {
  return (
    draft?.details[info.id]?.[field] ??
    (field === 'NiceName' ? info.niceName : info.intelligence[field])
  );
}
function ContentText({ content }: { content: string }) {
  return <>{content}</>;
}

function StockField({ content }: { content: string }) {
  return (
    <div className="stock-field">
      <p className="detail-section-description detail-stock-content">{content}</p>
    </div>
  );
}

function BasicScanField({ content, entityId }: { content: BasicScanContent; entityId: string }) {
  return (
    <div className="basic-scan-elements">
      {content.entries.map((entry, index) =>
        entry.type === 'simple' ? (
          <div className="basic-scan-element basic-scan-simple" key={`${entityId}:simple:${index}`}>
            {entry.text}
          </div>
        ) : (
          <details
            className="basic-scan-element basic-scan-drawer"
            key={`${entityId}:complex:${index}`}
          >
            <summary>{entry.summary}</summary>
            <div className="basic-scan-drawer-content">
              {entry.lines.map((line, lineIndex) => (
                <div key={lineIndex}>{line}</div>
              ))}
            </div>
          </details>
        ),
      )}
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
  display,
  selectedId,
  preview,
  locked,
  draft,
  setDraft,
}: {
  display: DisplaySectorDTO;
  selectedId: string | null;
  preview: Preview;
  locked: boolean;
  draft: EditDraft | null;
  setDraft: (update: (draft: EditDraft) => EditDraft) => void;
}) {
  const info = selectedId ? display.entities[selectedId] : undefined;
  const kind = info?.kindLabel ?? '';
  const portrait = info?.portrait;
  const portraitName = displayName(info, preview) ?? info?.proceduralName ?? 'object';
  const showNoData =
    info?.kind === 'PlayerShip' ||
    (info?.kind === 'HabitablePointOfInterest' &&
      (preview === 'gm' || info.visibility.BasicScan)) ||
    (info?.kind === 'Planet' && info.inhabited && (preview === 'gm' || info.visibility.BasicScan));
  const portraitDescription = info?.portraitDescription ?? 'object';
  return (
    <aside className="detail-bar">
      {!info ? (
        <div className="empty-state">
          <div className="reticle">+</div>
          <h2 className="empty-state-title">NO TARGET</h2>
        </div>
      ) : (
        <>
          <div className={`object-art art-${kind.toLowerCase().replaceAll(' ', '-')}`}>
            {portrait && (
              <img
                key={portrait.variantId}
                className="portrait-image"
                src={portrait.url}
                style={portrait.style}
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
                      [info.id]: { ...old.details[info.id], NiceName: value },
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
                {info.proceduralName}
              </span>
            )}
          </h1>
          <DetailBox
            info={info}
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
  preview,
  locked,
  draft,
  setDraft,
}: {
  info: DisplaySelectableDTO;
  preview: Preview;
  locked: boolean;
  draft: EditDraft | null;
  setDraft: (update: (draft: EditDraft) => EditDraft) => void;
}) {
  const [activeTab, setActiveTab] = useState<'player' | 'gm'>('player');
  const claimants = info.inspectorClaimants;
  const edit = (field: EditableDetailField) => (value: string) =>
    setDraft((old) => ({
      ...old,
      details: { ...old.details, [info.id]: { ...old.details[info.id], [field]: value } },
    }));
  const stock = info.inspectorStock;
  if (preview === 'player' && !info.visibility.BasicScan)
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
            preview === 'gm' || info.visibility[field] ? (
              <section className={`detail-section scan-${field.toLowerCase()}`} key={field}>
                <h3>{title}</h3>
                {field === 'BasicScan' && (
                  <BasicScanField
                    content={
                      info.inspectorBasicScan ?? {
                        entries: stock.basic
                          .split('\n')
                          .map((text) => ({ type: 'simple' as const, text })),
                      }
                    }
                    entityId={info.id}
                  />
                )}
                {field === 'DetailedScan' && <StockField content={stock.detailed} />}
                {field === 'PoliticsScan' && (
                  <>
                    <StockField content={stock.politics} />
                    {claimants !== undefined && (
                      <PolityFlagList polities={claimants} className="politics-scan-flags" />
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
                    <ContentText content={info.intelligence[field]} />
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
          {info.kind !== 'PointOfInterest' && (
            <>
              <StockField content={stock.gm} />
              <div className="detail-small-divider" aria-hidden="true" />
            </>
          )}
          {info.kind === 'Planet' && info.inhabited && info.selectedCulture && (
            <pre className="detail-section-description">
              {JSON.stringify(info.selectedCulture, null, 2)}
            </pre>
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
              <ContentText content={info.intelligence.GM} />
            </p>
          )}
        </section>
      )}
    </div>
  );
}
