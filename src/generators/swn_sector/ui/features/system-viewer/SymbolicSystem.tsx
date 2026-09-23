import { Fragment } from 'react';
import type { Preview } from '../../application/appState';
import type { OtherCelestialObject, Planet, Sector, StarSystem } from '../../../merged_schema';
import { VisibilityLevel, visibilityRank } from '../../domain/sector/visibility';
import {
  findDetails,
  isVisibleToPlayer,
  planets,
  routeSystems,
} from '../../domain/sector/selectors';
import { planetColorClass } from '../../../planet_presentation';

function visible(id: string, sector: Sector, preview: Preview) {
  return preview === 'gm' || isVisibleToPlayer(sector, id);
}
function details(id: string, sector: Sector) {
  return findDetails(sector, id);
}
function displayName(info: ReturnType<typeof findDetails>, preview: Preview) {
  if (!info) return undefined;
  return preview === 'player' &&
    visibilityRank(info.VisibilityLevel) < visibilityRank(VisibilityLevel.CULTURE_PARTIAL)
    ? info.ProceduralName
    : info.NiceName;
}
function showProceduralName(info: NonNullable<ReturnType<typeof findDetails>>, preview: Preview) {
  return (
    preview === 'gm' ||
    visibilityRank(info.VisibilityLevel) >= visibilityRank(VisibilityLevel.CULTURE_PARTIAL)
  );
}
function ContentText({ content }: { content: string }) {
  return <>{content}</>;
}
function Selectable({
  id,
  selected,
  onSelect,
  className = '',
  children,
  label,
}: {
  id: string;
  selected: string | null;
  onSelect: (id: string) => void;
  className?: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected === id}
      className={`selectable ${selected === id ? 'selected' : ''} ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      {children}
    </button>
  );
}
const worldScale: Record<string, number> = {
  mercury: 0.5,
  luna: 0.5,
  mars: 0.5,
  earth: 1,
  earthlike: 1,
  venus: 1,
  neptune: 1.5,
  uranus: 1.5,
  jupiter: 2,
  saturn: 2,
};

function WorldSymbol({
  world,
  system,
  sector,
  selected,
  select,
  preview,
}: {
  world: Planet;
  system: StarSystem;
  sector: Sector;
  selected: string | null;
  select: (id: string) => void;
  preview: Preview;
}) {
  const d = details(world.Id, sector);
  const pois = system.PointsOfInterest.filter(
    (p) => p.ParentObjectId === world.Id && visible(p.Id, sector, preview),
  );
  const scale = world.Orbit.ParentObjectId ? 0.55 : (worldScale[world.Size.toLowerCase()] ?? 1);
  return (
    <div className={`world-unit ${world.Orbit.ParentObjectId ? 'moon-unit' : ''}`}>
      <div className="orbital-tick" />
      <Selectable
        id={world.Id}
        selected={selected}
        onSelect={select}
        label={displayName(d, preview) ?? 'World'}
        className="world-orb"
      >
        <span
          style={{ '--scale': scale } as React.CSSProperties}
          className={`orb ${planetColorClass(world)}`}
        />
      </Selectable>
      {sector.PlayerShip.CurrentLocationId === world.Id &&
        visible(sector.PlayerShip.Id, sector, preview) && (
          <Selectable
            id={sector.PlayerShip.Id}
            selected={selected}
            onSelect={select}
            label="Player ship"
            className="local-ship"
          >
            ▰
          </Selectable>
        )}
      <strong className="world-name world-symbol-name">{displayName(d, preview)}</strong>
      {d && showProceduralName(d, preview) && (
        <small className="world-procedural-name">{d.ProceduralName}</small>
      )}
      <div
        className="summary-icons world-summary-icons"
        title={world.InhabitedInfo !== false ? 'Atmosphere / population / technology' : undefined}
      >
        {world.InhabitedInfo !== false && (
          <>
            <span className="summary-icon summary-icon-atmosphere">◉</span>
            <span className="summary-icon summary-icon-population">♟</span>
            <span className="summary-icon summary-icon-technology">⌁</span>
          </>
        )}
      </div>
      <div className="poi-list world-poi-list">
        {pois.map((p) => (
          <Selectable
            key={p.Id}
            id={p.Id}
            selected={selected}
            onSelect={select}
            label={displayName(details(p.Id, sector), preview) ?? 'POI'}
            className="poi world-poi"
          >
            <span className="poi-marker">◆</span>
          </Selectable>
        ))}
      </div>
    </div>
  );
}

function OtherObjectSymbol({
  object,
  system,
  sector,
  selected,
  select,
  preview,
}: {
  object: OtherCelestialObject;
  system: StarSystem;
  sector: Sector;
  selected: string | null;
  select: (id: string) => void;
  preview: Preview;
}) {
  const d = details(object.Id, sector);
  const label = displayName(d, preview) ?? object.ObjectType;
  const glyphClass = `other-object-glyph other-object-${object.ObjectType.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;
  const pois = system.PointsOfInterest.filter(
    (p) => p.ParentObjectId === object.Id && visible(p.Id, sector, preview),
  );

  return (
    <div className="world-unit other-object-unit">
      <div className="orbital-tick" />
      <Selectable
        id={object.Id}
        selected={selected}
        onSelect={select}
        label={label}
        className="world-orb other-object-orb"
      >
        <span className={glyphClass} aria-hidden="true">
          {object.ObjectType === 'AsteroidBelt' &&
            Array.from({ length: 5 }, (_, index) => <span key={index} />)}
          {object.ObjectType === 'KuiperBelt' &&
            Array.from({ length: 5 }, (_, index) => <span key={index} />)}
        </span>
      </Selectable>
      <strong className="world-name world-symbol-name">{label}</strong>
      {d && showProceduralName(d, preview) && (
        <small className="world-procedural-name">{d.ProceduralName}</small>
      )}
      <div className="poi-list world-poi-list">
        {pois.map((p) => (
          <Selectable
            key={p.Id}
            id={p.Id}
            selected={selected}
            onSelect={select}
            label={displayName(details(p.Id, sector), preview) ?? 'POI'}
            className="poi world-poi"
          >
            <span className="poi-marker">◆</span>
          </Selectable>
        ))}
      </div>
    </div>
  );
}

function SurveyCard({ summary, className = '' }: { summary: string; className?: string }) {
  return (
    <section className={`intelligence-card ${className}`}>
      <p className="intelligence-description">
        <ContentText content={summary} />
      </p>
    </section>
  );
}

export function SymbolicSystem({
  system,
  sector,
  selected,
  select,
  selectRoute,
  preview,
  defaultOpen: _defaultOpen,
  showHeader = true,
}: {
  system: StarSystem;
  sector: Sector;
  selected: string | null;
  select: (id: string) => void;
  selectRoute: (id: string, contextSystemId: string) => void;
  preview: Preview;
  defaultOpen: boolean;
  showHeader?: boolean;
}) {
  const open = false;
  const worldPlanets = planets(system)
    .filter((w) => !w.Orbit.ParentObjectId)
    .sort((a, b) => a.Orbit.AU - b.Orbit.AU);
  const families = worldPlanets
    .map((planet) =>
      [planet, ...planets(system).filter((moon) => moon.Orbit.ParentObjectId === planet.Id)].filter(
        (world) => visible(world.Id, sector, preview),
      ),
    )
    .filter((family) => family.length > 0);
  const otherObjects = system.Objects.filter(
    (object): object is OtherCelestialObject =>
      object.Kind === 'OtherCelestialObject' && visible(object.Id, sector, preview),
  ).sort((a, b) => a.Orbit.AU - b.Orbit.AU);
  const orbitals = [
    ...families.map((family) => ({
      kind: 'family' as const,
      key: family[0].Id,
      au: family[0].Orbit.AU,
      family,
    })),
    ...otherObjects.map((object) => ({
      kind: 'other' as const,
      key: object.Id,
      au: object.Orbit.AU,
      object,
    })),
  ].sort((left, right) => left.au - right.au);
  const routes = sector.Routes.filter(
    (route) =>
      routeSystems(sector, route)?.some((candidate) => candidate.Id === system.Id) &&
      visible(route.Id, sector, preview),
  );
  const systemD = details(system.Id, sector);
  const shipAtSystem =
    sector.PlayerShip.CurrentLocationId === system.Star.Id &&
    visible(sector.PlayerShip.Id, sector, preview);
  return (
    <article id={`symbolic-system-${system.Id}`} className="symbolic-system">
      {showHeader && (
        <header>
          <div>
            <h2 className="system-name system-header-name">
              <strong>{displayName(details(system.Id, sector), preview)}</strong>
              {systemD && showProceduralName(systemD, preview) && (
                <small>{systemD.ProceduralName}</small>
              )}
            </h2>
          </div>
        </header>
      )}
      <div className="symbolic-track">
        <div className="symbolic-object-grid">
          <div className="symbolic-column sun-column">
            <div className="star-unit">
              <Selectable
                id={system.Id}
                selected={selected}
                onSelect={select}
                label={`System ${displayName(systemD, preview) ?? 'System'}`}
                className="star-orb"
              >
                <span>✦</span>
              </Selectable>
            </div>
          </div>
          {orbitals.map((orbital, orbitalIndex) => {
            const previous = orbitals[orbitalIndex - 1];
            return (
              <Fragment key={orbital.key}>
                {previous?.kind === 'family' && orbital.kind === 'family' && (
                  <div className="interplanet-flex-spacer" aria-hidden="true" />
                )}
                {orbital.kind === 'family' ? (
                  <div
                    className={`planetary-family ${orbitalIndex === 0 ? 'first-planetary-family' : ''}`}
                  >
                    {orbital.family.map((world, memberIndex) => (
                      <div
                        className={`symbolic-column world-column ${memberIndex > 0 ? 'family-member' : ''}`}
                        key={world.Id}
                      >
                        <WorldSymbol
                          world={world}
                          system={system}
                          sector={sector}
                          selected={selected}
                          select={select}
                          preview={preview}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`symbolic-column world-column ${orbitalIndex === 0 ? 'first-planetary-family' : ''}`}
                  >
                    <OtherObjectSymbol
                      object={orbital.object}
                      system={system}
                      sector={sector}
                      selected={selected}
                      select={select}
                      preview={preview}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
          {(routes.length > 0 || shipAtSystem) && (
            <>
              <div className="routes-flex-spacer" aria-hidden="true" />
              <div className="symbolic-column route-column">
                <div className="route-unit">
                  {routes.map((route) => {
                    const other = routeSystems(sector, route)?.find(
                      (candidate) => candidate.Id !== system.Id,
                    );
                    const otherId = other?.Id ?? '';
                    const otherName =
                      displayName(details(otherId, sector), preview) ?? other?.Id ?? 'System';
                    return (
                      <Selectable
                        key={route.Id}
                        id={route.Id}
                        selected={selected}
                        onSelect={(id) => selectRoute(id, system.Id)}
                        label={`To ${otherName}`}
                        className="route-rectangle"
                      >
                        <span>To {otherName}</span>
                      </Selectable>
                    );
                  })}
                </div>
                {shipAtSystem && (
                  <Selectable
                    id={sector.PlayerShip.Id}
                    selected={selected}
                    onSelect={select}
                    label="Player ship"
                    className="route-ship"
                  >
                    ▰
                  </Selectable>
                )}
              </div>
            </>
          )}
        </div>
        {open && (
          <div className="symbolic-info-grid">
            <div className="symbolic-info-sun-spacer" aria-hidden="true" />
            {families.map((family, familyIndex) => (
              <Fragment key={family[0].Id}>
                {familyIndex > 0 && <div className="interplanet-flex-spacer" aria-hidden="true" />}
                <div
                  className={`symbolic-info-family ${familyIndex === 0 ? 'first-planetary-family' : ''}`}
                >
                  {family.map((world, memberIndex) => {
                    const worldD = details(world.Id, sector);
                    return (
                      <div
                        className={`symbolic-info-column ${memberIndex > 0 ? 'family-member' : ''}`}
                        key={world.Id}
                      >
                        {worldD && <SurveyCard summary={worldD.Intelligence.InfoboxSummary} />}
                      </div>
                    );
                  })}
                </div>
              </Fragment>
            ))}
            {otherObjects.map((object) => {
              const objectD = details(object.Id, sector);
              return (
                <div className="symbolic-info-column" key={object.Id}>
                  {objectD && <SurveyCard summary={objectD.Intelligence.InfoboxSummary} />}
                </div>
              );
            })}
            {routes.length > 0 && (
              <>
                <div className="routes-flex-spacer" aria-hidden="true" />
                <div className="symbolic-info-column route-info-column">
                  {details(routes[0].Id, sector) && (
                    <SurveyCard
                      summary={details(routes[0].Id, sector)!.Intelligence.InfoboxSummary}
                      className="route-intelligence-card"
                    />
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
