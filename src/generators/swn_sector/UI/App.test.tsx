// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import App from './App';

function renderApp() {
  return render(<App />);
}

afterEach(() => cleanup());
beforeEach(() => window.history.replaceState({}, '', '/swn_sector/?seed=sector-one-seed'));

beforeAll(() => {
  class TestResizeObserver {
    observe() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;
});

function firstSystemButton() {
  return screen.getAllByRole('button', { name: /^System / })[0];
}

describe('prototype application workflows', () => {
  it('uses the shared URL seed for loading, rerolling, and browser history', () => {
    window.history.replaceState({}, '', '/swn_sector/?seed=shared-seed');
    renderApp();
    expect(screen.getByLabelText('Seed: shared-seed')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'REROLL ↻' }));
    const rerolledSeed = new URL(window.location.href).searchParams.get('seed');
    expect(rerolledSeed).toMatch(/^[a-z0-9]{5}$/);
    expect(screen.getByLabelText(`Seed: ${rerolledSeed}`)).toBeTruthy();

    window.history.replaceState({}, '', '/swn_sector/?seed=shared-seed');
    fireEvent.popState(window);
    expect(screen.getByLabelText('Seed: shared-seed')).toBeTruthy();
  });

  it('adds a shared-format seed when the URL has none', () => {
    window.history.replaceState({}, '', '/swn_sector/');
    renderApp();
    const seed = new URL(window.location.href).searchParams.get('seed');
    expect(seed).toMatch(/^[a-z0-9]{5}$/);
    expect(screen.getByLabelText(`Seed: ${seed}`)).toBeTruthy();
  });

  it('starts in the GM sector map with all systems and no target', () => {
    renderApp();

    expect(screen.getByRole('button', { name: 'GM VIEW' }).className).toContain('button-active');
    expect(screen.getAllByRole('button', { name: /^System / }).length).toBeGreaterThanOrEqual(20);
    expect(screen.getByRole('heading', { name: 'NO TARGET' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '⌫ DELETE TARGET' })).toBeNull();
  });

  it('preserves a selected system across symbolic/map and sector/system transitions', () => {
    renderApp();
    const systemButton = firstSystemButton();
    const systemName = systemButton.getAttribute('aria-label')!.replace(/^System /, '');

    fireEvent.click(systemButton);
    expect(systemButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('heading', { name: systemName })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^SYSTEM$/ }));
    expect(screen.getAllByRole('button', { name: /^Adjacent system / })).not.toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /^SYMBOLIC$/ }));
    expect(screen.queryByRole('button', { name: /SYSTEM INTELLIGENCE/ })).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: /^SECTOR$/ })[1]);
    fireEvent.click(screen.getByRole('button', { name: /^MAP$/ }));
    expect(screen.getByRole('group', { name: 'Sector map' })).toBeTruthy();
    expect(
      screen.getAllByRole('button', { name: /^System / })[0].getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('toggles the polity overlay in the sector map and system views', () => {
    renderApp();
    const overlayButton = screen.getByRole('button', { name: 'POLITY OVERLAY' });
    expect(overlayButton).toHaveProperty('disabled', false);
    expect(document.querySelector('.hex-polity-tint')).toBeNull();

    fireEvent.click(overlayButton);
    expect(document.querySelectorAll('.hex-polity-tint').length).toBeGreaterThan(0);

    fireEvent.click(firstSystemButton());
    fireEvent.click(screen.getByRole('button', { name: /^SYSTEM$/ }));
    expect(overlayButton).toHaveProperty('disabled', false);

    expect(overlayButton.className).toContain('button-active');
    expect(document.querySelectorAll('.polity-overlay-flags .polity-flag').length).toBeGreaterThan(
      0,
    );
  });

  it('keeps the sector inspector and GM notes readable without editing controls', () => {
    renderApp();
    fireEvent.click(firstSystemButton());
    expect(screen.getByRole('heading', { name: 'Basic Scan' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'GM' }));
    expect(screen.getByRole('heading', { name: 'GM Information' })).toBeTruthy();
    expect(document.querySelector('.detail-bar input, .detail-bar textarea')).toBeNull();
    for (const name of ['▣ LOCKED', 'MOVE SHIP TO TARGET', 'NO VIS', '⌫ DELETE TARGET'])
      expect(screen.queryByRole('button', { name })).toBeNull();
  });
});
