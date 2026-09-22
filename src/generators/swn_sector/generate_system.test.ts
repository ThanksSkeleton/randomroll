import { describe, expect, it } from 'vitest';
import { generate } from './generate';

describe('generated names', () => {
  it('uses five-letter system names, hex coordinates, and ordered object suffixes', () => {
    const sector = generate('GENERATED-NAMES');

    for (const system of sector.Systems) {
      const coordinate = `${system.HexLocation.Column.toString().padStart(2, '0')}${system.HexLocation.Row.toString().padStart(2, '0')}`;
      expect(system.NiceName).toMatch(/^[A-Z]{5}$/);
      expect(system.ProceduralName).toBe(coordinate);
      expect(system.Star.NiceName).toBe(`${system.NiceName} star`);
      expect(system.Star.ProceduralName).toBe(`${system.ProceduralName} star`);

      system.Objects.forEach((object, index) => {
        const letter = String.fromCharCode('A'.charCodeAt(0) + index);
        const suffix = `${object.Kind === 'Planet' ? '' : 'X '}${letter}`;
        expect(object.NiceName).toBe(`${system.NiceName} ${suffix}`);
        expect(object.ProceduralName).toBe(`${system.ProceduralName} ${suffix}`);
      });
    }
  });
});
