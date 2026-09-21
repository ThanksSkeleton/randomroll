import { describe, expect, it } from 'vitest';
import { appReducer, createAppState } from './appState';
import { createInitialSectors } from '../data';

describe('application state transitions', () => {
  it('opens a selected system and changes representation atomically', () => {
    const state = createAppState(createInitialSectors());
    const systemId = state.sectors[0].Systems[0].Id;
    const opened = appReducer(state, { type: 'openSystem', systemId, mode: 'symbolic' });
    expect(opened).toMatchObject({
      view: 'system',
      currentSystemId: systemId,
      selectedId: systemId,
      systemMode: 'symbolic',
    });
    expect(appReducer(opened, { type: 'changeRepresentation', mode: 'topdown' })).toMatchObject({
      view: 'system',
      currentSystemId: systemId,
      selectedId: systemId,
      systemMode: 'topdown',
    });
  });

  it('discards an edit draft when navigation changes', () => {
    const state = createAppState(createInitialSectors());
    const editing = appReducer(state, {
      type: 'beginEditing',
      draft: { sectorName: 'Draft', details: {} },
    });
    const next = appReducer(editing, { type: 'changeView', view: 'all' });
    expect(next).toMatchObject({ view: 'all', editDraft: null, locked: true, selectedId: null });
  });

  it('switching preview from archive returns to the sector map', () => {
    const state = { ...createAppState(createInitialSectors()), view: 'sectors' as const };
    const next = appReducer(state, { type: 'changePreview', preview: 'player' });
    expect(next).toMatchObject({
      preview: 'player',
      view: 'hex',
      currentSystemId: null,
      selectedId: null,
      locked: true,
    });
  });
});
