import type { ReactNode } from 'react';
import type { Preview } from '../../application/appState';
import type { Sector, StarSystem } from '../../domain/sector/model';

export function SystemViewer({
  system,
  sector,
  preview,
  visible,
  mode,
  symbolic,
  topdown,
}: {
  system: StarSystem;
  sector: Sector;
  preview: Preview;
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
  return system && sector && preview ? <>{mode === 'symbolic' ? symbolic : topdown}</> : null;
}
