import { Fragment } from 'react';
import type { Preview } from '../../application/appState';
import type {
  DisplaySectorDTO,
  DisplaySelectableDTO,
  DisplaySystemDTO,
} from '../../../DisplayDTO/dto';
import { isVisibleToPlayerDisplay } from '../../visibility_presentation';
import { StarGlyph } from './StarGlyph';
import { PolityFlagList } from '../politics/PolityFlag';

function visible(id: string, display: DisplaySectorDTO, preview: Preview) {
  return preview === 'gm' || isVisibleToPlayerDisplay(display, id);
}
function details(id: string, display: DisplaySectorDTO) {
  return display.entities[id];
}
function displayName(info: DisplaySelectableDTO | undefined, preview: Preview) {
  if (!info) return undefined;
  return preview === 'player' && !info.visibility.PoliticsScan
    ? info.proceduralName
    : info.niceName;
}
function showProceduralName(info: DisplaySelectableDTO, preview: Preview) {
  return preview === 'gm' || info.visibility.PoliticsScan;
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
  style,
}: {
  id: string;
  selected: string | null;
  onSelect: (id: string) => void;
  className?: string;
  children: React.ReactNode;
  label: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected === id}
      className={`selectable ${selected === id ? 'selected' : ''} ${className}`}
      style={style}
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
  display,
  selected,
  select,
  preview,
  showPolityOverlay,
}: {
  world: DisplaySelectableDTO;
  system: DisplaySystemDTO;
  display: DisplaySectorDTO;
  selected: string | null;
  select: (id: string) => void;
  preview: Preview;
  showPolityOverlay: boolean;
}) {
  const d = world;
  const planet = world.planet;
  if (!planet) return null;
  const pois = system.poiIds
    .map((id) => display.entities[id])
    .filter((poi) => poi?.poi?.hostId === world.id && visible(poi.id, display, preview));
  const hpois = system.habitablePoiIds
    .map((id) => display.entities[id])
    .filter((poi) => poi?.habitablePoi?.hostId === world.id && visible(poi.id, display, preview));
  const scale = world.spatial?.parentId ? 0.55 : (worldScale[world.size?.toLowerCase() ?? ''] ?? 1);
  return (
    <div className={`world-unit ${world.spatial?.parentId ? 'moon-unit' : ''}`}>
      {showPolityOverlay && (preview === 'gm' || d.visibility.PoliticsScan) && (
        <PolityFlagList
          polities={world.claims?.claimants ?? []}
          className="polity-overlay-flags symbolic-polity-flags"
        />
      )}
      <div className="orbital-tick" />
      <Selectable
        id={world.id}
        selected={selected}
        onSelect={select}
        label={displayName(d, preview) ?? 'World'}
        className="world-orb"
      >
        <span
          style={{ '--scale': scale } as React.CSSProperties}
          className={`orb ${planet.colorClass}`}
        />
      </Selectable>
      {display.playerShipLocationId === world.id &&
        visible(display.playerShipId, display, preview) && (
          <Selectable
            id={display.playerShipId}
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
        <small className="world-procedural-name">{d.proceduralName}</small>
      )}
      {planet.populationRank !== null && (
        <div className="summary-icons world-summary-icons" role="group" aria-label="World ratings">
          <span
            className="summary-rating summary-rating-habitability"
            style={{
              backgroundColor: planet.habitabilityColor ?? undefined,
            }}
            role="img"
            aria-label={`Habitability rating ${planet.habitabilityRating}`}
            title={`Habitability rating: ${planet.habitabilityRating}`}
          />
          {(preview === 'gm' || d.visibility.DetailedScan) && (
            <span
              className="summary-rating summary-rating-population"
              role="img"
              aria-label={`Population rank ${planet.populationRank}: ${planet.population}`}
              title={`Population rank ${planet.populationRank}: ${planet.population}`}
            >
              {Array.from({ length: planet.populationRank ?? 0 }, (_, index) => (
                <svg key={index} className="population-bust" viewBox="0 0 12 14" aria-hidden="true">
                  <circle cx="6" cy="3.5" r="2.5" />
                  <path d="M1 13v-1.2a5 5 0 0 1 10 0V13z" />
                </svg>
              ))}
            </span>
          )}
          {(preview === 'gm' || d.visibility.PoliticsScan) && (
            <span
              className={`summary-rating summary-rating-technology ${planet.technologyColorClass}`}
              role="img"
              aria-label={`Technology rating ${planet.technologyRating}: ${planet.technologyLevel}`}
              title={`Technology rating: ${planet.technologyRating} (${planet.technologyLevel})`}
            >
              {planet.technologyRating}
            </span>
          )}
        </div>
      )}
      <div className="poi-list world-poi-list">
        {pois.map((p) => (
          <Selectable
            key={p.id}
            id={p.id}
            selected={selected}
            onSelect={select}
            label={displayName(p, preview) ?? 'POI'}
            className="poi world-poi"
          >
            <span className="poi-marker">◆</span>
          </Selectable>
        ))}
        {hpois.map((p) => (
          <Selectable
            key={p.id}
            id={p.id}
            selected={selected}
            onSelect={select}
            label={p.habitablePoi?.typeLabel ?? 'HPOI'}
            className="poi world-poi hpoi"
          >
            <span className="poi-marker" title={p.habitablePoi?.typeLabel ?? 'HPOI'}>
              {p.habitablePoi?.marker}
            </span>
          </Selectable>
        ))}
      </div>
    </div>
  );
}

function OtherObjectSymbol({
  object,
  system,
  display,
  selected,
  select,
  preview,
  showPolityOverlay,
}: {
  object: DisplaySelectableDTO;
  system: DisplaySystemDTO;
  display: DisplaySectorDTO;
  selected: string | null;
  select: (id: string) => void;
  preview: Preview;
  showPolityOverlay: boolean;
}) {
  const d = object;
  const label = displayName(d, preview) ?? object.otherObjectType ?? 'OtherCelestialObject';
  const glyphClass = `other-object-glyph ${object.spatial?.glyphClass}`;
  const pois = system.poiIds
    .map((id) => display.entities[id])
    .filter((poi) => poi?.poi?.hostId === object.id && visible(poi.id, display, preview));

  return (
    <div className="world-unit other-object-unit">
      {showPolityOverlay && (preview === 'gm' || d.visibility.PoliticsScan) && (
        <PolityFlagList
          polities={object.claims?.claimants ?? []}
          className="polity-overlay-flags symbolic-polity-flags"
        />
      )}
      <div className="orbital-tick" />
      <Selectable
        id={object.id}
        selected={selected}
        onSelect={select}
        label={label}
        className="world-orb other-object-orb"
      >
        <span className={glyphClass} aria-hidden="true">
          {object.otherObjectType === 'AsteroidBelt' &&
            Array.from({ length: 5 }, (_, index) => <span key={index} />)}
          {object.otherObjectType === 'KuiperBelt' &&
            Array.from({ length: 5 }, (_, index) => <span key={index} />)}
          {object.otherObjectType === 'GasCloud' &&
            Array.from({ length: 4 }, (_, index) => (
              <span className="gas-cloud-cross" key={index} />
            ))}
        </span>
      </Selectable>
      <strong className="world-name world-symbol-name">{label}</strong>
      {d && showProceduralName(d, preview) && (
        <small className="world-procedural-name">{d.proceduralName}</small>
      )}
      <div className="poi-list world-poi-list">
        {pois.map((p) => (
          <Selectable
            key={p.id}
            id={p.id}
            selected={selected}
            onSelect={select}
            label={displayName(p, preview) ?? 'POI'}
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
  systemId,
  display,
  selected,
  select,
  selectRoute,
  preview,
  defaultOpen: _defaultOpen,
  showHeader = true,
  showPolityOverlay = false,
}: {
  systemId: string;
  display: DisplaySectorDTO;
  selected: string | null;
  select: (id: string) => void;
  selectRoute: (id: string, contextSystemId: string) => void;
  preview: Preview;
  defaultOpen: boolean;
  showHeader?: boolean;
  showPolityOverlay?: boolean;
}) {
  const system = display.systems.find((candidate) => candidate.id === systemId);
  if (!system) return null;
  const open = false;
  const spatialAu = (id: string) => display.entities[id].spatial!.effectiveAu;
  const objects = system.objectIds.map((id) => display.entities[id]);
  const planets = objects.filter((object) => object.kind === 'Planet');
  const worldPlanets = planets
    .filter((world) => !world.spatial?.parentId)
    .sort((a, b) => spatialAu(a.id) - spatialAu(b.id));
  const families = worldPlanets
    .map((planet) =>
      [planet, ...planets.filter((moon) => moon.spatial?.parentId === planet.id)].filter((world) =>
        visible(world.id, display, preview),
      ),
    )
    .filter((family) => family.length > 0);
  const otherObjects = objects
    .filter(
      (object) => object.kind === 'OtherCelestialObject' && visible(object.id, display, preview),
    )
    .sort((a, b) => spatialAu(a.id) - spatialAu(b.id));
  const orbitals = [
    ...families.map((family) => ({
      kind: 'family' as const,
      key: family[0].id,
      au: spatialAu(family[0].id),
      family,
    })),
    ...otherObjects.map((object) => ({
      kind: 'other' as const,
      key: object.id,
      au: spatialAu(object.id),
      object,
    })),
  ].sort((left, right) => left.au - right.au);
  const routes = display.routeIds
    .map((id) => display.entities[id])
    .filter(
      (route) =>
        route.route?.endpointSystemIds.includes(system.id) && visible(route.id, display, preview),
    );
  const systemD = details(system.id, display);
  const starDisplay = system.star;
  const shipAtSystem =
    display.playerShipLocationId === system.starId &&
    visible(display.playerShipId, display, preview);
  return (
    <article id={`symbolic-system-${system.id}`} className="symbolic-system">
      {showHeader && (
        <header>
          <div>
            <h2 className="system-name system-header-name">
              <strong>{displayName(systemD, preview)}</strong>
              {systemD && showProceduralName(systemD, preview) && (
                <small>{systemD.proceduralName}</small>
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
                id={system.id}
                selected={selected}
                onSelect={select}
                label={`System ${displayName(systemD, preview) ?? 'System'}`}
                className={`star-orb ${starDisplay.className}`}
                style={starDisplay.styleTokens}
              >
                <StarGlyph recipe={starDisplay.recipe} />
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
                        key={world.id}
                      >
                        <WorldSymbol
                          world={world}
                          system={system}
                          display={display}
                          selected={selected}
                          select={select}
                          preview={preview}
                          showPolityOverlay={showPolityOverlay}
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
                      display={display}
                      selected={selected}
                      select={select}
                      preview={preview}
                      showPolityOverlay={showPolityOverlay}
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
                    const routeDisplay = route.route!;
                    const currentIndex = routeDisplay.endpointSystemIds.indexOf(system.id);
                    const otherName = routeDisplay.symbolicDestinations[1 - currentIndex];
                    return (
                      <Selectable
                        key={route.id}
                        id={route.id}
                        selected={selected}
                        onSelect={(id) => selectRoute(id, system.id)}
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
                    id={display.playerShipId}
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
              <Fragment key={family[0].id}>
                {familyIndex > 0 && <div className="interplanet-flex-spacer" aria-hidden="true" />}
                <div
                  className={`symbolic-info-family ${familyIndex === 0 ? 'first-planetary-family' : ''}`}
                >
                  {family.map((world, memberIndex) => {
                    const worldD = details(world.id, display);
                    return (
                      <div
                        className={`symbolic-info-column ${memberIndex > 0 ? 'family-member' : ''}`}
                        key={world.id}
                      >
                        {worldD && <SurveyCard summary={worldD.intelligence.InfoboxSummary} />}
                      </div>
                    );
                  })}
                </div>
              </Fragment>
            ))}
            {otherObjects.map((object) => {
              const objectD = details(object.id, display);
              return (
                <div className="symbolic-info-column" key={object.id}>
                  {objectD && <SurveyCard summary={objectD.intelligence.InfoboxSummary} />}
                </div>
              );
            })}
            {routes.length > 0 && (
              <>
                <div className="routes-flex-spacer" aria-hidden="true" />
                <div className="symbolic-info-column route-info-column">
                  {details(routes[0].id, display) && (
                    <SurveyCard
                      summary={details(routes[0].id, display)!.intelligence.InfoboxSummary}
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
