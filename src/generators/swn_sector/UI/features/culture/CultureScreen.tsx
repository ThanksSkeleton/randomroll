import type { ReactNode } from 'react';
import type {
  CultureScreenDisplayDTO,
  CultureWorldDisplayDTO,
  HabitablePoiDisplayDTO,
  PolityDisplayDTO,
} from '../../../DisplayDTO/dto';
import { PolityFlag } from '../politics/PolityFlag';

function label(key: string) {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
}

function DataTree({ value }: { value: unknown }): ReactNode {
  if (value === null || value === undefined) return <span>—</span>;
  if (Array.isArray(value))
    return (
      <div className="culture-nested">
        {value.map((entry, index) => (
          <DataTree key={index} value={entry} />
        ))}
      </div>
    );
  if (typeof value === 'object')
    return (
      <dl className="culture-data">
        {Object.entries(value).map(([key, entry]) => (
          <div key={key}>
            <dt>{label(key)}</dt>
            <dd>
              <DataTree value={entry} />
            </dd>
          </div>
        ))}
      </dl>
    );
  return <span>{String(value)}</span>;
}

function PolityName({ polity }: { polity: PolityDisplayDTO | null }) {
  return (
    <span className="culture-polity-name">
      {polity?.NiceName ?? 'None'} {polity && <PolityFlag polity={polity} />}
    </span>
  );
}

function HpoiEntry({ hpoi }: { hpoi: HabitablePoiDisplayDTO }) {
  return (
    <section className="culture-hpoi">
      <h4>
        {hpoi.typeLabel}
        {hpoi.assignedPolity && (
          <>
            {' '}
            — <PolityName polity={hpoi.assignedPolity} />
          </>
        )}
      </h4>
      <p>{hpoi.reason ? `NONE — ${hpoi.reason}` : hpoi.fields.length ? 'Present' : '—'}</p>
      <dl className="culture-data">
        {hpoi.fields.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function WorldEntry({
  world,
  onCompleteWorld,
}: {
  world: CultureWorldDisplayDTO;
  onCompleteWorld: (worldId: string) => void;
}) {
  return (
    <article className="culture-world" id={`culture-world-${world.id}`}>
      <h3>
        {world.name}
        {world.startingWorld ? ' ★ Starting world' : ''}
      </h3>
      <p>
        {world.systemName} · {world.kindLabel} · {world.complete ? 'Complete' : 'Incomplete'} · TL{' '}
        {world.techLevel}
      </p>
      <p>
        World Tags: {world.tags.map((tag) => tag.tag).join(', ')} · Population: {world.population}
      </p>
      <p>
        Original polity: <PolityName polity={world.originalPolity} /> · Current claims:{' '}
        {world.claims.claimants.length ? (
          world.claims.claimants.map((polity, index) => (
            <span key={polity.id}>
              {index > 0 ? ', ' : ''}
              <PolityName polity={polity} />
            </span>
          ))
        ) : (
          <PolityName polity={null} />
        )}
      </p>
      <section className="culture-tag-section">
        <h4>Tag description</h4>
        <div className="culture-tag-grid">
          {world.tags.map((tag, index) => (
            <div className="culture-tag-box" key={`${tag.tag}-${index}`}>
              <h5>{tag.tag}</h5>
              <p>{tag.description}</p>
            </div>
          ))}
        </div>
      </section>
      {!world.complete && (
        <button type="button" onClick={() => onCompleteWorld(world.id)}>
          GENERATE CULTURE / COMPLETE WORLD
        </button>
      )}
      <h4>Culture</h4>
      {world.culture ? <DataTree value={world.culture} /> : <p>—</p>}
      <details className="culture-hpoi-drawer">
        <summary>Habitable Points of Interest ({world.hpois.length})</summary>
        <div className="culture-hpoi-grid">
          {world.hpois.map((hpoi) => (
            <HpoiEntry key={hpoi.id} hpoi={hpoi} />
          ))}
        </div>
      </details>
    </article>
  );
}

function PolityOverview({ rows }: { rows: CultureScreenDisplayDTO['overview'] }) {
  return (
    <section className="culture-polity-overview" aria-labelledby="culture-polity-overview-title">
      <h2 id="culture-polity-overview-title">Polity Overview</h2>
      <div className="culture-polity-table-scroll">
        <table className="culture-polity-table">
          <thead>
            <tr>
              <th scope="col">World Name</th>
              <th scope="col">Status</th>
              <th scope="col">Original Polity Name</th>
              <th scope="col">Flag</th>
              <th scope="col">Current Polity Name</th>
              <th scope="col">Flag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.worldId}>
                <th scope="row">
                  <a href={`#culture-world-${row.worldId}`}>{row.worldName}</a>
                </th>
                <td
                  className="culture-world-status"
                  title={
                    row.startingWorld
                      ? 'Starting world'
                      : row.complete
                        ? 'Complete world'
                        : 'Incomplete world'
                  }
                >
                  {row.startingWorld ? (
                    <span aria-label="Starting world" title="Starting world">
                      ★
                    </span>
                  ) : row.complete ? (
                    <span aria-label="Complete world" title="Complete world">
                      ✓
                    </span>
                  ) : null}
                </td>
                <td>{row.originalPolity?.NiceName ?? 'None'}</td>
                <td>
                  <PolityFlag polity={row.originalPolity ?? undefined} />
                </td>
                <td>
                  {row.currentPolities.length
                    ? row.currentPolities.map((polity) => (
                        <div key={polity.id}>{polity.NiceName}</div>
                      ))
                    : 'None'}
                </td>
                <td>
                  {row.currentPolities.length ? (
                    row.currentPolities.map((polity) => (
                      <div key={polity.id}>
                        <PolityFlag polity={polity} />
                      </div>
                    ))
                  ) : (
                    <PolityFlag />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CultureScreen({
  display,
  onCompleteWorld,
}: {
  display: CultureScreenDisplayDTO;
  onCompleteWorld: (worldId: string) => void;
}) {
  return (
    <main className="culture-screen">
      <h1>CULTURE</h1>
      <PolityOverview rows={display.overview} />
      {display.worlds.map((world) => (
        <WorldEntry key={world.id} world={world} onCompleteWorld={onCompleteWorld} />
      ))}
    </main>
  );
}
