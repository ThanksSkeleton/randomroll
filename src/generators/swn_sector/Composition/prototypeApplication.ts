import { createInitialSectors } from './initialSectors';
import { generate } from '../Generator/generate';
import { completeWorld as generateWorldCulture } from '../Generator/culture';
import { projectCultureScreen } from '../Projector/culture_projection';
import type { Sector, StartingWorldMode } from '../BaseDTO/merged_schema';
import type { CultureScreenDisplayDTO } from '../DisplayDTO/dto';

export type LocalSession = { role: 'gm' };

export type DeleteSectorResult =
  | { ok: true; sectors: Sector[]; nextIndex: number }
  | { ok: false; reason: 'invalid-index' | 'last-sector' };

export type CompleteWorldResult =
  | { ok: true; sector: Sector; culture: CultureScreenDisplayDTO }
  | { ok: false; reason: 'invalid-index' | 'invalid-world' | 'invalid-projection' };

function copy<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Concrete local application boundary for the prototype.
 *
 * These methods intentionally remain synchronous and in-memory. They are
 * replacement points for sub-spec 6, not a general repository abstraction.
 */
export class PrototypeApplication {
  private sectors: Sector[];

  constructor(initialSectors = createInitialSectors()) {
    this.sectors = copy(initialSectors);
  }

  generateSector(seed: string, startingWorldMode: StartingWorldMode = 'UNRESTRICTED'): Sector {
    const generated = copy(generate(seed, startingWorldMode));
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

  completeWorld(index: number, worldId: string): CompleteWorldResult {
    const current = this.loadSector(index);
    if (!current) return { ok: false, reason: 'invalid-index' };
    const eligible = current.Systems.some((system) =>
      system.Objects.some(
        (object) =>
          object.Id === worldId && object.Kind === 'Planet' && object.InhabitedInfo !== false,
      ),
    );
    if (!eligible) return { ok: false, reason: 'invalid-world' };
    const next = generateWorldCulture(current, worldId);
    const culture = projectCultureScreen(next);
    if (!culture) return { ok: false, reason: 'invalid-projection' };
    this.sectors = this.sectors.map((sector, currentIndex) =>
      currentIndex === index ? copy(next) : sector,
    );
    return { ok: true, sector: copy(next), culture };
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
