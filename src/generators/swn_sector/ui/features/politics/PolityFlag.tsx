import type { Polity, PolityFlagColor, Sector } from '../../../merged_schema';

const FLAG_COLOR: Record<PolityFlagColor, string> = {
  red: '#e53935',
  orange: '#fb8c00',
  gold: '#d4af37',
  yellow: '#fdd835',
  'lime green': '#9acd32',
  green: '#43a047',
  teal: '#00897b',
  'light blue': '#81d4fa',
  blue: '#1e88e5',
  purple: '#8e24aa',
  pink: '#ec407a',
  brown: '#8d6e63',
  gray: '#9e9e9e',
  white: '#ffffff',
};

export function polityFlagColorValue(color: string): string {
  return FLAG_COLOR[color as PolityFlagColor] ?? color;
}

export function PolityFlag({ polity }: { polity?: Polity }) {
  const name = polity?.NiceName ?? 'None';
  const fieldColor = polity ? polityFlagColorValue(polity.Flag.FieldColor) : '#000000';
  const circleColor = polity ? polityFlagColorValue(polity.Flag.CircleColor) : '#000000';
  return (
    <svg className="polity-flag" viewBox="0 0 32 16" role="img" aria-label={`${name} polity flag`}>
      <title>{name}</title>
      <rect x="0.5" y="0.5" width="31" height="15" fill={fieldColor} stroke="#ffffff" />
      {polity && <circle cx="16" cy="8" r="5" fill={circleColor} />}
    </svg>
  );
}

export function PolityFlagList({
  sector,
  polityIds,
  className = '',
}: {
  sector: Sector;
  polityIds: readonly string[];
  className?: string;
}) {
  const polities = polityIds.flatMap((id) => {
    const polity = sector.Polities.find((candidate) => candidate.Id === id);
    return polity ? [polity] : [];
  });
  return (
    <div className={`polity-flag-list ${className}`} aria-label="Political claims">
      {polities.length === 0 ? (
        <PolityFlag />
      ) : (
        polities.map((polity) => <PolityFlag key={polity.Id} polity={polity} />)
      )}
    </div>
  );
}
