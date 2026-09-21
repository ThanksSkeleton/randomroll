import { VisibilityLevel, visibilityRank } from '../../domain/sector/model';
import type { Sector } from '../../domain/sector/model';
import type { Preview } from '../../application/appState';
import { findContainingSystem, findDetails, isVisibleToPlayer, routeSystems } from '../../domain/sector/selectors';

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
  return { left: 100 + (x - 1) * 84, top: 55 + (y - 1) * 98 + ((x - 1) % 2) * 49 };
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
  return (
    <div className="hex-wrap" onClick={() => select(null)}>
      <div className="hex-map" role="group" aria-label="Sector map">
        <svg className="routes" viewBox="0 0 1000 850" preserveAspectRatio="none">
          {sector.Routes.filter((r) => visible(r.Id, sector, preview)).map((route) => {
            const endpoints = routeSystems(sector, route);
            const a = endpoints?.[0], b = endpoints?.[1];
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
        {Array.from({ length: 80 }, (_, i) => {
          const x = (i % 10) + 1,
            y = Math.floor(i / 10) + 1;
          return <div key={i} className="hex-cell" style={position(x, y)} />;
        })}
        {sector.Systems.filter((s) => visible(s.Id, sector, preview)).map((system) => {
          const p = position(system.HexLocation.Column, system.HexLocation.Row);
          const label = name(system.Id, sector, preview) ?? 'System';
          const shipHere =
            findContainingSystem(sector, sector.PlayerShip.CurrentLocationId)?.Id === system.Id &&
            visible(sector.PlayerShip.Id, sector, preview);
          return (
            <div className="system-pin" key={system.Id} style={p}>
              <Selectable
                id={system.Id}
                selected={selected}
                onSelect={select}
                label={`System ${label}`}
                className="star-pin"
              >
                <span>✦</span>
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
