import type { CSSProperties, ReactNode } from 'react';

export type SectorIcon =
  | 'delete-target'
  | 'gm-lock'
  | 'map-view'
  | 'move-ship'
  | 'sector-view'
  | 'select-ship'
  | 'symbolic-view'
  | 'system-view'
  | 'temperate-overlay'
  | 'view-system'
  | 'visibility-basic'
  | 'visibility-cultural-full'
  | 'visibility-cultural-partial'
  | 'visibility-none';

const iconStyle = (icon: SectorIcon) =>
  ({
    '--sector-icon': `url(${import.meta.env.BASE_URL}swn_sector/icons/${icon}.png)`,
  }) as CSSProperties;

export function Icon({ icon }: { icon: SectorIcon }) {
  return <span className="sector-icon" style={iconStyle(icon)} aria-hidden="true" />;
}

export function IconButton({
  icon,
  label,
  title = label,
  className = '',
  disabled,
  pressed,
  onClick,
  children,
}: {
  icon: SectorIcon;
  label: string;
  title?: string;
  className?: string;
  disabled?: boolean;
  pressed?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={title}
      className={`icon-button ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon icon={icon} />
      {children}
    </button>
  );
}
