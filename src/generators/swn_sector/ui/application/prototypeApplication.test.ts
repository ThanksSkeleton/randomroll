import { describe, expect, it } from 'vitest';
import { validateSector } from '../domain/sector/validation';
import { createInitialSectors } from '../data';
import { generate } from '../../generate';
import { PrototypeApplication } from './prototypeApplication';

describe('PrototypeApplication', () => {
  it('starts with the two local sectors and reports a GM session', () => {
    const application = new PrototypeApplication(createInitialSectors());

    expect(application.listSectors().map((sector) => sector.SectorName)).toEqual([
      'Sector sector-one-seed',
      'Sector sector-two-seed',
    ]);
    expect(application.getCurrentSession()).toEqual({ role: 'gm' });
  });

  it('generates a valid sector with the requested seed', () => {
    const application = new PrototypeApplication(createInitialSectors());

    const generated = application.generateSector('DELTA-7734');

    expect(generated).toEqual(generate('DELTA-7734'));
    expect(generated.OriginalSeed).toBe('DELTA-7734');
    expect(generated.Systems[0].Objects[0].Temperature).toBeDefined();
    expect(generated.RoutePortals.length).toBeGreaterThan(0);
    expect(validateSector(generated)).toEqual([]);
    expect(application.listSectors()).toHaveLength(3);
  });

  it('keeps stored sectors isolated from returned mutable values', () => {
    const application = new PrototypeApplication(createInitialSectors());
    const loaded = application.loadSector(0)!;
    loaded.SectorName = 'Changed outside the application';
    loaded.Systems[0].Objects[0].ProceduralName = 'Changed outside the application';

    const stored = application.loadSector(0)!;
    expect(stored.SectorName).toBe('Sector sector-one-seed');
    expect(stored.Systems[0].Objects[0].ProceduralName).not.toBe('Changed outside the application');
  });

  it('preserves archive operations and chooses a valid index after deletion', () => {
    const application = new PrototypeApplication(createInitialSectors());

    expect(application.renameSector(0, '  Renamed Sector  ')?.[0].SectorName).toBe(
      'Renamed Sector',
    );
    expect(application.loadSector(1)?.SectorName).toBe('Sector sector-two-seed');

    const result = application.deleteSector(1);
    expect(result).toEqual(expect.objectContaining({ ok: true, nextIndex: 0 }));
    expect(application.listSectors()).toHaveLength(1);
    expect(application.deleteSector(0)).toEqual({ ok: false, reason: 'last-sector' });
  });

  it('rejects invalid archive writes and indexes', () => {
    const application = new PrototypeApplication(createInitialSectors());
    const sector = application.loadSector(0)!;

    expect(application.loadSector(-1)).toBeUndefined();
    expect(application.saveSector(20, sector)).toBeUndefined();
    expect(application.renameSector(0, '   ')).toBeUndefined();
    expect(application.deleteSector(20)).toEqual({ ok: false, reason: 'invalid-index' });
  });
});
