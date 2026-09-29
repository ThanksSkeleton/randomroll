import { describe, expect, it } from 'vitest';
import { generate } from './generate';
import { POI_DETAIL_COLUMNS_BY_TYPE } from './generation_rules';

describe('generated names', () => {
  it('uses five-letter system names, hex coordinates, and ordered object suffixes', () => {
    const sector = generate('GENERATED-NAMES');

    for (const system of sector.Systems) {
      const coordinate = `${system.HexLocation.Column.toString().padStart(2, '0')}${system.HexLocation.Row.toString().padStart(2, '0')}`;
      expect(system.NiceName).toMatch(/^[A-Z]{5}$/);
      expect(system.ProceduralName).toBe(coordinate);
      expect(system.Star.NiceName).toBe(`${system.NiceName} star`);
      expect(system.Star.ProceduralName).toBe(`${system.ProceduralName} star`);

      const directObjects = system.Objects.filter((object) => object.Orbit.ParentObjectId === null);
      const directLetters = new Map(
        directObjects.map((object, index) => [
          object.Id,
          String.fromCharCode('A'.charCodeAt(0) + index),
        ]),
      );
      directObjects.forEach((object) => {
        const letter = directLetters.get(object.Id)!;
        const suffix = `${object.Kind === 'Planet' ? '' : 'X '}${letter}`;
        expect(object.NiceName).toBe(`${system.NiceName} ${suffix}`);
        expect(object.ProceduralName).toBe(`${system.ProceduralName} ${suffix}`);
      });

      const moonIndexesByParent = new Map<string, number>();
      for (const moon of system.Objects.filter((object) => object.Orbit.ParentObjectId !== null)) {
        const parentId = moon.Orbit.ParentObjectId!;
        const parentLetter = directLetters.get(parentId);
        expect(parentLetter).toBeDefined();
        if (parentLetter === undefined) continue;
        const moonIndex = moonIndexesByParent.get(parentId) ?? 0;
        moonIndexesByParent.set(parentId, moonIndex + 1);
        const suffix = `${parentLetter}${String.fromCharCode('a'.charCodeAt(0) + moonIndex)}`;
        expect(moon.NiceName).toBe(`${system.NiceName} ${suffix}`);
        expect(moon.ProceduralName).toBe(`${system.ProceduralName} ${suffix}`);
      }
    }
  });
});

describe('generated POI names', () => {
  it("numbers each parent's POIs in stable generation order and replaces temporary names", () => {
    const sector = generate('GENERATED-POI-NAMES');
    const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v'];

    const repeatedSector = generate('GENERATED-POI-NAMES');
    expect(
      repeatedSector.Systems.map((system) =>
        system.PointsOfInterest.map((poi) => [poi.Id, poi.NiceName, poi.ProceduralName]),
      ),
    ).toEqual(
      sector.Systems.map((system) =>
        system.PointsOfInterest.map((poi) => [poi.Id, poi.NiceName, poi.ProceduralName]),
      ),
    );

    for (const system of sector.Systems) {
      const countsByParent = new Map<string, number>();
      for (const poi of system.PointsOfInterest) {
        const parent = system.Objects.find((object) => object.Id === poi.ParentObjectId);
        expect(parent).toBeDefined();
        if (parent === undefined) continue;

        const ordinal = (countsByParent.get(parent.Id) ?? 0) + 1;
        countsByParent.set(parent.Id, ordinal);
        const romanNumeral = romanNumerals[ordinal - 1];
        expect(romanNumeral).toBeDefined();
        expect(poi.NiceName).toBe(`${parent.NiceName}${romanNumeral}:${poi.POIType}`);
        expect(poi.ProceduralName).toBe(`${parent.ProceduralName}${romanNumeral}:${poi.POIType}`);
        expect(poi.NiceName).not.toMatch(/^\d{4}-TEMP$/);
        expect(poi.ProceduralName).not.toMatch(/^\d{4}-TEMP$/);
      }
    }
  });
});

describe('generated POI details', () => {
  it('stores deterministic labeled table results in the GM note only', () => {
    const sector = generate('GENERATED-POI-DETAILS');
    const repeatedSector = generate('GENERATED-POI-DETAILS');

    expect(
      repeatedSector.Systems.map((system) =>
        system.PointsOfInterest.map((poi) => [poi.Id, poi.Intelligence.GM]),
      ),
    ).toEqual(
      sector.Systems.map((system) =>
        system.PointsOfInterest.map((poi) => [poi.Id, poi.Intelligence.GM]),
      ),
    );

    for (const system of sector.Systems) {
      for (const poi of system.PointsOfInterest) {
        const columns = POI_DETAIL_COLUMNS_BY_TYPE[poi.POIType] ?? [];
        const noteLines = poi.Intelligence.GM.split('\n');
        expect(noteLines).toHaveLength(columns.length);
        columns.forEach((column, index) => {
          expect(
            column.entries.some((entry) => noteLines[index] === `${column.label}: ${entry.result}`),
          ).toBe(true);
        });
        expect(poi.Intelligence.BasicScan).toBe('-');
      }
    }
  });
});
