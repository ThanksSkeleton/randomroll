import type { DisplaySectorDTO } from '../../../DisplayDTO/dto';
import type { Preview } from '../../application/appState';
import { StarGlyph } from '../system-viewer/StarGlyph';
import { polityFlagColorValue } from '../politics/PolityFlag';

const BAKED_HEXMAP = {
  hexSize: 106,
  topMargin: 21,
  leftMargin: 36,
} as const;

function visible(id: string, display: DisplaySectorDTO, preview: Preview) {
  return preview === 'gm' || Boolean(display.entities[id]?.visibility.BasicScan);
}
function name(id: string, display: DisplaySectorDTO, preview: Preview) {
  const d = display.entities[id];
  if (!d) return undefined;
  return preview === 'player' && !d.visibility.PoliticsScan ? d.proceduralName : d.niceName;
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
  display,
  selected,
  select,
  preview,
  showPolityOverlay = false,
}: {
  display: DisplaySectorDTO;
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
          {display.routeIds
            .filter((id) => visible(id, display, preview))
            .map((routeId) => {
              const route = display.entities[routeId]?.route;
              if (!route || !route.endpointSystemIds.every((id) => visible(id, display, preview)))
                return null;
              const [a, b] = route.endpointHexes;
              const p1 = position(a.Column, a.Row),
                p2 = position(b.Column, b.Row);
              return (
                <line
                  key={routeId}
                  x1={p1.left}
                  y1={p1.top}
                  x2={p2.left}
                  y2={p2.top}
                  className={selected === routeId ? 'selected' : ''}
                  onClick={(e) => {
                    e.stopPropagation();
                    select(routeId);
                  }}
                />
              );
            })}
        </svg>
        {Array.from({ length: 77 }, (_, i) => {
          const x = (i % 11) + 1,
            y = Math.floor(i / 11) + 1;
          const system = display.systems.find(
            (candidate) =>
              candidate.spatial.hexLocation.Column === x && candidate.spatial.hexLocation.Row === y,
          );
          const showSystemClaims =
            showPolityOverlay &&
            system !== undefined &&
            visible(system.id, display, preview) &&
            (preview === 'gm' || display.entities[system.id]?.visibility.PoliticsScan);
          const claimants = showSystemClaims && system ? system.claims.claimants : [];
          return (
            <div
              key={i}
              className={`hex-cell ${claimants.length > 0 ? 'hex-polity-tinted' : ''}`}
              data-system-id={system?.id}
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
        {display.systems
          .filter((s) => visible(s.id, display, preview))
          .map((system) => {
            const p = position(system.spatial.hexLocation.Column, system.spatial.hexLocation.Row);
            const starDisplay = system.star;
            const label = name(system.id, display, preview) ?? 'System';
            const shipHere =
              display.playerShipSystemId === system.id &&
              visible(display.playerShipId, display, preview);
            return (
              <div
                className="system-pin"
                key={system.id}
                style={{ ...p, ...starDisplay.styleTokens }}
              >
                <Selectable
                  id={system.id}
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
                    id={display.playerShipId}
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
