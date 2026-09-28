// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Polity } from '../../../merged_schema';
import { PolityFlag } from './PolityFlag';

const polity: Polity = {
  Id: 'polity',
  NiceName: 'Azure Republic',
  HomeworldId: 'world',
  Attack: 2,
  Defense: 3,
  Projection: 1,
  Flag: { FieldColor: 'light blue', CircleColor: 'gold' },
};

describe('PolityFlag', () => {
  it('renders the generated field and circle colors with the polity tooltip', () => {
    const view = render(<PolityFlag polity={polity} />);

    expect(screen.getByRole('img', { name: 'Azure Republic polity flag' })).toBeTruthy();
    expect(view.container.querySelector('title')?.textContent).toBe('Azure Republic');
    expect(view.container.querySelector('rect')?.getAttribute('fill')).toBe('#81d4fa');
    expect(view.container.querySelector('circle')?.getAttribute('fill')).toBe('#d4af37');
  });

  it('renders the special black None flag without a circle', () => {
    const view = render(<PolityFlag />);

    expect(screen.getByRole('img', { name: 'None polity flag' })).toBeTruthy();
    expect(view.container.querySelector('rect')?.getAttribute('fill')).toBe('#000000');
    expect(view.container.querySelector('circle')).toBeNull();
  });
});
