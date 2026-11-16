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

function ValueRows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="culture-data">
      {rows.map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
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

function CultureSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="culture-info-box">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function CultureDetails({
  culture,
  npcLocationBank,
}: {
  culture: NonNullable<CultureWorldDisplayDTO['culture']>;
  npcLocationBank: NonNullable<CultureWorldDisplayDTO['npcLocationBank']>;
}) {
  const components = culture.adventureComponents;
  return (
    <div className="culture-info-grid">
      <CultureSection title="World Basics and Locations">
        <ValueRows
          rows={[
            ['Cultural Template', culture.culturalTemplate],
            ['Homeworld', culture.homeworld],
            ['Major Starport', `${culture.majorStarport.name} (${culture.majorStarport.type})`],
            [
              'PC Interest',
              `${culture.pcCaresAbout.category}: ${culture.pcCaresAbout.type}${culture.pcCaresAbout.commoditySize ? ` (${culture.pcCaresAbout.commoditySize})` : ''}`,
            ],
            [
              'Biggest Conflict',
              `${culture.biggestConflict.category} — ${culture.biggestConflict.details}`,
            ],
            ['Outsider Opinion', culture.outsiderOpinion],
          ]}
        />
      </CultureSection>
      <CultureSection title="NPC and Location Bank">
        <div className="culture-bank-grid">
          <div>
            <h5>NPCs:</h5>
            <ul>
              {npcLocationBank.npcs.map((npc, index) => (
                <li key={`${npc.name}-${index}`}>
                  {npc.name} ({npc.gender === 'Male' ? 'M' : 'F'})
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5>Locations:</h5>
            <ul>
              {npcLocationBank.locations.map((location, index) => (
                <li key={`${location}-${index}`}>{location}</li>
              ))}
            </ul>
          </div>
        </div>
      </CultureSection>
      <CultureSection title="Adventure Components">
        <div className="culture-component-list">
          {(['enemy', 'friend', 'complication', 'thing', 'place'] as const).map((kind) => {
            const component = components[kind];
            const heading = label(kind);
            const identity =
              'name' in component
                ? `${component.name} (${component.gender === 'Male' ? 'M' : 'F'})`
                : 'placeName' in component
                  ? component.placeName
                  : null;
            return (
              <section className="culture-component" key={kind}>
                <h5>{heading}</h5>
                {identity && <strong>{identity}</strong>}
                <ul>
                  {component.prompts.map(({ prompt }, index) => (
                    <li key={`${kind}-${index}`}>{prompt}</li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </CultureSection>
      <CultureSection title="Terrestrial Security">
        <ValueRows
          rows={[
            ['Law Enforcement', culture.lawEnforcement.amount],
            ['Law Enforcement Style', culture.lawEnforcement.style],
            ['Special Law', culture.lawEnforcement.specialLaw],
          ]}
        />
      </CultureSection>
      <CultureSection title="Orbital Security">
        <ValueRows
          rows={[
            [
              'Trade and Smuggling Enforcement Amount',
              culture.planetaryDefenses.tradeAndSmugglingEnforcementAmount,
            ],
            ['Customs and Visa Emphasis', culture.planetaryDefenses.customsAndVisaEmphasis],
            ['Orbiting Station Style', culture.planetaryDefenses.orbitingStationStyle],
            ['Orbiting Station Type', culture.planetaryDefenses.orbitingStationType],
            ['Patrol Boat Presence', culture.planetaryDefenses.patrolBoatPresence],
            ['Planetary Gun Turrets', culture.planetaryDefenses.planetaryGunTurrets],
          ]}
        />
      </CultureSection>
    </div>
  );
}

function WorldEntry({ world }: { world: CultureWorldDisplayDTO }) {
  const claimsMatchOriginal =
    world.originalPolity !== null &&
    world.claims.claimants.length === 1 &&
    world.claims.claimants[0]?.id === world.originalPolity.id;

  return (
    <details className="culture-world">
      <summary>
        <h3>
          {world.name}
          {world.startingWorld ? ' ★ Starting world' : ''}
        </h3>
      </summary>
      <p>
        TL {world.techLevel}, {world.population}
      </p>
      <p>
        Polity: <PolityName polity={world.originalPolity} />
        {!claimsMatchOriginal && (
          <>
            {' · '}Claimants:{' '}
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
          </>
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
      {world.culture && world.npcLocationBank ? (
        <CultureDetails culture={world.culture} npcLocationBank={world.npcLocationBank} />
      ) : (
        <p>—</p>
      )}
      <details className="culture-hpoi-drawer">
        <summary>Habitable Points of Interest ({world.hpois.length})</summary>
        <div className="culture-hpoi-grid">
          {world.hpois.map((hpoi) => (
            <HpoiEntry key={hpoi.id} hpoi={hpoi} />
          ))}
        </div>
      </details>
    </details>
  );
}

function WorldOverview({ rows }: { rows: CultureScreenDisplayDTO['overview'] }) {
  return (
    <div className="culture-polity-table-scroll">
      <table className="culture-polity-table">
        <thead>
          <tr>
            <th scope="col">World Name</th>
            <th scope="col">System</th>
            <th scope="col">Visibility status</th>
            <th scope="col">Polity Name</th>
            <th scope="col">Claimants</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.worldId}>
              <th scope="row">
                {row.worldName}
              </th>
              <td>{row.systemName}</td>
              <td className="culture-world-status">
                {row.realizationTier ? (
                  <>
                    <span
                      className={`culture-tier-mark culture-tier-mark--${row.realizationTier.toLowerCase()}`}
                      aria-hidden="true"
                    />
                    <span>{row.realizationTier}</span>
                  </>
                ) : (
                  '—'
                )}
              </td>
              <td>
                <span className="culture-overview-polity">
                  {row.originalPolity?.NiceName ?? 'None'}{' '}
                  <PolityFlag polity={row.originalPolity ?? undefined} />
                </span>
              </td>
              <td className="culture-overview-claimants">
                {row.currentPolities.length ? (
                  row.currentPolities.map((polity) => (
                    <div className="culture-overview-claimant" key={polity.id}>
                      <span className="culture-overview-polity">
                        {polity.NiceName} <PolityFlag polity={polity} />
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="culture-overview-claimant">
                    <span className="culture-overview-polity">
                      None <PolityFlag />
                    </span>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CultureScreen({
  display,
}: {
  display: CultureScreenDisplayDTO;
}) {
  const visibilityRank = { Primary: 0, Secondary: 1, Tertiary: 2 } as const;
  const byVisibility = <T extends { realizationTier: 'Primary' | 'Secondary' | 'Tertiary' | null }>(
    values: T[],
  ) =>
    [...values].sort(
      (a, b) =>
        visibilityRank[a.realizationTier!] - visibilityRank[b.realizationTier!],
    );
  const overviewByVisibilityAndSystem = [...display.overview].sort(
    (a, b) =>
      (a.realizationTier ? visibilityRank[a.realizationTier] : 3) -
        (b.realizationTier ? visibilityRank[b.realizationTier] : 3) ||
      a.systemName.localeCompare(b.systemName),
  );

  return (
    <main className="culture-screen">
      <h1>CULTURE</h1>
      {[
        {
          title: 'Visibility status: Visible',
          overview: overviewByVisibilityAndSystem.filter((row) => row.realizationTier !== null),
          worlds: byVisibility(display.worlds.filter((world) => world.realizationTier !== null)),
        },
        {
          title: 'Visibility status: Unlabeled',
          overview: overviewByVisibilityAndSystem.filter((row) => row.realizationTier === null),
          worlds: display.worlds.filter((world) => world.realizationTier === null),
        },
      ].map((group) => (
        <details className="culture-world-group" aria-label={group.title} key={group.title}>
          <summary>
            <h2>{group.title}</h2>
          </summary>
          <WorldOverview rows={group.overview} />
          <div className="culture-world-details">
            {group.worlds.map((world) => (
              <WorldEntry key={world.id} world={world} />
            ))}
          </div>
        </details>
      ))}
    </main>
  );
}
