import type { ReactNode } from 'react';
import type {
  HabitablePointOfInterest,
  Planet,
  Polity,
  Sector,
  StarSystem,
} from '../../../BaseDTO/merged_schema';
import { completeWorld } from '../../../Generator/culture';
import { displayedWorldCulture, hpoiProjection } from '../../../Projector/culture_projection';
import { WORLD_TAG_DEFINITIONS } from '../../../Generator/generation_rules';
import { PolityFlag } from '../politics/PolityFlag';

const WORLD_TAG_DESCRIPTIONS = new Map(
  WORLD_TAG_DEFINITIONS.map((tag) => [tag.tag, tag.description]),
);

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

function PolityName({ polity }: { polity: Polity | undefined }) {
  return (
    <span className="culture-polity-name">
      {polity?.NiceName ?? 'None'} {polity && <PolityFlag polity={polity} />}
    </span>
  );
}

function HpoiEntry({ hpoi, sector }: { hpoi: HabitablePointOfInterest; sector: Sector }) {
  const projected = hpoiProjection(sector, hpoi);
  const assigned =
    hpoi.AssignedPolityId && sector.Polities.find((polity) => polity.Id === hpoi.AssignedPolityId);
  return (
    <section className="culture-hpoi">
      <h4>
        {hpoi.HPOIType}
        {assigned && (
          <>
            {' '}
            — <PolityName polity={assigned} />
          </>
        )}
      </h4>
      <p>
        {projected.reason
          ? `NONE — ${projected.reason}`
          : projected.fields.length
            ? 'Present'
            : '—'}
      </p>
      <dl className="culture-data">
        {projected.fields.map(([name, value]) => (
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
  system,
  sector,
  hpois,
  onChange,
}: {
  world: Planet;
  system: StarSystem;
  sector: Sector;
  hpois: HabitablePointOfInterest[];
  onChange: (sector: Sector) => void;
}) {
  if (world.InhabitedInfo === false) return null;
  const original = sector.Polities.find((polity) => polity.HomeworldId === world.Id);
  const claims = world.ClaimedByPolityIds.map((id) =>
    sector.Polities.find((polity) => polity.Id === id),
  );
  const culture = world.Culture;
  return (
    <article className="culture-world" id={`culture-world-${world.Id}`}>
      <h3>
        {world.NiceName}
        {sector.StartingWorldId === world.Id ? ' ★ Starting world' : ''}
      </h3>
      <p>
        {system.NiceName} · {world.Orbit.ParentObjectId ? 'Moon' : 'Planet'} ·{' '}
        {world.Complete ? 'Complete' : 'Incomplete'} · TL {world.InhabitedInfo.TechLevel}
      </p>
      <p>
        World Tags: {world.InhabitedInfo.WorldTags.join(', ')} · Population:{' '}
        {world.InhabitedInfo.Population}
      </p>
      <p>
        Original polity: <PolityName polity={original} /> · Current claims:{' '}
        {claims.length ? (
          claims.map((polity, index) => (
            <span key={polity?.Id ?? index}>
              {index > 0 ? ', ' : ''}
              <PolityName polity={polity} />
            </span>
          ))
        ) : (
          <PolityName polity={undefined} />
        )}
      </p>
      <section className="culture-tag-section">
        <h4>Tag description</h4>
        <div className="culture-tag-grid">
          {world.InhabitedInfo.WorldTags.map((tag, index) => (
            <div className="culture-tag-box" key={`${tag}-${index}`}>
              <h5>{tag}</h5>
              <p>{WORLD_TAG_DESCRIPTIONS.get(tag) ?? 'No description available.'}</p>
            </div>
          ))}
        </div>
      </section>
      {!world.Complete && (
        <button type="button" onClick={() => onChange(completeWorld(sector, world.Id))}>
          GENERATE CULTURE / COMPLETE WORLD
        </button>
      )}
      <h4>Culture</h4>
      {culture ? <DataTree value={displayedWorldCulture(sector, world)} /> : <p>—</p>}
      <details className="culture-hpoi-drawer">
        <summary>Habitable Points of Interest ({hpois.length})</summary>
        <div className="culture-hpoi-grid">
          {hpois.map((hpoi) => (
            <HpoiEntry key={hpoi.Id} hpoi={hpoi} sector={sector} />
          ))}
        </div>
      </details>
    </article>
  );
}

function PolityOverview({ sector }: { sector: Sector }) {
  const polityById = new Map(sector.Polities.map((polity) => [polity.Id, polity]));
  const worldCountByPolityId = new Map<string, number>();
  for (const system of sector.Systems)
    for (const object of system.Objects) {
      if (object.Kind !== 'Planet' || object.InhabitedInfo === false) continue;
      for (const id of new Set(object.ClaimedByPolityIds))
        worldCountByPolityId.set(id, (worldCountByPolityId.get(id) ?? 0) + 1);
    }
  const comparePolities = (a: Polity, b: Polity) =>
    (worldCountByPolityId.get(b.Id) ?? 0) - (worldCountByPolityId.get(a.Id) ?? 0) ||
    a.NiceName.localeCompare(b.NiceName) ||
    a.Id.localeCompare(b.Id);
  const rows = sector.Systems.flatMap((system) =>
    system.Objects.flatMap((object) => {
      if (object.Kind !== 'Planet' || object.InhabitedInfo === false) return [];
      const original = sector.Polities.find((polity) => polity.HomeworldId === object.Id);
      const current = object.ClaimedByPolityIds.map((id) => polityById.get(id))
        .filter((polity): polity is Polity => polity !== undefined)
        .sort(comparePolities);
      return [{ world: object, original, current }];
    }),
  ).sort(
    (a, b) =>
      (b.current[0] ? (worldCountByPolityId.get(b.current[0].Id) ?? 0) : 0) -
        (a.current[0] ? (worldCountByPolityId.get(a.current[0].Id) ?? 0) : 0) ||
      Number(b.world.Id === sector.StartingWorldId) -
        Number(a.world.Id === sector.StartingWorldId) ||
      Number(Boolean(b.world.Complete)) - Number(Boolean(a.world.Complete)) ||
      (a.current[0]?.NiceName ?? 'None').localeCompare(b.current[0]?.NiceName ?? 'None') ||
      a.world.NiceName.localeCompare(b.world.NiceName) ||
      a.world.Id.localeCompare(b.world.Id),
  );
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
            {rows.map(({ world, original, current }) => (
              <tr key={world.Id}>
                <th scope="row">
                  <a href={`#culture-world-${world.Id}`}>{world.NiceName}</a>
                </th>
                <td
                  className="culture-world-status"
                  title={
                    world.Id === sector.StartingWorldId
                      ? 'Starting world'
                      : world.Complete
                        ? 'Complete world'
                        : 'Incomplete world'
                  }
                >
                  {world.Id === sector.StartingWorldId ? (
                    <span aria-label="Starting world" title="Starting world">
                      ★
                    </span>
                  ) : world.Complete ? (
                    <span aria-label="Complete world" title="Complete world">
                      ✓
                    </span>
                  ) : null}
                </td>
                <td>{original?.NiceName ?? 'None'}</td>
                <td>
                  <PolityFlag polity={original} />
                </td>
                <td>
                  {current.length
                    ? current.map((polity) => <div key={polity.Id}>{polity.NiceName}</div>)
                    : 'None'}
                </td>
                <td>
                  {current.length ? (
                    current.map((polity) => (
                      <div key={polity.Id}>
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
  sector,
  onChange,
}: {
  sector: Sector;
  onChange: (sector: Sector) => void;
}) {
  const worlds = sector.Systems.flatMap((system, systemIndex) =>
    system.Objects.flatMap((object, objectIndex) =>
      object.Kind === 'Planet' && object.InhabitedInfo !== false
        ? [{ world: object, system, systemIndex, objectIndex }]
        : [],
    ),
  ).sort(
    (a, b) =>
      Number(Boolean(b.world.Complete)) - Number(Boolean(a.world.Complete)) ||
      a.systemIndex - b.systemIndex ||
      a.objectIndex - b.objectIndex,
  );
  return (
    <main className="culture-screen">
      <h1>CULTURE</h1>
      <PolityOverview sector={sector} />
      {worlds.map(({ world, system }) => (
        <WorldEntry
          key={world.Id}
          world={world}
          system={system}
          sector={sector}
          hpois={system.HabitablePointsOfInterest.filter((hpoi) => hpoi.ParentWorldId === world.Id)}
          onChange={onChange}
        />
      ))}
    </main>
  );
}
