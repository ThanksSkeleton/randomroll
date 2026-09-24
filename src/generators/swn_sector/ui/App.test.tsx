// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import App from './App';

function renderApp() {
  return render(<App />);
}

afterEach(() => cleanup());

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
  it('starts in the GM sector map with all systems and no target', () => {
    renderApp();

    expect(screen.getByRole('button', { name: 'GM VIEW' }).className).toContain('button-active');
    expect(screen.getAllByRole('button', { name: /^System / }).length).toBeGreaterThanOrEqual(20);
    expect(screen.getByRole('heading', { name: 'NO TARGET' })).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: '⌫ DELETE TARGET' }) as HTMLButtonElement).disabled,
    ).toBe(true);
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

  it('filters GM-only objects from player preview and hides GM controls', () => {
    renderApp();
    const firstSystemName = firstSystemButton().getAttribute('aria-label') ?? '';

    fireEvent.click(screen.getByRole('button', { name: 'PLAYER VIEW' }));

    expect(screen.queryByRole('button', { name: firstSystemName })).toBeNull();
    expect(screen.queryByRole('button', { name: 'SECTOR ARCHIVE' })).toBeNull();
    expect(screen.queryByRole('button', { name: '⌫ DELETE TARGET' })).toBeNull();
    expect(screen.getByRole('button', { name: 'PLAYER VIEW' }).className).toContain(
      'button-active',
    );
  });

  it('restores the existing GM icons when returning from player preview', () => {
    renderApp();
    const lockIcon = document.querySelector('.lock .sector-icon');
    expect(lockIcon).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'PLAYER VIEW' }));
    expect(screen.queryByRole('button', { name: '▣ LOCKED' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'GM VIEW' }));
    expect(screen.getByRole('button', { name: '▣ LOCKED' })).toBeTruthy();
    expect(document.querySelector('.lock .sector-icon')).toBe(lockIcon);
  });

  it("saves a selected object's edited name when the GM lock is restored", () => {
    renderApp();
    fireEvent.click(firstSystemButton());
    fireEvent.click(screen.getByRole('button', { name: '▣ LOCKED' }));

    const nameEditor = document.querySelector<HTMLInputElement>('.object-name-editor');
    expect(nameEditor).not.toBeNull();
    fireEvent.change(nameEditor!, { target: { value: 'RENAMED SYSTEM' } });
    fireEvent.click(screen.getByRole('button', { name: '□ UNLOCKED' }));

    expect(screen.getByRole('heading', { name: 'RENAMED SYSTEM' })).toBeTruthy();
    expect(document.querySelector('.object-name-editor')).toBeNull();
  });

  it('keeps the selected visibility highlighted while GM editing is locked', () => {
    renderApp();
    fireEvent.click(firstSystemButton());

    const visibilityButtons = screen.getAllByRole('button', { name: /^VISIBILITY:/ });
    const currentVisibility = visibilityButtons.find((button) =>
      button.className.includes('button-active'),
    );

    expect(currentVisibility).toBeTruthy();
    expect(currentVisibility).toHaveProperty('disabled', true);
  });

  it('discards an unsaved GM draft on navigation', () => {
    renderApp();
    const originalName = firstSystemButton()
      .getAttribute('aria-label')!
      .replace(/^System /, '');
    fireEvent.click(firstSystemButton());
    fireEvent.click(screen.getByRole('button', { name: '▣ LOCKED' }));

    const nameEditor = document.querySelector<HTMLInputElement>('.object-name-editor');
    fireEvent.change(nameEditor!, { target: { value: 'UNSAVED NAVIGATION EDIT' } });
    fireEvent.click(screen.getByRole('button', { name: 'SECTOR ARCHIVE' }));
    fireEvent.click(screen.getByRole('button', { name: 'SECTOR' }));
    fireEvent.click(firstSystemButton());

    expect(screen.getByRole('heading', { name: originalName })).toBeTruthy();
    expect(screen.queryByDisplayValue('UNSAVED NAVIGATION EDIT')).toBeNull();
    expect(screen.getByRole('button', { name: '▣ LOCKED' })).toBeTruthy();
  });

  it('generates, renames, loads, and deletes an archive entry', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'SECTOR ARCHIVE' }));
    const archive = screen.getByRole('combobox', { name: 'Available sectors' });

    expect(archive.querySelectorAll('option')).toHaveLength(2);
    fireEvent.change(screen.getByRole('textbox', { name: 'ORIGIN SEED' }), {
      target: { value: 'CHARACTERIZATION' },
    });
    fireEvent.click(screen.getByRole('button', { name: /GENERATE SECTOR/ }));
    expect(archive.querySelectorAll('option')).toHaveLength(3);
    expect(archive.textContent).toContain('Sector CHARACTERIZATION');

    fireEvent.change(archive, { target: { value: '2' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'RENAME SECTOR' }), {
      target: { value: 'Renamed Test Sector' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'APPLY NAME' }));
    expect(archive.textContent).toContain('Renamed Test Sector');

    fireEvent.click(screen.getByRole('button', { name: 'DELETE FROM ARCHIVE' }));
    expect(archive.querySelectorAll('option')).toHaveLength(2);
  });
});
