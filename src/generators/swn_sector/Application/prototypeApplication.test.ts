import { describe, expect, it } from 'vitest';
import { createInitialSectors } from './initialSectors';
import { generate } from '../Generator/generate';
import { projectSector } from '../Projector/sector_projection';
import { PrototypeApplication } from './prototypeApplication';

const options = { preview: 'gm', assetBaseUrl: '/' } as const;

function read(application: PrototypeApplication, index: number) {
  const result = application.readSector(index, options);
  if (!result.ok) throw new Error(`Expected projected sector at ${index}`);
  return result.value;
}

describe('PrototypeApplication', () => {
  it('starts with one projected sector and reports a GM session', () => {
    const application = new PrototypeApplication(createInitialSectors());
    expect(application.readSeed(0)).toBe('sector-one-seed');
    expect(application.readSectors(options)).toHaveLength(1);
    expect(application.getCurrentSession()).toEqual({ role: 'gm' });
  });

  it('generates and returns a detached projection of the requested seed', () => {
    const application = new PrototypeApplication(createInitialSectors());
    const generated = application.generateSector({ seed: 'DELTA-7734' }, options);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const expected = projectSector(generate({ seed: 'DELTA-7734' }), options);
    expect(expected.ok).toBe(true);
    if (!expected.ok) return;
    expect(generated.display).toEqual(expected.value);
    expect(application.readSeed(0)).toBe('DELTA-7734');
    generated.display.name = 'Changed outside the application';
    generated.display.entities[generated.display.systems[0].id].proceduralName = 'Changed';
    expect(read(application, 0).name).not.toBe('Changed outside the application');
    expect(read(application, 0).entities[generated.display.systems[0].id].proceduralName).not.toBe(
      'Changed',
    );
  });

  it('rejects invalid indexes', () => {
    const application = new PrototypeApplication(createInitialSectors());
    expect(application.readSector(-1, options)).toEqual({ ok: false, reason: 'invalid-index' });
    expect(
      application.editSector(20, { sectorName: read(application, 0).name, details: {} }, options),
    ).toEqual({ ok: false, reason: 'invalid-index' });
  });

  it('commits explicit edits atomically', () => {
    const application = new PrototypeApplication(createInitialSectors());
    const original = createInitialSectors()[0];
    const systemId = original.Systems[0].Id;
    const result = application.editSector(
      0,
      { sectorName: 'Edited sector', details: { [systemId]: { NiceName: 'Edited system' } } },
      options,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.display.name).toBe('Edited sector');
    expect(result.display.entities[systemId].niceName).toBe('Edited system');
    expect(read(application, 0).entities[systemId].niceName).toBe('Edited system');
    expect(
      application.editSector(
        0,
        { sectorName: 'Should not save', details: { missing: { NiceName: 'Missing' } } },
        options,
      ),
    ).toEqual({ ok: false, reason: 'invalid-edit' });
    expect(read(application, 0).name).toBe('Edited sector');
  });

  it('commits GM commands by ID and leaves failed commands unchanged', () => {
    const original = createInitialSectors()[0];
    const application = new PrototypeApplication([original]);
    const systemId = original.Systems[0].Id;
    const visible = application.setScanVisibility(
      0,
      systemId,
      { BasicScan: true, DetailedScan: true, PoliticsScan: false, DeepPoliticsScan: false },
      options,
    );
    expect(visible.ok).toBe(true);
    if (!visible.ok) return;
    expect(visible.display.entities[systemId].visibility.DetailedScan).toBe(true);
    const destinationId = original.Systems[1].Id;
    const moved = application.moveShip(0, destinationId, options);
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.display.playerShipLocationId).toBe(original.Systems[1].Star.Id);
    const routeId = original.Routes[0].Id;
    const deleted = application.deleteObject(0, routeId, options);
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    expect(deleted.display.entities[routeId]).toBeUndefined();
    const beforeFailure = read(application, 0);
    expect(application.moveShip(0, routeId, options)).toEqual({
      ok: false,
      reason: 'move-prohibited',
    });
    expect(
      application.setScanVisibility(
        0,
        systemId,
        { BasicScan: false, DetailedScan: true, PoliticsScan: false, DeepPoliticsScan: false },
        options,
      ),
    ).toEqual({ ok: false, reason: 'invalid-visibility' });
    expect(read(application, 0)).toEqual(beforeFailure);
    const startingWorldId = original.StartingWorldId;
    if (!startingWorldId) throw new Error('expected a starting world');
    expect(application.deleteObject(0, startingWorldId, options)).toEqual({
      ok: false,
      reason: 'invalid-sector',
    });
    expect(read(application, 0)).toEqual(beforeFailure);
  });
});
