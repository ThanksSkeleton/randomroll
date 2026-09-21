import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateSector } from '../generators/swn_sector/sector';

const ARTIFACT_PATH = resolve('/tmp/randomroll-swn-sector-v4.json');
const ARTIFACT_SEED = 'swn-sector-v4-artifact';

describe('SWN sector V4', () => {
  it('generates and writes a valid deterministic location and POI artifact', () => {
    const sector = generateSector(ARTIFACT_SEED);
    expect(generateSector(ARTIFACT_SEED)).toEqual(sector);

    mkdirSync(dirname(ARTIFACT_PATH), { recursive: true });
    writeFileSync(ARTIFACT_PATH, `${JSON.stringify(sector, null, 2)}\n`);

    expect(sector.version).toBe('v4');
    for (const system of sector.systems) {
      const slots = system.locationSlots;
      expect(slots.filter((slot) => slot.location.kind === 'IngressEgress')).toHaveLength(1);
      const extras = slots.filter((slot) =>
        ['SecondaryPlanet', 'GasGiant', 'OtherObject'].includes(slot.location.kind),
      );
      expect(extras.length).toBeGreaterThanOrEqual(2);
      expect(extras.length).toBeLessThanOrEqual(7);
      expect(
        slots.filter(
          (slot) =>
            ['SecondaryPlanet', 'GasGiant', 'OtherObject'].includes(slot.location.kind) &&
            slot.orbitalPositionCategory === 'TooHot',
        ).length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        slots.filter(
          (slot) =>
            ['SecondaryPlanet', 'GasGiant', 'OtherObject'].includes(slot.location.kind) &&
            slot.orbitalPositionCategory === 'TooCold_1',
        ).length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        slots
          .filter(
            (slot) =>
              slot.location.kind === 'GasGiant' &&
              slot.location.satellites.some((planet) => planet.kind === 'PrimaryPlanet'),
          )
          .every(
            (slot) =>
              slot.location.kind === 'GasGiant' && slot.location.pointsOfInterest.length === 0,
          ),
      ).toBe(true);
      expect(
        slots
          .filter(
            (slot) =>
              slot.location.kind === 'SecondaryPlanet' &&
              slot.orbitalPositionCategory === 'Goldilocks',
          )
          .every((slot) => slot.habitableSlot !== undefined),
      ).toBe(true);
      for (const slot of slots) {
        expect(slot.au).toBeGreaterThanOrEqual(0);
      }
      expect(slots.map((slot) => slot.au)).toEqual(
        [...slots.map((slot) => slot.au)].sort((left, right) => left - right),
      );
      const transit = slots.find((slot) => slot.location.kind === 'IngressEgress');
      expect(
        transit?.location.kind === 'IngressEgress' &&
          transit.location.pointsOfInterest.map((point) => point.kind),
      ).toEqual(['Ingress Point', 'Egress Point']);
      expect(
        slots
          .filter((slot) => slot.location.kind === 'IndependentStation')
          .every((slot) =>
            ['TooHot', 'TooCold_1', 'TooCold_3'].includes(slot.orbitalPositionCategory),
          ),
      ).toBe(true);
      const primaries = slots.flatMap((slot) =>
        slot.location.kind === 'PrimaryPlanet'
          ? [{ planet: slot.location, slot }]
          : slot.location.kind === 'GasGiant'
            ? slot.location.satellites
                .filter((planet) => planet.kind === 'PrimaryPlanet')
                .map((planet) => ({ planet, slot }))
            : [],
      );
      for (const { planet, slot } of primaries) {
        const thermalOrbit = planet.attributes.temperature.thermalOrbit;
        expect(slot.orbitalPositionCategory).toBe(
          thermalOrbit === 'Too Hot'
            ? 'TooHot'
            : thermalOrbit === 'Too Cold'
              ? 'TooCold_1'
              : 'Goldilocks',
        );
        if (slot.orbitalPositionCategory === 'TooHot')
          expect(planet.planetDetails.tidallyLocked).toBe(true);
        expect('pointsOfInterest' in planet).toBe(false);
      }
    }
  }, 15_000);
});
