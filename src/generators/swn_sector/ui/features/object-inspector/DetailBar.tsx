import { VisibilityLevel, visibilityRank } from '../../domain/sector/visibility';
import type { SelectableEntity, Sector } from '../../../merged_schema';
import { findDetails, findObject, objectKindLabel } from '../../domain/sector/selectors';
import type { EditDraft, Preview, EditableDetailField } from '../../application/appState';

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
function draftValue(
  draft: EditDraft | null,
  info: SelectableEntity,
  field: EditableDetailField,
) {
  return (
    draft?.details[info.Id]?.[field] ?? (field === 'NiceName' ? info.NiceName : info.Intelligence[field])
  );
}
function ContentText({ content }: { content: string }) {
  return <>{content}</>;
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
            <div>
              {kind === 'STAR'
                ? '✦'
                : kind === 'PLAYER SHIP'
                  ? '▰'
                  : kind === 'ROUTE'
                    ? '╱'
                    : kind.includes('POINT')
                      ? '◆'
                      : '●'}
            </div>
          </div>
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
            <h1 className={`object-name object-name-${kind.toLowerCase().replaceAll(' ', '-')}`}>
              {displayName(info, preview)}
            </h1>
          )}
          {showProceduralName(info, preview) && (
            <p
              className={`object-procedural-name object-procedural-name-${kind.toLowerCase().replaceAll(' ', '-')}`}
            >
              {info.ProceduralName}
            </p>
          )}
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
  info: SelectableEntity;
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
      {(preview === 'gm' || visibilityRank(info.VisibilityLevel) >= 2) && (
        <section className="detail-section culture-partial">
          {preview === 'gm' && !locked ? (
            <EditableText
              className="detail-editable"
              multiline
              value={draftValue(draft, info, 'CulturePartial')}
              onChange={edit('CulturePartial')}
            />
          ) : (
            <p className="detail-section-description">
              <ContentText content={info.Intelligence.CulturePartial} />
            </p>
          )}
        </section>
      )}
      {(preview === 'gm' || visibilityRank(info.VisibilityLevel) >= 3) && (
        <section className="detail-section deep-scan">
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
      {preview === 'gm' && (
        <section className="visibility-readout">
          <span className="visibility-label">PLAYER VISIBILITY</span>
          <strong className="visibility-value">{info.VisibilityLevel}</strong>
        </section>
      )}
    </div>
  );
}
