import { VisibilityLevel, visibilityRank } from '../../domain/sector/visibility';
import type { Sector } from '../../../merged_schema';
import type { Preview } from '../../application/appState';
import {
  findContainingSystem,
  findDetails,
  isVisibleToPlayer,
  routeSystems,
} from '../../domain/sector/selectors';
import { starPresentationClass, starPresentationStyle } from '../../../star_presentation';
import { StarGlyph } from '../system-viewer/StarGlyph';

const BAKED_HEXMAP = {
  hexSize: 106,
  topMargin: 21,
  leftMargin: 36,
} as const;

function visible(id: string, sector: Sector, preview: Preview) {
  return preview === 'gm' || isVisibleToPlayer(sector, id);
}
function name(id: string, sector: Sector, preview: Preview) {
  const d = findDetails(sector, id);
  if (!d) return undefined;
  return preview === 'player' &&
    visibilityRank(d.VisibilityLevel) < visibilityRank(VisibilityLevel.CULTURE_PARTIAL)
    ? d.ProceduralName
    : d.NiceName;
}
function position(x: number, y: number) {
  const scale = BAKED_HEXMAP.hexSize / 112;
  const hexHeight = BAKED_HEXMAP.hexSize * (98 / 112);
  return {
    left: BAKED_HEXMAP.leftMargin + BAKED_HEXMAP.hexSize / 2 + (x - 1) * 84 * scale,
    top: BAKED_HEXMAP.topMargin + hexHeight / 2 + ((y - 1) * 98 + ((x - 1) % 2) * 49) * scale,
  };
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

export function HexMap({
  sector,
  selected,
  select,
  preview,
}: {
  sector: Sector;
  selected: string | null;
  select: (id: string | null) => void;
  preview: Preview;
}) {
  const scale = BAKED_HEXMAP.hexSize / 112;
  const hexHeight = BAKED_HEXMAP.hexSize * (98 / 112);
  const mapWidth = BAKED_HEXMAP.leftMargin + (1036 - 44) * scale;
  const mapHeight = BAKED_HEXMAP.topMargin + (778 - 6) * scale;
  return (
    <div className="hex-wrap" onClick={() => select(null)}>
      <div
        className="hex-map"
        role="group"
        aria-label="Sector map"
        style={{ width: mapWidth, height: mapHeight }}
      >
        <svg className="routes" viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
          {sector.Routes.filter((r) => visible(r.Id, sector, preview)).map((route) => {
            const endpoints = routeSystems(sector, route);
            const a = endpoints?.[0],
              b = endpoints?.[1];
            if (!a || !b || !visible(a.Id, sector, preview) || !visible(b.Id, sector, preview))
              return null;
            const p1 = position(a.HexLocation.Column, a.HexLocation.Row),
              p2 = position(b.HexLocation.Column, b.HexLocation.Row);
            return (
              <line
                key={route.Id}
                x1={p1.left}
                y1={p1.top}
                x2={p2.left}
                y2={p2.top}
                className={selected === route.Id ? 'selected' : ''}
                onClick={(e) => {
                  e.stopPropagation();
                  select(route.Id);
                }}
              />
            );
          })}
        </svg>
        {Array.from({ length: 77 }, (_, i) => {
          const x = (i % 11) + 1,
            y = Math.floor(i / 11) + 1;
          return (
            <div
              key={i}
              className="hex-cell"
              style={{
                ...position(x, y),
                width: BAKED_HEXMAP.hexSize,
                height: hexHeight,
              }}
            />
          );
        })}
        {sector.Systems.filter((s) => visible(s.Id, sector, preview)).map((system) => {
          const p = position(system.HexLocation.Column, system.HexLocation.Row);
          const label = name(system.Id, sector, preview) ?? 'System';
          const shipHere =
            findContainingSystem(sector, sector.PlayerShip.CurrentLocationId)?.Id === system.Id &&
            visible(sector.PlayerShip.Id, sector, preview);
          return (
            <div
              className="system-pin"
              key={system.Id}
              style={{ ...p, ...starPresentationStyle(system.Star.StarType) }}
            >
              <Selectable
                id={system.Id}
                selected={selected}
                onSelect={select}
                label={`System ${label}`}
                className={`star-pin ${starPresentationClass(system.Star.StarType)}`}
              >
                <StarGlyph starType={system.Star.StarType} />
              </Selectable>
              <label className="system-name-label system-map-caption">
                <strong>{label}</strong>
              </label>
              {shipHere && (
                <Selectable
                  id={sector.PlayerShip.Id}
                  selected={selected}
                  onSelect={select}
                  label="Player ship"
                  className="ship-token"
                >
                  ▰
                </Selectable>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
