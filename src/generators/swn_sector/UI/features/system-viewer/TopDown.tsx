import { useEffect, useRef, useState } from 'react';
import type { Preview } from '../../application/appState';
import type { DisplaySectorDTO, DisplaySelectableDTO } from '../../../DisplayDTO/dto';
import { areAdjacentHexes } from '../../hex_geometry';
import { isVisibleToPlayerDisplay } from '../../visibility_presentation';
import { StarGlyph } from './StarGlyph';
import { PolityFlagList } from '../politics/PolityFlag';

function poiMarker(poi: DisplaySelectableDTO) {
  return poi.habitablePoi?.marker ?? '◆';
}

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
function visible(id: string, display: DisplaySectorDTO, preview: Preview) {
  return preview === 'gm' || isVisibleToPlayerDisplay(display, id);
}
function details(id: string, display: DisplaySectorDTO) {
  return display.entities[id];
}
function displayName(info: DisplaySelectableDTO | undefined, preview: Preview) {
  if (!info) return undefined;
  const preferredName =
    preview === 'player' && !info.visibility.PoliticsScan ? info.proceduralName : info.niceName;
  return preferredName.trim() || info.proceduralName;
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

function OtherObjectGlyph({ object }: { object: DisplaySelectableDTO }) {
  const glyphClass = `other-object-glyph td-other-object-glyph ${object.spatial?.glyphClass ?? ''}`;
  return (
    <span className={glyphClass} aria-hidden="true">
      {(object.otherObjectType === 'AsteroidBelt' || object.otherObjectType === 'KuiperBelt') &&
        Array.from({ length: 5 }, (_, index) => <span key={index} />)}
    </span>
  );
}

export function TopDown({
  systemId,
  display,
  selected,
  select,
  preview,
  showTemperatureOverlay,
  showPolityOverlay = false,
}: {
  systemId: string;
  display: DisplaySectorDTO;
  selected: string | null;
  select: (id: string) => void;
  preview: Preview;
  showTemperatureOverlay: boolean;
  showPolityOverlay?: boolean;
}) {
  const system = display.systems.find((candidate) => candidate.id === systemId)!;
  const spatialAu = (id: string) => display.entities[id].spatial!.effectiveAu;
  const visibleDirectObjects = system.objectIds
    .map((id) => display.entities[id])
    .filter((object) => !object.spatial?.parentId && visible(object.id, display, preview));
  const visiblePlanets = visibleDirectObjects.filter((object) => object.kind === 'Planet');
  const visibleOtherObjects = visibleDirectObjects.filter(
    (object) => object.kind === 'OtherCelestialObject',
  );
  const shellRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState(320);
  const [shellSize, setShellSize] = useState({ width: 320, height: 320 });
  const c = mapSize / 2;
  const hexWidth = mapSize * BAKED_TOP_DOWN.centralHexWidth;
  const hexHeight = (hexWidth * 98) / 112;
  const systemSize = mapSize * BAKED_TOP_DOWN.systemDetailScale;
  const spikeBoundaryRadius = (systemSize / 2) * TOP_DOWN_BOUNDARY_FILL;
  const spatial = system.spatial;
  const starDisplay = system.star;
  const pixelsPerAu = spikeBoundaryRadius / spatial.systemEdgeAu;
  const [normalTemperatureInnerAu, normalTemperatureOuterAu] = spatial.normalTemperatureAuBand;
  const normalTemperatureInnerRadius = normalTemperatureInnerAu * pixelsPerAu;
  const normalTemperatureOuterRadius = normalTemperatureOuterAu * pixelsPerAu;
  const isRemnantStar = spatial.normalTemperatureBandEmpty;
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
  const routes = display.routeIds.flatMap((routeId) => {
    const route = display.entities[routeId];
    if (!visible(routeId, display, preview)) return [];
    const projected = route.route;
    const currentIndex = projected?.endpointSystemIds.indexOf(system.id) ?? -1;
    if (!projected || currentIndex < 0) return [];
    const destination = display.systems.find(
      (candidate) => candidate.id === projected.endpointSystemIds[1 - currentIndex],
    );
    if (!destination || !visible(destination.id, display, preview)) return [];
    const from = hexMapPosition(spatial.hexLocation.Column, spatial.hexLocation.Row);
    const to = hexMapPosition(
      destination.spatial.hexLocation.Column,
      destination.spatial.hexLocation.Row,
    );
    return [
      {
        route,
        destinationName: projected.topDownDestinations[1 - currentIndex],
        angle: (Math.atan2(to.top - from.top, to.left - from.left) * 180) / Math.PI,
      },
    ];
  });
  const adjacentHexes = [-1, 0, 1]
    .flatMap((xOffset) =>
      [-1, 0, 1].map((yOffset) => ({
        Column: spatial.hexLocation.Column + xOffset,
        Row: spatial.hexLocation.Row + yOffset,
      })),
    )
    .filter((hex) => areAdjacentHexes(spatial.hexLocation, hex));
  const adjacentSystems = display.systems.filter(
    (candidate) =>
      candidate.id !== system.id &&
      visible(candidate.id, display, preview) &&
      areAdjacentHexes(spatial.hexLocation, candidate.spatial.hexLocation),
  );
  const neighboringHexPosition = (hex: { Column: number; Row: number }) => {
    const center = hexMapPosition(spatial.hexLocation.Column, spatial.hexLocation.Row);
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
    [...system.poiIds, ...system.habitablePoiIds]
      .map((id) => display.entities[id])
      .filter(
        (poi) =>
          (poi.poi?.hostId === parentId || poi.habitablePoi?.hostId === parentId) &&
          poi.habitablePoi?.absent !== true &&
          visible(poi.id, display, preview),
      );
  const polityFlags = (object: DisplaySelectableDTO) =>
    showPolityOverlay && (preview === 'gm' || object.visibility.PoliticsScan) ? (
      <PolityFlagList
        polities={object.claims?.claimants ?? []}
        className="polity-overlay-flags topdown-polity-flags"
      />
    ) : null;
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
            {[spatial.hexLocation, ...adjacentHexes].map((hex) => {
              const point =
                hex.Column === spatial.hexLocation.Column && hex.Row === spatial.hexLocation.Row
                  ? { left: c, top: c }
                  : neighboringHexPosition(hex);
              return <polygon key={`${hex.Column}-${hex.Row}`} points={hexPoints(point)} />;
            })}
          </svg>
          {visibleOtherObjects
            .filter((object) => object.otherObjectType === 'GasCloud')
            .map((object) => {
              const innerRadius = spatialAu(object.id) * pixelsPerAu;
              const shellCenterX = shellSize.width / 2;
              const shellCenterY = shellSize.height / 2;
              const hex = hexPoints({ left: shellCenterX, top: shellCenterY });
              const patternId = `gas-cloud-cross-${object.id}`;
              const maskId = `gas-cloud-mask-${object.id}`;
              const patternSize = 18;
              const objectName = displayName(details(object.id, display), preview) ?? 'Gas cloud';
              const hexPath = `M ${hex.replaceAll(' ', ' L ')} Z`;
              const innerCirclePath =
                innerRadius > 0
                  ? `M ${shellCenterX + innerRadius} ${shellCenterY} A ${innerRadius} ${innerRadius} 0 1 0 ${shellCenterX - innerRadius} ${shellCenterY} A ${innerRadius} ${innerRadius} 0 1 0 ${shellCenterX + innerRadius} ${shellCenterY} Z`
                  : '';
              const selectableRegionPath = `${hexPath} ${innerCirclePath}`;
              const crossPath = `M ${patternSize * 0.4} ${patternSize * 0.15} H ${patternSize * 0.6} V ${patternSize * 0.4} H ${patternSize * 0.85} V ${patternSize * 0.6} H ${patternSize * 0.6} V ${patternSize * 0.85} H ${patternSize * 0.4} V ${patternSize * 0.6} H ${patternSize * 0.15} V ${patternSize * 0.4} H ${patternSize * 0.4} Z`;
              return (
                <svg
                  key={`gas-cloud-field-${object.id}`}
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
                  aria-pressed={selected === object.id}
                  onClick={() => select(object.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      select(object.id);
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
                  {selected === object.id && (
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
          {routes.map(({ route, destinationName, angle }) => {
            const routePosition = pos(angle, spikeBoundaryRadius);
            return (
              <div key={route.id} className="td-route" style={routePosition}>
                <Selectable
                  id={route.id}
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
              object.kind === 'OtherCelestialObject' &&
              (object.otherObjectType === 'AsteroidBelt' ||
                object.otherObjectType === 'KuiperBelt' ||
                object.otherObjectType === 'GasCloud')
            )
              return null;
            const orbitRadius = spatialAu(object.id) * pixelsPerAu;
            return (
              <svg
                key={`orbit-${object.id}`}
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
                object.otherObjectType === 'AsteroidBelt' ||
                object.otherObjectType === 'KuiperBelt',
            )
            // Paint outer bands first so an inner belt remains the topmost hit target
            // wherever their cosmetic widths overlap.
            .sort((left, right) => spatialAu(right.id) - spatialAu(left.id))
            .map((object) => {
              const settings =
                object.otherObjectType === 'AsteroidBelt'
                  ? BELT_APPEARANCE.asteroid
                  : BELT_APPEARANCE.kuiper;
              const radius = spatialAu(object.id) * pixelsPerAu;
              const outerRadius = radius + settings.widthPx / 2;
              const innerRadius = Math.max(0, radius - settings.widthPx / 2);
              const diameter = outerRadius * 2;
              const patternId = `belt-cross-${object.id}`;
              const maskId = `belt-mask-${object.id}`;
              const name =
                displayName(details(object.id, display), preview) ?? object.otherObjectType;
              const circlePath = (circleRadius: number) =>
                circleRadius > 0
                  ? `M ${outerRadius + circleRadius} ${outerRadius} A ${circleRadius} ${circleRadius} 0 1 0 ${outerRadius - circleRadius} ${outerRadius} A ${circleRadius} ${circleRadius} 0 1 0 ${outerRadius + circleRadius} ${outerRadius} Z`
                  : '';
              const annulusPath = `${circlePath(outerRadius)} ${circlePath(innerRadius)}`;
              return (
                <svg
                  key={`belt-ring-${object.id}`}
                  className={`td-belt-ring${selected === object.id ? ' selected' : ''}`}
                  width={diameter}
                  height={diameter}
                  viewBox={`0 0 ${diameter} ${diameter}`}
                  style={{ left: c - outerRadius, top: c - outerRadius }}
                  role="button"
                  tabIndex={0}
                  aria-label={name}
                  aria-pressed={selected === object.id}
                  pointerEvents="none"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      select(object.id);
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
                  {selected === object.id && (
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
                      select(object.id);
                    }}
                  />
                </svg>
              );
            })}
          <div className="td-object td-star" style={{ left: c, top: c }}>
            <Selectable
              id={system.id}
              selected={selected}
              onSelect={select}
              label={`System ${displayName(details(system.id, display), preview) ?? 'System'}`}
              className={`td-star-button ${starDisplay.className}`}
              style={starDisplay.styleTokens}
            >
              <StarGlyph recipe={starDisplay.recipe} />
            </Selectable>
            {objectPois(system.starId).length > 0 && (
              <div className="topdown-poi-list">
                {objectPois(system.starId).map((poi) => (
                  <Selectable
                    key={poi.id}
                    id={poi.id}
                    selected={selected}
                    onSelect={select}
                    label={displayName(details(poi.id, display), preview) ?? 'POI'}
                    title={displayName(details(poi.id, display), preview) ?? 'POI'}
                    className="topdown-poi"
                  >
                    {poiMarker(poi)}
                  </Selectable>
                ))}
              </div>
            )}
            {display.playerShipLocationId === system.starId &&
              visible(display.playerShipId, display, preview) && (
                <Selectable
                  id={display.playerShipId}
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
            const point = neighboringHexPosition(candidate.spatial.hexLocation);
            const name = displayName(details(candidate.id, display), preview) ?? 'System';
            return (
              <button
                key={candidate.id}
                type="button"
                aria-label={`Adjacent system ${name}`}
                aria-pressed={selected === candidate.id}
                className={`td-adjacent-hex ${selected === candidate.id ? 'selected' : ''}`}
                style={{ left: point.left, top: point.top, width: hexWidth, height: hexHeight }}
                onClick={() => select(candidate.id)}
              />
            );
          })}
          {visiblePlanets.map((p) => {
            const pp = pos(p.spatial!.angleDegrees, spatialAu(p.id) * pixelsPerAu);
            const planetName = displayName(details(p.id, display), preview);
            const moons = system.objectIds
              .map((id) => display.entities[id])
              .filter((m) => m.kind === 'Planet')
              .filter((m) => m.spatial?.parentId === p.id && visible(m.id, display, preview));
            return (
              <div key={p.id}>
                <div className="td-object" style={pp}>
                  {polityFlags(p)}
                  <Selectable
                    id={p.id}
                    selected={selected}
                    onSelect={select}
                    label={planetName ?? 'Planet'}
                  >
                    <span className={`td-planet ${p.planet!.colorClass}`} />
                  </Selectable>
                  <label className="topdown-planet-caption">
                    {moons.length === 0 && <strong>{planetName}</strong>}
                  </label>
                  {objectPois(p.id).length > 0 && (
                    <div className="topdown-poi-list">
                      {objectPois(p.id).map((poi) => (
                        <Selectable
                          key={poi.id}
                          id={poi.id}
                          selected={selected}
                          onSelect={select}
                          label={displayName(details(poi.id, display), preview) ?? 'POI'}
                          title={displayName(details(poi.id, display), preview) ?? 'POI'}
                          className="topdown-poi"
                        >
                          {poiMarker(poi)}
                        </Selectable>
                      ))}
                    </div>
                  )}
                  {display.playerShipLocationId === p.id &&
                    visible(display.playerShipId, display, preview) && (
                      <Selectable
                        id={display.playerShipId}
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
                      pp.left +
                      Math.cos((m.spatial!.angleDegrees * Math.PI) / 180) * (30 + mi * 12),
                    top:
                      pp.top + Math.sin((m.spatial!.angleDegrees * Math.PI) / 180) * (30 + mi * 12),
                  };
                  return (
                    <div className="td-object td-moon" style={mp} key={m.id}>
                      {polityFlags(m)}
                      <Selectable
                        id={m.id}
                        selected={selected}
                        onSelect={select}
                        label={displayName(details(m.id, display), preview) ?? 'Moon'}
                      >
                        <span className={m.planet!.colorClass} />
                      </Selectable>
                      {display.playerShipLocationId === m.id &&
                        visible(display.playerShipId, display, preview) && (
                          <Selectable
                            id={display.playerShipId}
                            selected={selected}
                            onSelect={select}
                            label="Player ship"
                            className="td-ship"
                          >
                            ▰
                          </Selectable>
                        )}
                      <label className="topdown-moon-caption">
                        <strong>{displayName(details(m.id, display), preview)}</strong>
                      </label>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {visibleOtherObjects.map((object) => {
            const pp = pos(object.spatial!.angleDegrees, spatialAu(object.id) * pixelsPerAu);
            const objectName = displayName(details(object.id, display), preview);
            const beltPoiHost =
              object.otherObjectType === 'AsteroidBelt' || object.otherObjectType === 'KuiperBelt';
            const radialPoiHost = beltPoiHost || object.otherObjectType === 'GasCloud';
            return (
              <div
                className={`td-object td-other-object${object.otherObjectType === 'GasCloud' ? ' td-gas-cloud-object' : ''}`}
                style={pp}
                key={object.id}
              >
                {polityFlags(object)}
                {!beltPoiHost && object.otherObjectType !== 'GasCloud' && (
                  <Selectable
                    id={object.id}
                    selected={selected}
                    onSelect={select}
                    label={objectName ?? object.otherObjectType ?? 'Object'}
                    className="td-other-object-button"
                  >
                    <OtherObjectGlyph object={object} />
                  </Selectable>
                )}
                {!beltPoiHost && object.otherObjectType !== 'GasCloud' && (
                  <label className="topdown-object-caption">
                    <strong>{objectName}</strong>
                  </label>
                )}
                {!radialPoiHost && objectPois(object.id).length > 0 && (
                  <div className="topdown-poi-list">
                    {objectPois(object.id).map((poi) => (
                      <Selectable
                        key={poi.id}
                        id={poi.id}
                        selected={selected}
                        onSelect={select}
                        label={displayName(details(poi.id, display), preview) ?? 'POI'}
                        title={displayName(details(poi.id, display), preview) ?? 'POI'}
                        className="topdown-poi"
                      >
                        {poiMarker(poi)}
                      </Selectable>
                    ))}
                  </div>
                )}
                {radialPoiHost &&
                  objectPois(object.id).map((poi) => {
                    const absolutePosition = pos(
                      poi.angleDegrees ?? 0,
                      spatialAu(object.id) * pixelsPerAu,
                    );
                    const poiPosition = {
                      left: absolutePosition.left - pp.left,
                      top: absolutePosition.top - pp.top,
                    };
                    return (
                      <div className="td-radial-poi" style={poiPosition} key={poi.id}>
                        <Selectable
                          id={poi.id}
                          selected={selected}
                          onSelect={select}
                          label={displayName(details(poi.id, display), preview) ?? 'POI'}
                          title={displayName(details(poi.id, display), preview) ?? 'POI'}
                          className="topdown-poi"
                        >
                          {poiMarker(poi)}
                        </Selectable>
                      </div>
                    );
                  })}
                {display.playerShipLocationId === object.id &&
                  visible(display.playerShipId, display, preview) && (
                    <Selectable
                      id={display.playerShipId}
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
