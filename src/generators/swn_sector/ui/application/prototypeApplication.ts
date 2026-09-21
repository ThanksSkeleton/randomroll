import { createInitialSectors } from '../data';
import { generate } from '../../generate';
import type { Sector } from '../../merged_schema';

export type LocalSession = { role: 'gm' };

export type DeleteSectorResult =
  | { ok: true; sectors: Sector[]; nextIndex: number }
  | { ok: false; reason: 'invalid-index' | 'last-sector' };

function copy<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Concrete local application boundary for the prototype.
 *
 * These methods intentionally remain synchronous and in-memory. They are
 * replacement points for sequence 05, not a general repository abstraction.
 */
export class PrototypeApplication {
  private sectors: Sector[];

  constructor(initialSectors = createInitialSectors()) {
    this.sectors = copy(initialSectors);
  }

  generateSector(seed: string): Sector {
    const generated = generate(seed);
    this.sectors = [...this.sectors, generated];
    return copy(generated);
  }

  listSectors(): Sector[] {
    return copy(this.sectors);
  }

  loadSector(index: number): Sector | undefined {
    return index >= 0 && index < this.sectors.length ? copy(this.sectors[index]) : undefined;
  }

  saveSector(index: number, sector: Sector): Sector[] | undefined {
    if (index < 0 || index >= this.sectors.length) return undefined;
    this.sectors = this.sectors.map((current, currentIndex) =>
      currentIndex === index ? copy(sector) : current,
    );
    return this.listSectors();
  }

  renameSector(index: number, name: string): Sector[] | undefined {
    const trimmedName = name.trim();
    if (!trimmedName || index < 0 || index >= this.sectors.length) return undefined;
    this.sectors = this.sectors.map((sector, currentIndex) =>
      currentIndex === index ? { ...sector, SectorName: trimmedName } : sector,
    );
    return this.listSectors();
  }

  deleteSector(index: number): DeleteSectorResult {
    if (index < 0 || index >= this.sectors.length) return { ok: false, reason: 'invalid-index' };
    if (this.sectors.length <= 1) return { ok: false, reason: 'last-sector' };
    this.sectors = this.sectors.filter((_, currentIndex) => currentIndex !== index);
    return { ok: true, sectors: this.listSectors(), nextIndex: Math.max(0, index - 1) };
  }

  getCurrentSession(): LocalSession {
    return { role: 'gm' };
  }
}

export function createPrototypeApplication(): PrototypeApplication {
  return new PrototypeApplication();
}
