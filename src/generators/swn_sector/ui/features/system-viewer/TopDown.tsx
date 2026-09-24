import { useEffect, useRef, useState } from 'react';
import type { Preview } from '../../application/appState';
import type { OtherCelestialObject, Sector, StarSystem } from '../../../merged_schema';
import { normalTemperatureAuBand, systemEdgeAu } from '../../../generation_rules';
import { VisibilityLevel, visibilityRank } from '../../domain/sector/visibility';
import {
  areAdjacentHexes,
  findDetails,
  isVisibleToPlayer,
  planets,
  routeHasEndpointInSystem,
  routeSystems,
} from '../../domain/sector/selectors';
import { planetColorClass } from '../../../planet_presentation';
import { starPresentationClass, starPresentationStyle } from '../../../star_presentation';
import { StarGlyph } from './StarGlyph';

const TOP_DOWN_BOUNDARY_FILL = 0.88;
const BELT_APPEARANCE = {
  asteroid: { widthPx: 15, crossSizePx: 6, color: '#b98958', alpha: 0.5 },
  kuiper: { widthPx: 24, crossSizePx: 33, color: '#8fd8ed', alpha: 0.5 },
} as const;
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
  centralHexWidth: 1.11,
  systemDetailScale: 1.06,
} as const;
function visible(id: string, sector: Sector, preview: Preview) {
  return preview === 'gm' || isVisibleToPlayer(sector, id);
}
function details(id: string, sector: Sector) {
  return findDetails(sector, id);
}
function displayName(info: ReturnType<typeof findDetails>, preview: Preview) {
  if (!info) return undefined;
  const preferredName =
    preview === 'player' &&
    visibilityRank(info.VisibilityLevel) < visibilityRank(VisibilityLevel.CULTURE_PARTIAL)
      ? info.ProceduralName
      : info.NiceName;
  return preferredName.trim() || info.ProceduralName;
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

function OtherObjectGlyph({ object }: { object: OtherCelestialObject }) {
  const glyphClass = `other-object-glyph td-other-object-glyph other-object-${object.ObjectType.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;
  return (
    <span className={glyphClass} aria-hidden="true">
      {(object.ObjectType === 'AsteroidBelt' || object.ObjectType === 'KuiperBelt') &&
        Array.from({ length: 5 }, (_, index) => <span key={index} />)}
    </span>
  );
}

export function TopDown({
  system,
  sector,
  selected,
  select,
  preview,
  showTemperatureOverlay,
}: {
  system: StarSystem;
  sector: Sector;
  selected: string | null;
  select: (id: string) => void;
  preview: Preview;
  showTemperatureOverlay: boolean;
}) {
  const visibleDirectObjects = system.Objects.filter(
    (object) => !object.Orbit.ParentObjectId && visible(object.Id, sector, preview),
  );
  const visiblePlanets = visibleDirectObjects.filter(
    (object): object is Extract<(typeof system.Objects)[number], { Kind: 'Planet' }> =>
      object.Kind === 'Planet',
  );
  const visibleOtherObjects = visibleDirectObjects.filter(
    (object): object is OtherCelestialObject => object.Kind === 'OtherCelestialObject',
  );
  const shellRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState(320);
  const [shellSize, setShellSize] = useState({ width: 320, height: 320 });
  const c = mapSize / 2;
  const hexWidth = mapSize * BAKED_TOP_DOWN.centralHexWidth;
  const hexHeight = (hexWidth * 98) / 112;
  const systemSize = mapSize * BAKED_TOP_DOWN.systemDetailScale;
  const spikeBoundaryRadius = (systemSize / 2) * TOP_DOWN_BOUNDARY_FILL;
  const pixelsPerAu = spikeBoundaryRadius / systemEdgeAu(system.Star.StarType);
  const [normalTemperatureInnerAu, normalTemperatureOuterAu] = normalTemperatureAuBand(
    system.Star.StarType,
  );
  const normalTemperatureInnerRadius = normalTemperatureInnerAu * pixelsPerAu;
  const normalTemperatureOuterRadius = normalTemperatureOuterAu * pixelsPerAu;
  const isRemnantStar = normalTemperatureInnerAu === normalTemperatureOuterAu;
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
  const objectPois = (parentId: string) =>
    system.PointsOfInterest.filter(
      (poi) => poi.ParentObjectId === parentId && visible(poi.Id, sector, preview),
    );
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const updateSize = () => {
      const width = shell.clientWidth;
      const height = shell.clientHeight;
      setShellSize({ width, height });
      setMapSize(Math.max(0, Math.min(width - 24, height - 24)));
    };
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
          </svg>
          {visibleOtherObjects
            .filter((object) => object.ObjectType === 'GasCloud')
            .map((object) => {
              const innerRadius = object.Orbit.AU * pixelsPerAu;
              const shellCenterX = shellSize.width / 2;
              const shellCenterY = shellSize.height / 2;
              const hex = hexPoints({ left: shellCenterX, top: shellCenterY });
              const patternId = `gas-cloud-cross-${object.Id}`;
              const maskId = `gas-cloud-mask-${object.Id}`;
              const patternSize = 18;
              const objectName = displayName(details(object.Id, sector), preview) ?? 'Gas cloud';
              const hexPath = `M ${hex.replaceAll(' ', ' L ')} Z`;
              const innerCirclePath =
                innerRadius > 0
                  ? `M ${shellCenterX + innerRadius} ${shellCenterY} A ${innerRadius} ${innerRadius} 0 1 0 ${shellCenterX - innerRadius} ${shellCenterY} A ${innerRadius} ${innerRadius} 0 1 0 ${shellCenterX + innerRadius} ${shellCenterY} Z`
                  : '';
              const selectableRegionPath = `${hexPath} ${innerCirclePath}`;
              const crossPath = `M ${patternSize * 0.4} ${patternSize * 0.15} H ${patternSize * 0.6} V ${patternSize * 0.4} H ${patternSize * 0.85} V ${patternSize * 0.6} H ${patternSize * 0.6} V ${patternSize * 0.85} H ${patternSize * 0.4} V ${patternSize * 0.6} H ${patternSize * 0.15} V ${patternSize * 0.4} H ${patternSize * 0.4} Z`;
              return (
                <svg
                  key={`gas-cloud-field-${object.Id}`}
                  className="td-gas-cloud-field"
                  width={shellSize.width}
                  height={shellSize.height}
                  viewBox={`0 0 ${shellSize.width} ${shellSize.height}`}
                  style={{
                    left: (mapSize - shellSize.width) / 2,
                    top: (mapSize - shellSize.height) / 2,
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={objectName}
                  aria-pressed={selected === object.Id}
                  onClick={() => select(object.Id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      select(object.Id);
                    }
                  }}
                >
                  <defs>
                    <pattern
                      id={patternId}
                      width={patternSize}
                      height={patternSize}
                      patternUnits="userSpaceOnUse"
                    >
                      <path d={crossPath} fill="#4b286b" />
                    </pattern>
                    <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                      <rect width={shellSize.width} height={shellSize.height} fill="black" />
                      <polygon points={hex} fill="white" />
                      <circle cx={shellCenterX} cy={shellCenterY} r={innerRadius} fill="black" />
                    </mask>
                  </defs>
                  <g mask={`url(#${maskId})`} opacity={0.25} pointerEvents="none">
                    <rect
                      width={shellSize.width}
                      height={shellSize.height}
                      fill={`url(#${patternId})`}
                    />
                  </g>
                  {selected === object.Id && (
                    <path
                      d={selectableRegionPath}
                      fill="none"
                      stroke="#c38be0"
                      strokeWidth={2}
                      fillRule="evenodd"
                      pointerEvents="none"
                    />
                  )}
                  <path
                    className="gas-cloud-select-region"
                    d={selectableRegionPath}
                    fill="transparent"
                    fillRule="evenodd"
                  />
                </svg>
              );
            })}
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
          {showTemperatureOverlay && (
            <svg
              className="temperature-boundaries"
              aria-hidden="true"
              style={{
                width: spikeBoundaryRadius * 2,
                height: spikeBoundaryRadius * 2,
                left: c - spikeBoundaryRadius,
                top: c - spikeBoundaryRadius,
              }}
            >
              {isRemnantStar ? (
                <circle
                  cx={spikeBoundaryRadius}
                  cy={spikeBoundaryRadius}
                  r={normalTemperatureInnerRadius}
                  fill="none"
                  stroke="#ffe39a"
                  strokeWidth={2}
                />
              ) : (
                <>
                  <circle
                    cx={spikeBoundaryRadius}
                    cy={spikeBoundaryRadius}
                    r={normalTemperatureInnerRadius}
                    fill="none"
                    stroke="#8ef0c4"
                    strokeWidth={2}
                    strokeDasharray="2 6"
                  />
                  <circle
                    cx={spikeBoundaryRadius}
                    cy={spikeBoundaryRadius}
                    r={normalTemperatureOuterRadius}
                    fill="none"
                    stroke="#8ef0c4"
                    strokeWidth={2}
                    strokeDasharray="2 6"
                  />
                </>
              )}
            </svg>
          )}
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
          {visibleDirectObjects.map((object) => {
            if (
              object.Kind === 'OtherCelestialObject' &&
              (object.ObjectType === 'AsteroidBelt' ||
                object.ObjectType === 'KuiperBelt' ||
                object.ObjectType === 'GasCloud')
            )
              return null;
            const orbitRadius = object.Orbit.AU * pixelsPerAu;
            return (
              <svg
                key={`orbit-${object.Id}`}
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
          {visibleOtherObjects
            .filter(
              (object) =>
                object.ObjectType === 'AsteroidBelt' || object.ObjectType === 'KuiperBelt',
            )
            // Paint outer bands first so an inner belt remains the topmost hit target
            // wherever their cosmetic widths overlap.
            .sort((left, right) => right.Orbit.AU - left.Orbit.AU)
            .map((object) => {
              const settings =
                object.ObjectType === 'AsteroidBelt'
                  ? BELT_APPEARANCE.asteroid
                  : BELT_APPEARANCE.kuiper;
              const radius = object.Orbit.AU * pixelsPerAu;
              const outerRadius = radius + settings.widthPx / 2;
              const innerRadius = Math.max(0, radius - settings.widthPx / 2);
              const diameter = outerRadius * 2;
              const patternId = `belt-cross-${object.Id}`;
              const maskId = `belt-mask-${object.Id}`;
              const name = displayName(details(object.Id, sector), preview) ?? object.ObjectType;
              const circlePath = (circleRadius: number) =>
                circleRadius > 0
                  ? `M ${outerRadius + circleRadius} ${outerRadius} A ${circleRadius} ${circleRadius} 0 1 0 ${outerRadius - circleRadius} ${outerRadius} A ${circleRadius} ${circleRadius} 0 1 0 ${outerRadius + circleRadius} ${outerRadius} Z`
                  : '';
              const annulusPath = `${circlePath(outerRadius)} ${circlePath(innerRadius)}`;
              return (
                <svg
                  key={`belt-ring-${object.Id}`}
                  className={`td-belt-ring${selected === object.Id ? ' selected' : ''}`}
                  width={diameter}
                  height={diameter}
                  viewBox={`0 0 ${diameter} ${diameter}`}
                  style={{ left: c - outerRadius, top: c - outerRadius }}
                  role="button"
                  tabIndex={0}
                  aria-label={name}
                  aria-pressed={selected === object.Id}
                  pointerEvents="none"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      select(object.Id);
                    }
                  }}
                >
                  <defs>
                    <pattern
                      id={patternId}
                      width={settings.crossSizePx}
                      height={settings.crossSizePx}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${settings.crossSizePx * 0.4} ${settings.crossSizePx * 0.15} H ${settings.crossSizePx * 0.6} V ${settings.crossSizePx * 0.4} H ${settings.crossSizePx * 0.85} V ${settings.crossSizePx * 0.6} H ${settings.crossSizePx * 0.6} V ${settings.crossSizePx * 0.85} H ${settings.crossSizePx * 0.4} V ${settings.crossSizePx * 0.6} H ${settings.crossSizePx * 0.15} V ${settings.crossSizePx * 0.4} H ${settings.crossSizePx * 0.4} Z`}
                        fill={settings.color}
                      />
                    </pattern>
                    <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                      <rect width={diameter} height={diameter} fill="black" />
                      <circle cx={outerRadius} cy={outerRadius} r={outerRadius} fill="white" />
                      <circle cx={outerRadius} cy={outerRadius} r={innerRadius} fill="black" />
                    </mask>
                  </defs>
                  <g opacity={settings.alpha} pointerEvents="none">
                    <rect
                      width={diameter}
                      height={diameter}
                      fill={settings.color}
                      fillOpacity={0.22}
                      mask={`url(#${maskId})`}
                    />
                    <rect
                      width={diameter}
                      height={diameter}
                      fill={`url(#${patternId})`}
                      mask={`url(#${maskId})`}
                    />
                  </g>
                  {selected === object.Id && (
                    <g pointerEvents="none">
                      <circle
                        cx={outerRadius}
                        cy={outerRadius}
                        r={innerRadius}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                      <circle
                        cx={outerRadius}
                        cy={outerRadius}
                        r={outerRadius}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    </g>
                  )}
                  <path
                    className="belt-select-region"
                    d={annulusPath}
                    fill="transparent"
                    fillRule="evenodd"
                    onClick={(event) => {
                      event.stopPropagation();
                      select(object.Id);
                    }}
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
              className={`td-star-button ${starPresentationClass(system.Star.StarType)}`}
              style={starPresentationStyle(system.Star.StarType)}
            >
              <StarGlyph starType={system.Star.StarType} />
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
            const planetName = displayName(details(p.Id, sector), preview);
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
                    label={planetName ?? 'Planet'}
                  >
                    <span className={`td-planet ${planetColorClass(p)}`} />
                  </Selectable>
                  <label className="topdown-planet-caption">
                    <strong>{planetName}</strong>
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
                        <span className={planetColorClass(m)} />
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
          {visibleOtherObjects.map((object) => {
            const pp = pos(object.Orbit.AngleDegrees, object.Orbit.AU * pixelsPerAu);
            const objectName = displayName(details(object.Id, sector), preview);
            const beltPoiHost =
              object.ObjectType === 'AsteroidBelt' || object.ObjectType === 'KuiperBelt';
            const radialPoiHost = beltPoiHost || object.ObjectType === 'GasCloud';
            return (
              <div
                className={`td-object td-other-object${object.ObjectType === 'GasCloud' ? ' td-gas-cloud-object' : ''}`}
                style={pp}
                key={object.Id}
              >
                {!beltPoiHost && object.ObjectType !== 'GasCloud' && (
                  <Selectable
                    id={object.Id}
                    selected={selected}
                    onSelect={select}
                    label={objectName ?? object.ObjectType}
                    className="td-other-object-button"
                  >
                    <OtherObjectGlyph object={object} />
                  </Selectable>
                )}
                {!beltPoiHost && object.ObjectType !== 'GasCloud' && (
                  <label className="topdown-object-caption">
                    <strong>{objectName}</strong>
                  </label>
                )}
                {!radialPoiHost && objectPois(object.Id).length > 0 && (
                  <div className="topdown-poi-list">
                    {objectPois(object.Id).map((poi) => (
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
                {radialPoiHost &&
                  objectPois(object.Id).map((poi) => {
                    const absolutePosition = pos(poi.AngleDegrees, object.Orbit.AU * pixelsPerAu);
                    const poiPosition = {
                      left: absolutePosition.left - pp.left,
                      top: absolutePosition.top - pp.top,
                    };
                    return (
                      <div className="td-radial-poi" style={poiPosition} key={poi.Id}>
                        <Selectable
                          id={poi.Id}
                          selected={selected}
                          onSelect={select}
                          label={displayName(details(poi.Id, sector), preview) ?? 'POI'}
                          title={displayName(details(poi.Id, sector), preview) ?? 'POI'}
                          className="topdown-poi"
                        >
                          ◆
                        </Selectable>
                      </div>
                    );
                  })}
                {sector.PlayerShip.CurrentLocationId === object.Id &&
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
      </div>
    </div>
  );
}
