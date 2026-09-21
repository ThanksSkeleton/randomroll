import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SystemViewer } from './SystemViewer';
import { createInitialSectors } from '../../data';

describe('SystemViewer', () => {
  it('renders the restricted state when the system is not visible', () => {
    const sector = createInitialSectors()[0];
    render(
      <SystemViewer
        system={sector.Systems[0]}
        sector={sector}
        preview="player"
        visible={false}
        mode="symbolic"
        symbolic={<span>symbolic</span>}
        topdown={<span>topdown</span>}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Unknown System or Celestial Object' }),
    ).toBeTruthy();
    expect(screen.queryByText('symbolic')).toBeNull();
  });

  it('renders only the selected representation', () => {
    const sector = createInitialSectors()[0];
    render(
      <SystemViewer
        system={sector.Systems[0]}
        sector={sector}
        preview="gm"
        visible
        mode="topdown"
        symbolic={<span>symbolic</span>}
        topdown={<span>topdown</span>}
      />,
    );
    expect(screen.queryByText('symbolic')).toBeNull();
    expect(screen.getByText('topdown')).toBeTruthy();
  });
});
