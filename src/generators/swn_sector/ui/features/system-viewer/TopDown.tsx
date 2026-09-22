import { useEffect, useRef, useState } from 'react';
import type { Preview } from '../../application/appState';
import type { Sector, StarSystem } from '../../../merged_schema';
import { systemEdgeAu } from '../../../generation_rules';
import { VisibilityLevel, visibilityRank } from '../../domain/sector/visibility';
import {
  areAdjacentHexes,
  findDetails,
  isVisibleToPlayer,
  planets,
  routeHasEndpointInSystem,
  routeSystems,
} from '../../domain/sector/selectors';

const TOP_DOWN_BOUNDARY_FILL = 0.88;
const BAKED_TOP_DOWN = {
  spaceshipDistance: 30,
  routeWidth: 7,
  routeLength: 59,
  starSize: 22,
  planetSize: 14,
  moonSize: 10,
  spikeBoundaryColor: '#ff0000',
  spikeBoundaryWeight: 6,
  spikeBoundaryDutyCycle: 26,
  orbitWeight: 1,
  orbitDutyCycle: 31,
  planetLabelFontSize: 13,
  gateLabelFontSize: 12,
  centralHexWidth: 1.03,
  systemDetailScale: 0.93,
  adjacentLabelFontSize: 16,
  diagonalLabelAngle: 60,
  labelBoundaryDistances: {
    top: 20,
    upperRight: 25,
    lowerRight: 25,
    bottom: 25,
    lowerLeft: 25,
    upperLeft: 25,
  },
} as const;
type HexLabelDirection = 'top' | 'upperRight' | 'lowerRight' | 'bottom' | 'lowerLeft' | 'upperLeft';
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
function hexMapPosition(x: number, y: number) {
  return { left: 100 + (x - 1) * 84, top: 55 + (y - 1) * 98 + ((x - 1) % 2) * 49 };
}
function Selectable({
  id,
  selected,
  onSelect,
  className = '',
  children,
  label,
  title,
  style,
}: {
  id: string;
  selected: string | null;
  onSelect: (id: string) => void;
  className?: string;
  children: React.ReactNode;
  label: string;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected === id}
      className={`selectable ${selected === id ? 'selected' : ''} ${className}`}
      style={style}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      {children}
    </button>
  );
}

export function TopDown({
  system,
  sector,
  selected,
  select,
  preview,
}: {
  system: StarSystem;
  sector: Sector;
  selected: string | null;
  select: (id: string) => void;
  preview: Preview;
}) {
  const visiblePlanets = planets(system).filter(
    (w) => !w.Orbit.ParentObjectId && visible(w.Id, sector, preview),
  );
  const shellRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState(320);
  const c = mapSize / 2;
  const hexWidth = mapSize * BAKED_TOP_DOWN.centralHexWidth;
  const hexHeight = (hexWidth * 98) / 112;
  const systemSize = mapSize * BAKED_TOP_DOWN.systemDetailScale;
  const spikeBoundaryRadius = (systemSize / 2) * TOP_DOWN_BOUNDARY_FILL;
  const pixelsPerAu = spikeBoundaryRadius / systemEdgeAu(system.Star.StarType);
  const topDownStyle = {
    '--td-route-width': `${BAKED_TOP_DOWN.routeWidth}px`,
    '--td-route-length': `${BAKED_TOP_DOWN.routeLength}px`,
    '--td-star-size': `${BAKED_TOP_DOWN.starSize}px`,
    '--td-planet-size': `${BAKED_TOP_DOWN.planetSize}px`,
    '--td-moon-size': `${BAKED_TOP_DOWN.moonSize}px`,
    '--td-planet-label-size': `${BAKED_TOP_DOWN.planetLabelFontSize}px`,
    '--td-gate-label-size': `${BAKED_TOP_DOWN.gateLabelFontSize}px`,
    '--td-ship-distance': `${BAKED_TOP_DOWN.spaceshipDistance}px`,
  } as React.CSSProperties;
  const spikeDashPeriod = 12;
  const spikeDashArray = `${(spikeDashPeriod * BAKED_TOP_DOWN.spikeBoundaryDutyCycle) / 100} ${(spikeDashPeriod * (100 - BAKED_TOP_DOWN.spikeBoundaryDutyCycle)) / 100}`;
  const orbitDashPeriod = 10;
  const orbitDashArray = `${(orbitDashPeriod * BAKED_TOP_DOWN.orbitDutyCycle) / 100} ${(orbitDashPeriod * (100 - BAKED_TOP_DOWN.orbitDutyCycle)) / 100}`;
  const routes = sector.Routes.flatMap((route) => {
    if (!visible(route.Id, sector, preview)) return [];
    if (!routeHasEndpointInSystem(sector, route, system.Id)) return [];
    const destination = routeSystems(sector, route)?.find(
      (candidate) => candidate.Id !== system.Id,
    );
    if (!destination || !visible(destination.Id, sector, preview)) return [];
    const from = hexMapPosition(system.HexLocation.Column, system.HexLocation.Row);
    const to = hexMapPosition(destination.HexLocation.Column, destination.HexLocation.Row);
    return [
      {
        route,
        destination,
        angle: (Math.atan2(to.top - from.top, to.left - from.left) * 180) / Math.PI,
      },
    ];
  });
  const adjacentHexes = [-1, 0, 1]
    .flatMap((xOffset) =>
      [-1, 0, 1].map((yOffset) => ({
        Column: system.HexLocation.Column + xOffset,
        Row: system.HexLocation.Row + yOffset,
      })),
    )
    .filter((hex) => areAdjacentHexes(system.HexLocation, hex));
  const adjacentSystems = sector.Systems.filter(
    (candidate) =>
      candidate.Id !== system.Id &&
      visible(candidate.Id, sector, preview) &&
      areAdjacentHexes(system.HexLocation, candidate.HexLocation),
  );
  const neighboringHexPosition = (hex: { Column: number; Row: number }) => {
    const center = hexMapPosition(system.HexLocation.Column, system.HexLocation.Row);
    const target = hexMapPosition(hex.Column, hex.Row);
    return {
      left: c + ((target.left - center.left) * hexWidth) / 112,
      top: c + ((target.top - center.top) * hexWidth) / 112,
    };
  };
  const hexPoints = (point: { left: number; top: number }) => {
    const halfWidth = hexWidth / 2;
    const halfHeight = hexHeight / 2;
    return `${point.left - halfWidth / 2},${point.top - halfHeight} ${point.left + halfWidth / 2},${point.top - halfHeight} ${point.left + halfWidth},${point.top} ${point.left + halfWidth / 2},${point.top + halfHeight} ${point.left - halfWidth / 2},${point.top + halfHeight} ${point.left - halfWidth},${point.top}`;
  };
  const boundaryLabel = (candidate: { HexLocation: { Column: number; Row: number } }) => {
    const point = neighboringHexPosition(candidate.HexLocation);
    const dx = point.left - c;
    const dy = point.top - c;
    const direction: HexLabelDirection =
      Math.abs(dx) < 1
        ? dy < 0
          ? 'top'
          : 'bottom'
        : dx > 0
          ? dy < 0
            ? 'upperRight'
            : 'lowerRight'
          : dy < 0
            ? 'upperLeft'
            : 'lowerLeft';
    const distance = BAKED_TOP_DOWN.labelBoundaryDistances[direction];
    if (Math.abs(dx) < 1)
      return { x: c, y: c + Math.sign(dy) * (hexHeight / 2 + distance), angle: 0 };
    const length = Math.hypot(dx, dy);
    const x = c + dx / 2 + (dx / length) * distance;
    const y = c + dy / 2 + (dy / length) * distance;
    return {
      x,
      y,
      angle: dx * dy < 0 ? BAKED_TOP_DOWN.diagonalLabelAngle : -BAKED_TOP_DOWN.diagonalLabelAngle,
    };
  };
  const objectPois = (parentId: string) =>
    system.PointsOfInterest.filter(
      (poi) => poi.ParentObjectId === parentId && visible(poi.Id, sector, preview),
    );
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const updateSize = () =>
      setMapSize(Math.max(0, Math.min(shell.clientWidth - 24, shell.clientHeight - 24)));
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);
  const pos = (angle: number, radius: number) => ({
    left: c + Math.cos((angle * Math.PI) / 180) * radius,
    top: c + Math.sin((angle * Math.PI) / 180) * radius,
  });
  return (
    <div className="topdown-shell" ref={shellRef}>
      <div className="topdown-frame" style={{ width: mapSize, height: mapSize }}>
        <div className="topdown" style={{ width: mapSize, height: mapSize, ...topDownStyle }}>
          <svg className="system-hex-grid" aria-hidden="true" viewBox={`0 0 ${mapSize} ${mapSize}`}>
            {[system.HexLocation, ...adjacentHexes].map((hex) => {
              const point =
                hex.Column === system.HexLocation.Column && hex.Row === system.HexLocation.Row
                  ? { left: c, top: c }
                  : neighboringHexPosition(hex);
              return <polygon key={`${hex.Column}-${hex.Row}`} points={hexPoints(point)} />;
            })}
            {adjacentSystems.map((candidate) => {
              const name = displayName(details(candidate.Id, sector), preview) ?? 'System';
              const label = boundaryLabel(candidate);
              return (
                <text
                  key={candidate.Id}
                  className="system-hex-label"
                  style={{ fontSize: BAKED_TOP_DOWN.adjacentLabelFontSize }}
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  transform={`rotate(${label.angle} ${label.x} ${label.y})`}
                >
                  {name}
                </text>
              );
            })}
          </svg>
          <svg
            className="spike-boundary"
            aria-hidden="true"
            style={{
              width: spikeBoundaryRadius * 2,
              height: spikeBoundaryRadius * 2,
              left: c - spikeBoundaryRadius,
              top: c - spikeBoundaryRadius,
            }}
          >
            <circle
              cx={spikeBoundaryRadius}
              cy={spikeBoundaryRadius}
              r={Math.max(0, spikeBoundaryRadius - BAKED_TOP_DOWN.spikeBoundaryWeight / 2)}
              fill="none"
              stroke={BAKED_TOP_DOWN.spikeBoundaryColor}
              strokeWidth={BAKED_TOP_DOWN.spikeBoundaryWeight}
              strokeDasharray={spikeDashArray}
            />
          </svg>
          {routes.map(({ route, destination, angle }) => {
            const routePosition = pos(angle, spikeBoundaryRadius);
            const destinationName =
              displayName(details(destination.Id, sector), preview) ?? 'system';
            return (
              <div key={route.Id} className="td-route" style={routePosition}>
                <Selectable
                  id={route.Id}
                  selected={selected}
                  onSelect={select}
                  label={`Route to ${destinationName}`}
                  className="td-route-marker"
                  style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
                >
                  <span />
                </Selectable>
              </div>
            );
          })}
          {visiblePlanets.map((p) => {
            const orbitRadius = p.Orbit.AU * pixelsPerAu;
            return (
              <svg
                key={`orbit-${p.Id}`}
                className="orbit"
                aria-hidden="true"
                style={{
                  width: orbitRadius * 2,
                  height: orbitRadius * 2,
                  left: c - orbitRadius,
                  top: c - orbitRadius,
                }}
              >
                <circle
                  cx={orbitRadius}
                  cy={orbitRadius}
                  r={Math.max(0, orbitRadius - BAKED_TOP_DOWN.orbitWeight / 2)}
                  fill="none"
                  stroke="#2b4148"
                  strokeWidth={BAKED_TOP_DOWN.orbitWeight}
                  strokeDasharray={orbitDashArray}
                />
              </svg>
            );
          })}
          <div className="td-object td-star" style={{ left: c, top: c }}>
            <Selectable
              id={system.Id}
              selected={selected}
              onSelect={select}
              label={`System ${displayName(details(system.Id, sector), preview) ?? 'System'}`}
            >
              <span>✦</span>
            </Selectable>
            {objectPois(system.Star.Id).length > 0 && (
              <div className="topdown-poi-list">
                {objectPois(system.Star.Id).map((poi) => (
                  <Selectable
                    key={poi.Id}
                    id={poi.Id}
                    selected={selected}
                    onSelect={select}
                    label={displayName(details(poi.Id, sector), preview) ?? 'POI'}
                    title={displayName(details(poi.Id, sector), preview) ?? 'POI'}
                    className="topdown-poi"
                  >
                    ◆
                  </Selectable>
                ))}
              </div>
            )}
            {sector.PlayerShip.CurrentLocationId === system.Star.Id &&
              visible(sector.PlayerShip.Id, sector, preview) && (
                <Selectable
                  id={sector.PlayerShip.Id}
                  selected={selected}
                  onSelect={select}
                  label="Player ship"
                  className="td-ship"
                >
                  ▰
                </Selectable>
              )}
          </div>
          {adjacentSystems.map((candidate) => {
            const point = neighboringHexPosition(candidate.HexLocation);
            const name = displayName(details(candidate.Id, sector), preview) ?? 'System';
            return (
              <button
                key={candidate.Id}
                type="button"
                aria-label={`Adjacent system ${name}`}
                aria-pressed={selected === candidate.Id}
                className={`td-adjacent-hex ${selected === candidate.Id ? 'selected' : ''}`}
                style={{ left: point.left, top: point.top, width: hexWidth, height: hexHeight }}
                onClick={() => select(candidate.Id)}
              />
            );
          })}
          {visiblePlanets.map((p) => {
            const pp = pos(p.Orbit.AngleDegrees, p.Orbit.AU * pixelsPerAu);
            const moons = planets(system).filter(
              (m) => m.Orbit.ParentObjectId === p.Id && visible(m.Id, sector, preview),
            );
            return (
              <div key={p.Id}>
                <div className="td-object" style={pp}>
                  <Selectable
                    id={p.Id}
                    selected={selected}
                    onSelect={select}
                    label={displayName(details(p.Id, sector), preview) ?? 'Planet'}
                  >
                    <span className="td-planet" />
                  </Selectable>
                  <label className="topdown-planet-caption">
                    <strong>{displayName(details(p.Id, sector), preview)}</strong>
                    {(() => {
                      const worldD = details(p.Id, sector);
                      return (
                        worldD &&
                        showProceduralName(worldD, preview) && (
                          <small>{worldD.ProceduralName}</small>
                        )
                      );
                    })()}
                  </label>
                  {objectPois(p.Id).length > 0 && (
                    <div className="topdown-poi-list">
                      {objectPois(p.Id).map((poi) => (
                        <Selectable
                          key={poi.Id}
                          id={poi.Id}
                          selected={selected}
                          onSelect={select}
                          label={displayName(details(poi.Id, sector), preview) ?? 'POI'}
                          title={displayName(details(poi.Id, sector), preview) ?? 'POI'}
                          className="topdown-poi"
                        >
                          ◆
                        </Selectable>
                      ))}
                    </div>
                  )}
                  {sector.PlayerShip.CurrentLocationId === p.Id &&
                    visible(sector.PlayerShip.Id, sector, preview) && (
                      <Selectable
                        id={sector.PlayerShip.Id}
                        selected={selected}
                        onSelect={select}
                        label="Player ship"
                        className="td-ship"
                      >
                        ▰
                      </Selectable>
                    )}
                </div>
                {moons.map((m, mi) => {
                  const mp = {
                    left:
                      pp.left + Math.cos((m.Orbit.AngleDegrees * Math.PI) / 180) * (30 + mi * 12),
                    top: pp.top + Math.sin((m.Orbit.AngleDegrees * Math.PI) / 180) * (30 + mi * 12),
                  };
                  return (
                    <div className="td-object td-moon" style={mp} key={m.Id}>
                      <Selectable
                        id={m.Id}
                        selected={selected}
                        onSelect={select}
                        label={displayName(details(m.Id, sector), preview) ?? 'Moon'}
                      >
                        <span />
                      </Selectable>
                      {sector.PlayerShip.CurrentLocationId === m.Id &&
                        visible(sector.PlayerShip.Id, sector, preview) && (
                          <Selectable
                            id={sector.PlayerShip.Id}
                            selected={selected}
                            onSelect={select}
                            label="Player ship"
                            className="td-ship"
                          >
                            ▰
                          </Selectable>
                        )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
