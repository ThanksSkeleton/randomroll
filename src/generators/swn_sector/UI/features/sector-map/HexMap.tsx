import type { Sector } from '../../../BaseDTO/merged_schema';
import type { Preview } from '../../application/appState';
import {
  findContainingSystem,
  findDetails,
  isVisibleToPlayer,
} from '../../domain/sector/selectors';
import { projectStar } from '../../../Projector/star_projection';
import { projectRoute } from '../../../Projector/route_projection';
import { projectClaims } from '../../../Projector/politics_projection';
import { StarGlyph } from '../system-viewer/StarGlyph';
import { polityFlagColorValue } from '../politics/PolityFlag';

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
  return preview === 'player' && !d.Visibility.PoliticsScan ? d.ProceduralName : d.NiceName;
}
function position(x: number, y: number) {
  const scale = BAKED_HEXMAP.hexSize / 112;
  const hexHeight = BAKED_HEXMAP.hexSize * (98 / 112);
  return {
    left: BAKED_HEXMAP.leftMargin + BAKED_HEXMAP.hexSize / 2 + (x - 1) * 84 * scale,
    top: BAKED_HEXMAP.topMargin + hexHeight / 2 + ((y - 1) * 98 + ((x - 1) % 2) * 49) * scale,
  };
}

function polityTint(colors: readonly string[]): string | undefined {
  if (colors.length === 0) return undefined;
  if (colors.length === 1) return polityFlagColorValue(colors[0]!);
  const stripeWidth = 12;
  const stops = colors.flatMap((color, index) => {
    const resolved = polityFlagColorValue(color);
    return [`${resolved} ${index * stripeWidth}px`, `${resolved} ${(index + 1) * stripeWidth}px`];
  });
  return `repeating-linear-gradient(135deg, ${stops.join(', ')})`;
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
  showPolityOverlay = false,
}: {
  sector: Sector;
  selected: string | null;
  select: (id: string | null) => void;
  preview: Preview;
  showPolityOverlay?: boolean;
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
            const display = projectRoute(sector, route.Id, preview);
            if (!display || !display.endpointSystemIds.every((id) => visible(id, sector, preview)))
              return null;
            const [a, b] = display.endpointHexes;
            const p1 = position(a.Column, a.Row),
              p2 = position(b.Column, b.Row);
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
          const system = sector.Systems.find(
            (candidate) => candidate.HexLocation.Column === x && candidate.HexLocation.Row === y,
          );
          const showSystemClaims =
            showPolityOverlay &&
            system !== undefined &&
            visible(system.Id, sector, preview) &&
            (preview === 'gm' || system.Visibility.PoliticsScan);
          const claimIds =
            showSystemClaims && system ? (projectClaims(sector, system)?.claimantIds ?? []) : [];
          const claimants = claimIds.flatMap((id) => {
            const polity = sector.Polities.find((candidate) => candidate.Id === id);
            return polity ? [polity] : [];
          });
          return (
            <div
              key={i}
              className={`hex-cell ${claimants.length > 0 ? 'hex-polity-tinted' : ''}`}
              data-system-id={system?.Id}
              data-polities={claimants.map((polity) => polity.NiceName).join(', ') || undefined}
              style={{
                ...position(x, y),
                width: BAKED_HEXMAP.hexSize,
                height: hexHeight,
              }}
            >
              {claimants.length > 0 && (
                <div
                  className="hex-polity-tint"
                  style={{
                    background: polityTint(claimants.map((polity) => polity.Flag.FieldColor)),
                  }}
                />
              )}
            </div>
          );
        })}
        {sector.Systems.filter((s) => visible(s.Id, sector, preview)).map((system) => {
          const p = position(system.HexLocation.Column, system.HexLocation.Row);
          const starDisplay = projectStar(sector, system.Id)!;
          const label = name(system.Id, sector, preview) ?? 'System';
          const shipHere =
            findContainingSystem(sector, sector.PlayerShip.CurrentLocationId)?.Id === system.Id &&
            visible(sector.PlayerShip.Id, sector, preview);
          return (
            <div
              className="system-pin"
              key={system.Id}
              style={{ ...p, ...starDisplay.styleTokens }}
            >
              <Selectable
                id={system.Id}
                selected={selected}
                onSelect={select}
                label={`System ${label}`}
                className={`star-pin ${starDisplay.className}`}
              >
                <StarGlyph recipe={starDisplay.recipe} />
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
