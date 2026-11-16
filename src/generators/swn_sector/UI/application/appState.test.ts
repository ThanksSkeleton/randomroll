import { describe, expect, it } from 'vitest';
import { appReducer, createAppState } from './appState';
import { createInitialSectors } from '../../Application/initialSectors';
import { projectSector } from '../../Projector/sector_projection';

function displaySectors() {
  return createInitialSectors().map((sector) => {
    const result = projectSector(sector, { preview: 'gm', assetBaseUrl: '/' });
    if (!result.ok) throw new Error(result.path);
    return result.value;
  });
}

describe('application state transitions', () => {
  it('opens a selected system and changes representation atomically', () => {
    const state = createAppState(displaySectors());
    const systemId = state.sectors[0].systems[0].id;
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

  it('clears selection when navigation changes', () => {
    const state = createAppState(displaySectors());
    const selected = appReducer(state, {
      type: 'selectObject',
      id: state.sectors[0].systems[0].id,
    });
    const next = appReducer(selected, { type: 'changeView', view: 'all' });
    expect(next).toMatchObject({ view: 'all', selectedId: null });
  });

  it('returns from culture to the sector map', () => {
    const state = { ...createAppState(displaySectors()), view: 'culture' as const };
    const next = appReducer(state, { type: 'changeView', view: 'hex' });
    expect(next).toMatchObject({
      view: 'hex',
      currentSystemId: null,
      selectedId: null,
    });
  });
});
