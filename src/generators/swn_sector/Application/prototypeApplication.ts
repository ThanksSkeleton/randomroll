import { createInitialSectors } from './initialSectors';
import { generate } from '../Generator/generate';
import type { GenerationSettings } from '../Generator/generation_settings';
import { completeWorld as generateWorldCulture } from '../Generator/culture';
import type { ScanVisibility, Sector, StartingWorldMode } from '../BaseDTO/merged_schema';
import type { ArchiveSectorDisplayDTO, DisplaySectorDTO } from '../DisplayDTO/dto';
import {
  projectArchiveSector,
  projectSector,
  type SectorProjectionResult,
} from '../Projector/sector_projection';
import { checkAllInvariants } from '../Generator/generated_sector_invariants';
import { applySectorEdits, validSectorEdits, type SectorEdits } from './sector_edits';
import {
  deleteSectorObject,
  relocatePlayerShip,
  setObjectScanVisibility,
  type SectorOperationResult,
  type SectorOperationFailure,
} from './sector_operations';

export type LocalSession = { role: 'gm' };

export type DeleteSectorResult =
  | { ok: true; archive: ArchiveSectorDisplayDTO[]; nextIndex: number }
  | { ok: false; reason: 'invalid-index' | 'last-sector' };

export type CompleteWorldResult =
  | { ok: true; display: DisplaySectorDTO }
  | { ok: false; reason: 'invalid-index' | 'invalid-world' | 'invalid-projection' };

export type GenerateSectorResult =
  | { ok: true; display: DisplaySectorDTO; archive: ArchiveSectorDisplayDTO[] }
  | { ok: false; reason: 'invalid-projection' };

export type RenameSectorResult =
  | { ok: true; display: DisplaySectorDTO; archive: ArchiveSectorDisplayDTO[] }
  | { ok: false; reason: 'invalid-index' | 'invalid-name' | 'invalid-projection' };

export type ProjectionOptions = { preview: 'gm' | 'player'; assetBaseUrl: string };

export type EditSectorResult =
  | { ok: true; display: DisplaySectorDTO }
  | { ok: false; reason: 'invalid-index' | 'invalid-edit' | 'invalid-projection' };

export type SectorCommandResult =
  | { ok: true; display: DisplaySectorDTO }
  | {
      ok: false;
      reason: 'invalid-index' | 'invalid-sector' | 'invalid-projection' | SectorOperationFailure;
    };

function copy<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Concrete local application boundary for the prototype.
 *
 * The UI reads projected display values and commits through explicit commands.
 * Canonical sectors stay private to this synchronous, in-memory boundary.
 */
export class PrototypeApplication {
  private sectors: Sector[];

  constructor(initialSectors = createInitialSectors()) {
    this.sectors = copy(initialSectors);
  }

  generateSector(
    generationSettings: GenerationSettings,
    startingWorldMode: StartingWorldMode = 'UNRESTRICTED',
    options: ProjectionOptions = { preview: 'gm', assetBaseUrl: '/' },
  ): GenerateSectorResult {
    const generated = copy(generate(generationSettings, startingWorldMode));
    const projected = projectSector(generated, options);
    if (!projected.ok) return { ok: false, reason: 'invalid-projection' };
    this.sectors = [...this.sectors, generated];
    return { ok: true, display: projected.value, archive: this.readArchiveSectors() };
  }

  readArchiveSectors(): ArchiveSectorDisplayDTO[] {
    return this.sectors.map(projectArchiveSector);
  }

  private loadCanonical(index: number): Sector | undefined {
    return index >= 0 && index < this.sectors.length ? copy(this.sectors[index]) : undefined;
  }

  /** Shared read boundary for the part 6 UI cutover. */
  readSector(
    index: number,
    options: { preview: 'gm' | 'player'; assetBaseUrl: string },
  ): SectorProjectionResult | { ok: false; reason: 'invalid-index' } {
    const sector = this.loadCanonical(index);
    return sector ? projectSector(sector, options) : { ok: false, reason: 'invalid-index' };
  }

  readSectors(options: {
    preview: 'gm' | 'player';
    assetBaseUrl: string;
  }): SectorProjectionResult[] {
    return this.sectors.map((sector) => projectSector(sector, options));
  }

  editSector(
    index: number,
    edits: SectorEdits,
    options: { preview: 'gm' | 'player'; assetBaseUrl: string },
  ): EditSectorResult {
    const current = this.loadCanonical(index);
    if (!current) return { ok: false, reason: 'invalid-index' };
    if (!validSectorEdits(current, edits)) return { ok: false, reason: 'invalid-edit' };
    const next = applySectorEdits(current, edits);
    if (checkAllInvariants(next).length) return { ok: false, reason: 'invalid-edit' };
    const display = projectSector(next, options);
    if (!display.ok) return { ok: false, reason: 'invalid-projection' };
    this.sectors[index] = copy(next);
    return { ok: true, display: display.value };
  }

  private updateSectorByCommand(
    index: number,
    operation: (sector: Sector) => SectorOperationResult<Sector>,
    options: { preview: 'gm' | 'player'; assetBaseUrl: string },
  ): SectorCommandResult {
    const current = this.loadCanonical(index);
    if (!current) return { ok: false, reason: 'invalid-index' };
    const result = operation(current);
    if (!result.ok) return result;
    if (checkAllInvariants(result.value).length) return { ok: false, reason: 'invalid-sector' };
    const display = projectSector(result.value, options);
    if (!display.ok) return { ok: false, reason: 'invalid-projection' };
    this.sectors[index] = copy(result.value);
    return { ok: true, display: display.value };
  }

  setScanVisibility(
    index: number,
    id: string,
    visibility: ScanVisibility,
    options: { preview: 'gm' | 'player'; assetBaseUrl: string },
  ): SectorCommandResult {
    return this.updateSectorByCommand(
      index,
      (sector) => setObjectScanVisibility(sector, id, visibility),
      options,
    );
  }

  moveShip(
    index: number,
    targetId: string,
    options: { preview: 'gm' | 'player'; assetBaseUrl: string },
  ): SectorCommandResult {
    return this.updateSectorByCommand(
      index,
      (sector) => relocatePlayerShip(sector, targetId),
      options,
    );
  }

  deleteObject(
    index: number,
    id: string,
    options: { preview: 'gm' | 'player'; assetBaseUrl: string },
  ): SectorCommandResult {
    return this.updateSectorByCommand(index, (sector) => deleteSectorObject(sector, id), options);
  }

  completeWorld(
    index: number,
    worldId: string,
    options: ProjectionOptions = { preview: 'gm', assetBaseUrl: '/' },
  ): CompleteWorldResult {
    const current = this.loadCanonical(index);
    if (!current) return { ok: false, reason: 'invalid-index' };
    const eligible = current.Systems.some((system) =>
      system.Objects.some(
        (object) =>
          object.Id === worldId && object.Kind === 'Planet' && object.InhabitedInfo !== false,
      ),
    );
    if (!eligible) return { ok: false, reason: 'invalid-world' };
    const next = generateWorldCulture(current, worldId);
    if (checkAllInvariants(next).length) return { ok: false, reason: 'invalid-projection' };
    const projected = projectSector(next, options);
    if (!projected.ok) return { ok: false, reason: 'invalid-projection' };
    this.sectors = this.sectors.map((sector, currentIndex) =>
      currentIndex === index ? copy(next) : sector,
    );
    return { ok: true, display: projected.value };
  }

  renameSector(index: number, name: string, options: ProjectionOptions): RenameSectorResult {
    const trimmedName = name.trim();
    if (index < 0 || index >= this.sectors.length) return { ok: false, reason: 'invalid-index' };
    if (!trimmedName) return { ok: false, reason: 'invalid-name' };
    const next = { ...this.sectors[index], SectorName: trimmedName };
    const projected = projectSector(next, options);
    if (!projected.ok) return { ok: false, reason: 'invalid-projection' };
    this.sectors[index] = next;
    return { ok: true, display: projected.value, archive: this.readArchiveSectors() };
  }

  deleteSector(index: number): DeleteSectorResult {
    if (index < 0 || index >= this.sectors.length) return { ok: false, reason: 'invalid-index' };
    if (this.sectors.length <= 1) return { ok: false, reason: 'last-sector' };
    this.sectors = this.sectors.filter((_, currentIndex) => currentIndex !== index);
    return { ok: true, archive: this.readArchiveSectors(), nextIndex: Math.max(0, index - 1) };
  }

  getCurrentSession(): LocalSession {
    return { role: 'gm' };
  }
}

export function createPrototypeApplication(): PrototypeApplication {
  return new PrototypeApplication();
}
