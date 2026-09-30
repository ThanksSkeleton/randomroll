import type { ReactNode } from 'react';

export function SystemViewer({
  visible,
  mode,
  symbolic,
  topdown,
}: {
  visible: boolean;
  mode: 'symbolic' | 'topdown';
  symbolic: ReactNode;
  topdown: ReactNode;
}) {
  if (!visible)
    return (
      <div className="restricted-view">
        <h2 className="restricted-view-title">Unknown System or Celestial Object</h2>
        <p className="restricted-view-description">Not in Star Database and Out of Sensor Range</p>
      </div>
    );
  return <>{mode === 'symbolic' ? symbolic : topdown}</>;
}
